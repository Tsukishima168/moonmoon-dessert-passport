import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { loadLiff, type LiffSdk } from '../lib/liffLoader';

export interface LiffProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

export interface LiffContextType {
    liff: LiffSdk | null;
    /** LIFF 初始化流程已結束（成功或失敗都算），可以開始渲染依賴 LIFF 的 UI */
    isReady: boolean;
    isLoggedIn: boolean;
    profile: LiffProfile | null;
    error: unknown;
    login: () => void;
    logout: () => void;
    /**
     * 是否已加入本 channel 連結的官方帳號好友。
     * true / false = 已由 LINE 判定；null = 無法判定（LIFF 未就緒、未登入、
     * 或 channel 尚未連結 OA）。呼叫端必須把 null 當成「不知道」，不可當成 false。
     */
    getFriendship: () => Promise<boolean | null>;
    /**
     * 取得 LINE ID token（JWT，有效一小時）。
     * 只能交給後端驗證後使用，前端不得自行解析內容當作身分依據。
     * 需要 LIFF app 已勾選 openid scope。
     */
    getIdToken: () => string | null;
}

export const LiffContext = createContext<LiffContextType | undefined>(undefined);

const PROFILE_CACHE_KEY = 'liff_profile_cache';

/**
 * 這次載入是不是「現在就需要 LIFF」：
 * - 網址帶 LINE 登入回跳參數（liff.state／liffClientId／code+state，或 hash 裡的 token）：
 *   liff.init 必須在這一刻處理網址，時機不能比改前晚；
 * - 在 LINE App 內建瀏覽器（UA 含 Line/）；
 * - 以前登入過（有 profile 快取，或 LIFF 自己的 LIFF_STORE 登入狀態）：要盡快更新名字。
 * 判斷不出來（storage 被擋等）一律當成需要，維持改前的行為。
 * 以上都不是（一般訪客）才把 SDK 延後到瀏覽器閒置。
 */
