/**
 * Passport — Supabase Auth Context（跨網域 cookie）
 *
 * 與 LiffContext 並行運作：
 * - LIFF 僅供 LINE profile / 分享功能使用，不作為登入入口
 * - Auth 登入一律走 Google OAuth
 * - Cookie domain = .kiwimu.com → 與 Booking / MBTI / Gacha / Moon Map 共享 session
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { setDeviceId } from '../../passportUtils';
import { supabase } from '../lib/supabase';
import {
  buildOAuthRedirectUrl,
  clearRedirectState,
  clearPendingRedirectTo,
  ensureRedirectTo,
  getAndClearPendingRedirectTo,
  getAndClearRedirectTo,
  getOAuthRedirectUrl,
  getPendingRedirectTo,
  saveRedirectTo,
} from '../lib/authStorage';
import {
  releaseSameOriginServiceWorkersForOAuth,
  removeOAuthCallbackParamsFromCurrentUrl,
} from '../lib/oauthSafety';
import {
  getIncomingSsoMode,
  notifySsoBrokerComplete,
  removeSsoBrokerParams,
  saveSsoBrokerMode,
} from '../lib/ssoBroker';
import { trackAuthConversion } from '../../analytics';

// ── Context ───────────────────────────────────────────────────────────────────

interface SupabaseAuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
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
    const incomingSsoMode = getIncomingSsoMode(params);
    saveSsoBrokerMode(incomingSsoMode);

    if (incomingRedirect) {
      saveRedirectTo(incomingRedirect);
      params.delete('redirect_to');
    } else {
      clearPendingRedirectTo();
    }

    if (incomingSsoMode) {
      removeSsoBrokerParams(params);
    }

    if (incomingRedirect || incomingSsoMode) {
      const newSearch = params.toString();
      const nextUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }

    const authFlowError =
      params.get('error_description') ||
      params.get('error');
    if (authFlowError) {
      if (notifySsoBrokerComplete(getPendingRedirectTo(), 'error', authFlowError)) {
        return;
      }
      setError(authFlowError);
      removeOAuthCallbackParamsFromCurrentUrl();
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

      removeOAuthCallbackParamsFromCurrentUrl();

      const pendingRedirect = getAndClearPendingRedirectTo();
      if (pendingRedirect) {
        if (notifySsoBrokerComplete(pendingRedirect)) {
          return;
        }
        window.location.href = pendingRedirect;
        return;
      }

      const redirectTo = getAndClearRedirectTo();
      if (redirectTo) {
        if (notifySsoBrokerComplete(redirectTo)) {
          return;
        }
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
      // 即使 PKCE exchange 默默失敗（無 session、無 error param），URL 仍可能殘留 ?code/state。
      // helper 內部會檢查 hasOAuthCallbackSignal，沒東西清就 no-op，呼叫無副作用。
      removeOAuthCallbackParamsFromCurrentUrl();
    });

    // 監聽 auth 狀態變化
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      // SSO conversion (passport = 5-site identity provider): fire the GA4
      // sign_up/login event only on a real sign-in (not INITIAL_SESSION /
      // TOKEN_REFRESHED), and before handleSignedInUser may redirect away.
      if (currentUser && event === 'SIGNED_IN') {
        const createdAt = Date.parse(currentUser.created_at ?? '');
        const lastSignInAt = currentUser.last_sign_in_at
          ? Date.parse(currentUser.last_sign_in_at)
          : createdAt;
        const isNewUser =
          Number.isFinite(createdAt) &&
          Number.isFinite(lastSignInAt) &&
          Math.abs(lastSignInAt - createdAt) < 10_000;
        trackAuthConversion(isNewUser, getPendingRedirectTo() ?? undefined);
      }

      handleSignedInUser(currentUser);

      if (currentUser) {
        // Always ensure the deviceId points to the logged in user
        setDeviceId(currentUser.id);

        setError(null);

        // 記錄活躍時間（fire-and-forget）
        client.rpc('update_last_seen', { p_site: 'passport' }).then(() => {});
        client.rpc('insert_user_event', {
          p_event_type: 'site_visited',
          p_site: 'passport',
          p_metadata: {
            site_id: 'passport',
            source: 'auth_session',
            path: window.location.pathname,
          },
        }).then(() => {});
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
    const resolvedReturnTo =
      typeof returnTo === 'string'
        ? returnTo
        : getPendingRedirectTo() ?? window.location.href;
    ensureRedirectTo(resolvedReturnTo);
    await releaseSameOriginServiceWorkersForOAuth();

    const { error: signInError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildOAuthRedirectUrl(resolvedReturnTo),
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

  const handleSignOut = async () => {
    const client = supabase;
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
