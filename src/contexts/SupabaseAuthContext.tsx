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
import { setDeviceId } from '../../passportUtils';
import { createCookieStorage, getOAuthRedirectUrl, saveRedirectTo, getAndClearRedirectTo } from '../lib/authStorage';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY) as string;

// ── Auth Client（cookie storage，單例）───────────────────────────────────────

let _authClient: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (_authClient) return _authClient;

  const cookieStorage = createCookieStorage();

  _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      ...(cookieStorage ? { storage: cookieStorage } : {}),
    },
  });

  return _authClient;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface SupabaseAuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 跨站 SSO：若 URL 帶有 ?redirect_to=，存到 sessionStorage 再清除 URL
    const params = new URLSearchParams(window.location.search);
    const incomingRedirect = params.get('redirect_to');
    if (incomingRedirect) {
      saveRedirectTo(incomingRedirect);
      params.delete('redirect_to');
      const newSearch = params.toString();
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
    }

    const client = getAuthClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // 初始取得 session
    client.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // 已登入 + 有待跳轉網址 → 直接過去
        const redirectTo = getAndClearRedirectTo();
        if (redirectTo) {
          window.location.href = redirectTo;
          return;
        }
        if (window.location.pathname === '/auth/callback') {
          window.history.replaceState({}, '', '/');
        }
      }
    });

    // 監聽 auth 狀態變化
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Always ensure the deviceId points to the logged in user
        setDeviceId(currentUser.id);

        setError(null);

        // 登入完成 → 若有跨站跳轉目標，過去
        const redirectTo = getAndClearRedirectTo();
        if (redirectTo) {
          window.location.href = redirectTo;
          return;
        }
        if (window.location.pathname === '/auth/callback') {
          window.history.replaceState({}, '', '/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const client = getAuthClient();
    if (!client) {
      setError('Supabase Auth 尚未設定完成，Google 登入目前不可用。');
      return;
    }

    setError(null);

    const { error: signInError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (signInError) {
      const redirectUrl = getOAuthRedirectUrl();
      const message = signInError.message.toLowerCase().includes('redirect')
        ? `Google 登入 redirect 設定有誤，請確認 Supabase Auth 的 Redirect URL 是否包含：${redirectUrl}`
        : `Google 登入失敗：${signInError.message}`;

      console.error('[SupabaseAuth] Google sign-in failed:', signInError);
      setError(message);
    }
  };

  const handleSignOut = async () => {
    const client = getAuthClient();
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  };

  return (
    <SupabaseAuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut: handleSignOut, clearError: () => setError(null) }}>
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
