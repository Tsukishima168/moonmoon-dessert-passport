/**
 * supabase.ts — Passport 專案 Supabase 客戶端
 * 
 * 說明：與 Booking / Gacha / Moon Map 使用同一個 moonisland Supabase 專案
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing env vars. Points will be localStorage-only until env is set.');
}

const COOKIE_DOMAIN = '.kiwimu.com';

const cookieStorage = typeof window !== 'undefined' ? {
    getItem: (key: string): string | null => {
        const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    },
    setItem: (key: string, value: string) => {
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; domain=${COOKIE_DOMAIN}; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    },
    removeItem: (key: string) => {
        document.cookie = `${key}=; path=/; domain=${COOKIE_DOMAIN}; max-age=0`;
    },
} : undefined;

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            ...(cookieStorage ? { storage: cookieStorage } : {}),
        }
    })
    : null;
