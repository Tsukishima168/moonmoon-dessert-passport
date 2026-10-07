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
import { runAfterPendingDelivery } from '../lib/deliveryGate';

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
      // 只傳顧客文案：原始 error／error_description 只留在本站 console，不跨站 postMessage 給來源站。
      const authFlowCustomerMessage = params.get('error') === 'access_denied'
        ? '這次登入已取消。要查看會員資料，請重新使用 Google 登入。'
        : '登入未完成，請重新使用 Google 登入；若持續發生，請聯繫月島協助。';
      // 先記錄再分流，popup broker 分支也要留 log。
      console.error('[SupabaseAuth] OAuth callback failed:', authFlowError);
      if (notifySsoBrokerComplete(getPendingRedirectTo(), 'error', authFlowCustomerMessage)) {
        return;
      }
      setError(authFlowCustomerMessage);
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
        // 導頁前先等 sign_up／login 事件送完（最久 1500ms），見 src/lib/deliveryGate.ts。
        runAfterPendingDelivery(() => {
          window.location.href = pendingRedirect;
        });
        return;
      }

      const redirectTo = getAndClearRedirectTo();
      if (redirectTo) {
        if (notifySsoBrokerComplete(redirectTo)) {
          return;
        }
        runAfterPendingDelivery(() => {
          window.location.href = redirectTo;
        });
        return;
      }

      if (window.location.pathname === '/auth/callback') {
        window.history.replaceState({}, '', '/');
      }
    };

    // 初始取得 session
    client.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('[SupabaseAuth] Session check failed:', sessionError);
        setError('無法確認登入狀態，請確認網路後重新整理；若仍無法登入，請再使用 Google 登入。');
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
      console.error('[SupabaseAuth] Google sign-in unavailable: missing client configuration.');
      setError('Google 登入暫時無法使用，請稍後再試；若持續發生，請聯繫月島協助。');
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
      console.error('[SupabaseAuth] Google sign-in failed:', signInError);
      setError('無法開啟 Google 登入，請稍後再試；若持續發生，請聯繫月島協助。');
    }
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (!client) return;
    setError(null);
    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch {
      setError('登出尚未完成，請確認網路後再試一次。');
    }
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
