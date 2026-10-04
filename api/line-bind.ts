/**
 * POST /api/line-bind  —  綁定「已驗證」的 LINE 帳號到目前登入的 Passport 會員。
 *
 * Headers: Authorization: Bearer <Supabase access token>
 * Body:    { "idToken": "<LIFF liff.getIDToken()>" }
 * 回應:    { ok: true, already_bound?: true } | { ok: false, error }
 *
 * 所有驗證與環境變數說明見 api/_lib/lineBind.ts。同源呼叫（passport.kiwimu.com 的前端），
 * 用 Bearer token 而不是 cookie，所以不需要 CORS、也沒有 CSRF 面。
 * 不引入 @vercel/node：用最小結構型別描述 Vercel 提供的 req／res。
 */
import { handleLineBind } from './_lib/lineBind.js';

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  const authorization = req.headers.authorization;
  const result = await handleLineBind(
    {
      method: req.method,
      authorizationHeader: Array.isArray(authorization) ? authorization[0] : authorization,
      body: req.body,
    },
    { env: process.env, fetchImpl: fetch },
  );

  if (result.status === 405) res.setHeader('Allow', 'POST');
  res.status(result.status).json(result.body);
}
