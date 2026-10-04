import { supabase } from '../lib/supabase';

export type LineBindResult =
    | { ok: true; alreadyBound: boolean }
    | { ok: false; error: string; status?: number };

/**
 * 把「目前登入的 Supabase 會員」綁到「目前 LIFF 登入的 LINE 帳號」。
 *
 * - lineIdToken 必須來自 LiffContext.getIdToken()（liff.getIDToken()）。不要傳 LIFF 的 userId：
 *   伺服器只信 LINE 驗證過的 ID token，用戶端宣稱的 userId 一律不採用。
 * - profiles.line_user_id 已不能由用戶端直接寫入（DB trigger 會 403），這支是唯一合法路徑。
 * - 還沒有任何畫面呼叫它：要用的地方在 `user`（Supabase）與 `isLoggedIn`（LIFF）同時成立時呼叫即可，
 *   例如 `const t = getIdToken(); if (user && t) await bindLineAccount(t);`。
 * - 後端需要在 Vercel 設定伺服器端金鑰（變數清單見 api/_lib/lineBind.ts 檔頭）；沒設定時回 503 server_not_configured。
 */
export async function bindLineAccount(lineIdToken: string | null): Promise<LineBindResult> {
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    if (!lineIdToken) return { ok: false, error: 'line_id_token_required' };

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return { ok: false, error: 'auth_required' };

    try {
        const response = await fetch('/api/line-bind', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ idToken: lineIdToken }),
        });
        const payload = (await response.json().catch(() => null)) as
            | { ok?: boolean; error?: string; already_bound?: boolean }
            | null;

        if (response.ok && payload?.ok === true) {
            return { ok: true, alreadyBound: payload.already_bound === true };
        }
        return { ok: false, error: payload?.error || 'bind_failed', status: response.status };
    } catch {
        return { ok: false, error: 'network_error' };
    }
}
