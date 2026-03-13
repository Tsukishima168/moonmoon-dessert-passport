import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';

export interface LiffContextType {
    liff: typeof liff | null;
    isLoggedIn: boolean;
    profile: {
        userId: string;
        displayName: string;
        pictureUrl?: string;
        statusMessage?: string;
    } | null;
    error: any;
    login: () => void;
    logout: () => void;
}

export const LiffContext = createContext<LiffContextType | undefined>(undefined);

export const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [liffObject, setLiffObject] = useState<typeof liff | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [profile, setProfile] = useState<LiffContextType['profile']>(null);
    const [error, setError] = useState<any>(null);
    const [liffReady, setLiffReady] = useState(false);  // P0 優化：標記 LIFF 是否就緒（非阻塞）

    // Get LIFF ID from environment variable
    const liffId = import.meta.env.VITE_LIFF_ID;

    useEffect(() => {
        if (!liffId) {
            console.warn('LIFF ID is not set in environment variables.');
            setLiffReady(true);  // 即使沒有 liffId，UI 也能繼續
            return;
        }

        // P0 優化：立即標記為 ready，不等 LIFF 初始化
        setLiffReady(true);

        // 後台初始化 LIFF，不阻塞主線程
        initLiffInBackground(liffId);
    }, [liffId]);

    const initLiffInBackground = async (id: string) => {
        try {
            // 1. 檢查 localStorage 快取
            const cachedProfile = localStorage.getItem('liff_profile_cache');
            if (cachedProfile) {
                const cached = JSON.parse(cachedProfile);
                setProfile(cached);
                setIsLoggedIn(true);
                console.log('[LIFF] 使用快取 profile');
            }

            // 2. 超時控制：5 秒後自動 fallback
            const liffInit = Promise.race([
                liff.init({ liffId: id }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LIFF initialization timeout')), 5000)
                )
            ]);

            await liffInit;
            setLiffObject(liff);
            console.log('[LIFF] 初始化成功');

            // 3. 並行獲取最新 profile
            if (liff.isLoggedIn()) {
                const profilePromise = Promise.race([
                    liff.getProfile(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('getProfile timeout')), 3000)
                    )
                ]) as Promise<any>;

                const profileData = await profilePromise;
                const profileObj = {
                    userId: profileData.userId,
                    displayName: profileData.displayName,
                    pictureUrl: profileData.pictureUrl,
                    statusMessage: profileData.statusMessage,
                };

                // 快取到 localStorage
                localStorage.setItem('liff_profile_cache', JSON.stringify(profileObj));
                setProfile(profileObj);
                setIsLoggedIn(true);
                console.log('[LIFF] profile 更新成功');

            } else {
                // 如果是在一般瀏覽器開發測試 (帶有 mock 參數)
                const urlParams = new URLSearchParams(window.location.search);
                const mockLiffId = urlParams.get('mock_liff_id');
                if (mockLiffId) {
                    console.log('[LIFF] 偵測到 mock_liff_id，模擬 LIFF 登入狀態');
                    const mockProfile = {
                        userId: mockLiffId,
                        displayName: 'Mock User',
                    };
                    setProfile(mockProfile);
                    setIsLoggedIn(true);
                }
            }
        } catch (err) {
            console.warn('[LIFF] 後台初始化失敗，使用 fallback 或離線模式:', err);
            setError(err);
            // App 繼續運作，使用快取或離線模式
        }
    };

    const login = () => {
        if (liffObject && !isLoggedIn) {
            liffObject.login();
        }
    };

    const logout = () => {
        if (liffObject && isLoggedIn) {
            liffObject.logout();
            setIsLoggedIn(false);
            setProfile(null);
        }
    };

    return (
        <LiffContext.Provider value={{ liff: liffObject, isLoggedIn, profile, error, login, logout }}>
            {children}
        </LiffContext.Provider>
    );
};

export const useLiff = () => {
    const context = useContext(LiffContext);
    if (context === undefined) {
        throw new Error('useLiff must be used within a LiffProvider');
    }
    return context;
};
