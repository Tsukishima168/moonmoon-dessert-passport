/**
 * Passport — Supabase Auth Context（跨網域 cookie）
 *
 * 與 LiffContext 並行運作：
 * - 若 LIFF 已登入 → 取得 LINE user_id，可選擇性同步至 profiles
 * - 若非 LIFF 環境 → 提供 Google OAuth 入口
 * - Cookie domain = .kiwimu.com → 與 Booking / MBTI / Gacha / Moon Map 共享 session
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getIsMigratedToSupabase, markMigratedToSupabase, getPassportState, setDeviceId } from '../../passportUtils';
import { migrateFromLocalStorage } from '../api/passport';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY) as string;
const COOKIE_DOMAIN = '.kiwimu.com';

// ── Cookie helpers ────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 365) {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `domain=${COOKIE_DOMAIN}`,
    `path=/`,
    `max-age=${maxAgeSec}`,
    'SameSite=Lax',
  ].join('; ');
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`;
}

// ── Auth Client（cookie storage，單例）───────────────────────────────────────

let _authClient: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (_authClient) return _authClient;

  _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => getCookie(key),
        setItem: (key, value) => setCookie(key, value),
        removeItem: (key) => deleteCookie(key),
      },
    },
  });

  return _authClient;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface SupabaseAuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getAuthClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // 初始取得 session
    client.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // 監聽 auth 狀態變化
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Always ensure the deviceId points to the logged in user
        setDeviceId(currentUser.id);

        if (!getIsMigratedToSupabase()) {
          try {
            console.log('🔄 開始傳送 LocalStorage 資料到 Supabase 帳號...');
            const localState = getPassportState();
            const migrated = await migrateFromLocalStorage(currentUser.id, localState);
            if (migrated) {
              markMigratedToSupabase();
              console.log('✅ 靜默轉移成功！');
              document.dispatchEvent(new CustomEvent('kiwimu:passport_migrated'));
            }
          } catch (e) {
            console.error('Migration failed:', e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const client = getAuthClient();
    if (!client) return;
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    const client = getAuthClient();
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  };

  return (
    <SupabaseAuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: handleSignOut }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
