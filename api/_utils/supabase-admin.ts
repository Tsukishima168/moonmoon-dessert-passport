import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase admin client（service role key，繞過 RLS）
 * 僅供 api/ Vercel functions 使用，禁止在前端引入
 */
export function createAdminClient() {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase server env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
