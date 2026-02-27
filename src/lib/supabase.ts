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

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
