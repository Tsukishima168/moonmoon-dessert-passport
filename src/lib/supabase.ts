/**
 * supabase.ts — Passport 專案 Supabase 客戶端
 * 
 * 說明：與 Booking / Gacha / Moon Map 使用同一個 moonisland Supabase 專案
 */
import { createClient } from '@supabase/supabase-js';
import { createCookieStorage } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing env vars. Points will be localStorage-only until env is set.');
}

const cookieStorage = createCookieStorage();

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            // OAuth callback is handled exclusively by SupabaseAuthContext.
            // This shared data client should only read the settled session.
            detectSessionInUrl: false,
            ...(cookieStorage ? { storage: cookieStorage } : {}),
        }
    })
    : null;
