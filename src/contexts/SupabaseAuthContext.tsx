/**
 * Passport — Supabase Auth Context（跨網域 cookie）
 *
 * 與 LiffContext 並行運作：
 * - 若 LIFF 已登入 → 取得 LINE user_id，可選擇性同步至 profiles
 * - 若非 LIFF 環境 → 提供 Google OAuth 入口
 * - Cookie domain = .kiwimu.com → 與 Booking / MBTI / Gacha / Moon Map 共享 session
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { setDeviceId } from '../../passportUtils';
import { supabase } from '../lib/supabase';
import {
  activateRedirectTo,
  clearRedirectState,
  clearPendingRedirectTo,
  ensureRedirectTo,
  getAndClearPendingRedirectTo,
  getAndClearRedirectTo,
  getOAuthRedirectUrl,
  saveRedirectTo,
} from '../lib/authStorage';

// ── Context ───────────────────────────────────────────────────────────────────

interface SupabaseAuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signInWithMagicLink: (email: string, returnTo?: string) => Promise<{ ok: boolean; message?: string }>;
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
    } else {
      clearPendingRedirectTo();
    }

    const authFlowError =
      params.get('error_description') ||
      params.get('error');
    if (authFlowError) {
      setError(authFlowError);
    }

    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    const handleSignedInUser = (currentUser: User | null) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        return;
      }

      const pendingRedirect = getAndClearPendingRedirectTo();
      if (pendingRedirect) {
        window.location.href = pendingRedirect;
        return;
      }

      const redirectTo = getAndClearRedirectTo();
      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }

      if (window.location.pathname === '/auth/callback') {
        window.history.replaceState({}, '', '/');
      }
    };

    // 初始取得 session
    client.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
      }
      handleSignedInUser(session?.user ?? null);
    });

    // 監聽 auth 狀態變化
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      handleSignedInUser(currentUser);

      if (currentUser) {
        // Always ensure the deviceId points to the logged in user
        setDeviceId(currentUser.id);

        setError(null);

        // 記錄活躍時間（fire-and-forget）
        client.rpc('update_last_seen', { p_site: 'passport' }).then(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (returnTo?: string) => {
    const client = supabase;
    if (!client) {
      setError('Supabase Auth 尚未設定完成，Google 登入目前不可用。');
      return;
    }

    setError(null);
    ensureRedirectTo(returnTo || window.location.href);
    activateRedirectTo();

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
      clearRedirectState();
      const redirectUrl = getOAuthRedirectUrl();
      const message = signInError.message.toLowerCase().includes('redirect')
        ? `Google 登入 redirect 設定有誤，請確認 Supabase Auth 的 Redirect URL 是否包含：${redirectUrl}`
        : `Google 登入失敗：${signInError.message}`;

      console.error('[SupabaseAuth] Google sign-in failed:', signInError);
      setError(message);
    }
  };

  const signInWithMagicLink = async (email: string, returnTo?: string) => {
    const client = supabase;
    if (!client) {
      const message = 'Supabase Auth 尚未設定完成，Magic Link 登入目前不可用。';
      setError(message);
      return { ok: false, message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, message: '請先輸入 Email。' };
    }

    setError(null);
    ensureRedirectTo(returnTo || window.location.href);
    activateRedirectTo();

    const { error: otpError } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
      },
    });

    if (otpError) {
      clearRedirectState();
      const message = `Magic Link 發送失敗：${otpError.message}`;
      setError(message);
      return { ok: false, message };
    }

    return {
      ok: true,
      message: '登入連結已寄出，請到信箱點擊 Magic Link 完成登入。',
    };
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  };

  return (
    <SupabaseAuthContext.Provider value={{ user, loading, error, signInWithGoogle, signInWithMagicLink, signOut: handleSignOut, clearError: () => setError(null) }}>
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
