/**
 * supabase.ts — Passport 專案唯一 Supabase 客戶端（單例）
 *
 * 說明：與 Booking / Gacha / Moon Map 使用同一個 moonisland Supabase 專案
 * Auth + Data 共用此 instance，SupabaseAuthContext 也從這裡 import。
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createCookieStorage } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    || import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing env vars. Points will be localStorage-only until env is set.');
}

// Share auth state across *.kiwimu.com while keeping large session payloads readable.
const cookieStorage = createCookieStorage();

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'implicit',
            ...(cookieStorage ? { storage: cookieStorage } : {}),
        }
    })
    : null;
