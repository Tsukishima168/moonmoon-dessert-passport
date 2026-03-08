import { createAdminClient } from './_utils/supabase-admin'
import { verifyTrustedRequest } from './_utils/verifyTrustedRequest'

interface ApiRequest {
  method?: string
  body?: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(data: unknown): ApiResponse
}

/**
 * POST /api/save-user
 * 將 LINE profile 資料 upsert 進 passport_users 資料表
 * 由 liffAuth.ts 在 LIFF 初始化 + Supabase 登入後呼叫
 * Body: { userId, lineUserId, displayName, profilePictureUrl }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!verifyTrustedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { userId, lineUserId, displayName, profilePictureUrl } = req.body || {}

  if (!userId || !lineUserId) {
    return res.status(400).json({ error: 'Missing required fields: userId, lineUserId' })
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('passport_users')
      .upsert(
        {
          id: userId,
          line_user_id: lineUserId,
          display_name: displayName ?? null,
          profile_picture_url: profilePictureUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[save-user] Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[save-user] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
