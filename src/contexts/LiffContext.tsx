import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';

interface LiffContextType {
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

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [liffObject, setLiffObject] = useState<typeof liff | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [profile, setProfile] = useState<LiffContextType['profile']>(null);
    const [error, setError] = useState<any>(null);

    // Get LIFF ID from environment variable
    const liffId = import.meta.env.VITE_LIFF_ID;

    useEffect(() => {
        if (!liffId) {
            console.warn('LIFF ID is not set in environment variables.');
            return;
        }

        liff.init({ liffId })
            .then(() => {
                setLiffObject(liff);
                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                    liff.getProfile().then(profile => {
                        setProfile({
                            userId: profile.userId,
                            displayName: profile.displayName,
                            pictureUrl: profile.pictureUrl,
                            statusMessage: profile.statusMessage,
                        });
                    }).catch(err => {
                        console.error('Failed to get profile', err);
                    });
                }
            })
            .catch((err) => {
                console.error('LIFF initialization failed', err);
                setError(err);
            });
    }, [liffId]);

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