const needsLiffNow = (): boolean => {
    try {
        const { search, hash } = window.location;
        const q = new URLSearchParams(search);
        if (q.has('liff.state') || q.has('liffClientId') || q.has('liffRedirectUri') || q.has('liffIsEscapedFromApp')) return true;
        if (q.has('code') && q.has('state')) return true;
        if (/[#&?](access_token|id_token|context_token|liff\.state)=/.test(hash)) return true;
        if (/\bLine\//i.test(navigator.userAgent)) return true;
        if (localStorage.getItem(PROFILE_CACHE_KEY)) return true;
        for (let i = 0; i < localStorage.length; i += 1) {
            if (localStorage.key(i)?.startsWith('LIFF_STORE')) return true;
        }
        return false;
    } catch {
        return true;
    }
};

// 回跳／LINE 內／回訪的情況：模組一執行就開始下載 SDK，和 React 首次渲染並行，
// 到 useEffect 呼叫 liff.init 時多半已經下載完（改前是等整包 vendor 下載完才 init）。
if (typeof window !== 'undefined' && import.meta.env.VITE_LIFF_ID && needsLiffNow()) {
    loadLiff().catch(() => { /* 真正的錯誤由 initLiffInBackground 處理 */ });
}

const runWhenIdle = (task: () => void): (() => void) => {
    if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(task, { timeout: 3000 });
        return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(task, 1500);
    return () => window.clearTimeout(id);
};

export const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [liffObject, setLiffObject] = useState<LiffSdk | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [profile, setProfile] = useState<LiffProfile | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [isReady, setIsReady] = useState(false);  // P0 優化：標記 LIFF 是否就緒（非阻塞）

    // Get LIFF ID from environment variable
    const liffId = import.meta.env.VITE_LIFF_ID;

    useEffect(() => {
        if (!liffId) {
            console.warn('LIFF ID is not set in environment variables.');
            setIsReady(true);  // 即使沒有 liffId，UI 也能繼續
            return;
        }

        // P0 優化：立即標記為 ready，不等 LIFF 初始化
        setIsReady(true);

        // 後台初始化 LIFF，不阻塞主線程。
        // 需要馬上用到（回跳／LINE 內／回訪）就立刻 init；一般訪客等瀏覽器閒置再載入 SDK。
        if (needsLiffNow()) {
            initLiffInBackground(liffId);
            return;
        }
        return runWhenIdle(() => { void initLiffInBackground(liffId); });
    }, [liffId]);

    const initLiffInBackground = async (id: string) => {
        try {
            // 1. 檢查 localStorage 快取
            //    注意：快取只用於「先把名字畫出來」，不構成身分證明。
            //    任何需要驗證身分的動作一律走 getIdToken()，那支在 LIFF 真正
            //    初始化並登入前會回 null。
            const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
            if (cachedProfile) {
                const cached = JSON.parse(cachedProfile);
                setProfile(cached);
                setIsLoggedIn(true);
                console.log('[LIFF] 使用快取 profile');
            }

            // 2. 取得 SDK（延後載入的 chunk；前面的快取 profile 已先畫出來，不等這一步）
            const liff = await loadLiff();

            // 3. 超時控制：5 秒後自動 fallback（只算 init 本身，不含下載 SDK）
            const liffInit = Promise.race([
                liff.init({ liffId: id }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LIFF initialization timeout')), 5000)
                )
            ]);

            await liffInit;
            setLiffObject(liff);
            console.log('[LIFF] 初始化成功');

            // 4. 並行獲取最新 profile
            if (liff.isLoggedIn()) {
                const profilePromise = Promise.race([
                    liff.getProfile(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('getProfile timeout')), 3000)
                    )
                ]) as Promise<LiffProfile>;

                const profileData = await profilePromise;
                const profileObj: LiffProfile = {
                    userId: profileData.userId,
                    displayName: profileData.displayName,
                    pictureUrl: profileData.pictureUrl,
                    statusMessage: profileData.statusMessage,
                };

                // 快取到 localStorage
                localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileObj));
                setProfile(profileObj);
                setIsLoggedIn(true);
                console.log('[LIFF] profile 更新成功');
            } else {
                // LIFF 已初始化但未登入：清掉可能殘留的快取，避免顯示前一位
                // 使用者的名字。
                localStorage.removeItem(PROFILE_CACHE_KEY);
                setProfile(null);
                setIsLoggedIn(false);
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
            try {
                localStorage.removeItem(PROFILE_CACHE_KEY);
            } catch {
                /* ignore */
            }
        }
    };

    // 好友狀態只有在 LIFF 真的初始化且已登入時才問得到。
    // 官方限制：只能查「與本 LIFF app 所屬的同一個 LINE Login channel 連結的
    // 官方帳號」，channel 未連結 OA 時這支會拋錯 —— 那屬於「無法判定」，回 null。
    const getFriendship = useCallback(async (): Promise<boolean | null> => {
        if (!liffObject || !liffObject.isLoggedIn()) return null;

        try {
            const friendship = await Promise.race([
                liffObject.getFriendship(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('getFriendship timeout')), 3000)
                ),
            ]);
            return Boolean(friendship?.friendFlag);
        } catch (err) {
            console.warn('[LIFF] getFriendship 失敗，視為無法判定:', err);
            return null;
        }
    }, [liffObject]);

    // ID token 是唯一可以拿去給後端驗證的身分憑證。
    // 絕對不要改成回傳 profile.userId —— userId 不是秘密，後端不能信任它。
    const getIdToken = useCallback((): string | null => {
        if (!liffObject || !liffObject.isLoggedIn()) return null;

        try {
            return liffObject.getIDToken();
        } catch (err) {
            console.warn('[LIFF] getIDToken 失敗:', err);
            return null;
        }
    }, [liffObject]);

    return (
        <LiffContext.Provider
            value={{
                liff: liffObject,
                isReady,
                isLoggedIn,
                profile,
                error,
                login,
                logout,
                getFriendship,
                getIdToken,
            }}
        >
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
