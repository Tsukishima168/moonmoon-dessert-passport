/**
 * LINE 帳號綁定的伺服器端核心（與 Vercel 無關、零 import，方便 scripts/regression-passport-oauth.mjs 直接實跑）。
 *
 * 為什麼存在：profiles.line_user_id 以前會員可以自己 PATCH（20261004190000 migration 已封死），
 * 現在唯一合法的寫入口是 DB 函式 public.bind_line_user_id（只給 service_role）。SQL 無法驗 LINE 簽章，
 * 所以驗證放在這裡：
 *   1. 呼叫者必須帶有效的 Supabase 登入 token（Authorization: Bearer <access_token>）
 *      -> 以 Supabase Auth 的 /auth/v1/user 驗證，取得 user.id；
 *   2. body.idToken 必須是 LINE Login 簽發、aud = 我們自己的 channel 的 ID token
 *      -> 交給 LINE 的 verify API 驗簽章／效期／client_id，取得已驗證的 sub（= LINE userId）；
 *   3. 兩者都通過才用 service_role 呼叫 bind_line_user_id(user.id, sub)。
 * 前端自己宣稱的 LINE userId（LIFF profile.userId）完全不會被使用。
 *
 * 需要的環境變數（Vercel project env，伺服器端；沒有 VITE_ 前綴的才是秘密）：
 *   SUPABASE_SERVICE_ROLE_KEY  必填，新增。只能放在伺服器端，絕對不要加 VITE_ 前綴。
 *   SUPABASE_URL               選填；缺省沿用既有的 VITE_SUPABASE_URL（或 VITE_MOON_ISLAND_SUPABASE_URL）。
 *   SUPABASE_ANON_KEY          選填；缺省沿用既有的 VITE_SUPABASE_ANON_KEY（或 VITE_MOON_ISLAND_SUPABASE_ANON_KEY）。
 *   LINE_LOGIN_CHANNEL_ID      選填；缺省取既有 VITE_LIFF_ID 的前綴（LIFF ID 格式 = <channelId>-<suffix>）。
 */

export interface LineBindEnv {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_MOON_ISLAND_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_MOON_ISLAND_SUPABASE_ANON_KEY?: string;
  LINE_LOGIN_CHANNEL_ID?: string;
  VITE_LIFF_ID?: string;
  [key: string]: string | undefined;
}

export interface LineBindDeps {
  env: LineBindEnv;
  fetchImpl: typeof fetch;
  now?: () => number;
  logError?: (message: string) => void;
}

export interface LineBindInput {
  method?: string;
  authorizationHeader?: string;
  body?: unknown;
}

export interface LineBindOutput {
  status: number;
  body: { ok: boolean; error?: string; already_bound?: boolean };
}

export const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
export const LINE_ISSUER = 'https://access.line.me';
const LINE_USER_ID_PATTERN = /^U[0-9A-Za-z]{32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKEN_LENGTH = 4096;
const UPSTREAM_TIMEOUT_MS = 8000;

function fail(status: number, error: string): LineBindOutput {
  return { status, body: { ok: false, error } };
}

function pick(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function resolveConfig(env: LineBindEnv) {
  const supabaseUrl = pick(env.SUPABASE_URL, env.VITE_SUPABASE_URL, env.VITE_MOON_ISLAND_SUPABASE_URL)?.replace(/\/+$/, '');
  const anonKey = pick(env.SUPABASE_ANON_KEY, env.VITE_SUPABASE_ANON_KEY, env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY);
  const serviceKey = pick(env.SUPABASE_SERVICE_ROLE_KEY);
  const channelId = pick(env.LINE_LOGIN_CHANNEL_ID, env.VITE_LIFF_ID?.split('-')[0]);

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!channelId || !/^\d+$/.test(channelId)) missing.push('LINE_LOGIN_CHANNEL_ID');
  if (supabaseUrl && !/^https:\/\//i.test(supabaseUrl)) missing.push('SUPABASE_URL(https)');
  if (missing.length > 0) return { missing } as const;
  return { missing: [] as string[], supabaseUrl: supabaseUrl as string, anonKey: anonKey as string, serviceKey: serviceKey as string, channelId: channelId as string };
}

function parseBody(body: unknown): { idToken?: unknown } | null {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as { idToken?: unknown }) : null;
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? (body as { idToken?: unknown }) : null;
}

export async function handleLineBind(input: LineBindInput, deps: LineBindDeps): Promise<LineBindOutput> {
  const { env, fetchImpl } = deps;
  const now = deps.now ?? Date.now;
  const logError = deps.logError ?? ((message: string) => console.error(message));

  if (input.method !== 'POST') return fail(405, 'method_not_allowed');

  const config = resolveConfig(env);
  if (config.missing.length > 0) {
    // 只記錄缺哪些變數名稱，不回給呼叫者，也不含任何值。
    logError(`[line-bind] server not configured; missing: ${config.missing.join(', ')}`);
    return fail(503, 'server_not_configured');
  }
  const { supabaseUrl, anonKey, serviceKey, channelId } = config as Required<Pick<typeof config, 'supabaseUrl' | 'anonKey' | 'serviceKey' | 'channelId'>>;

  const bearer = /^Bearer\s+(\S+)$/i.exec(input.authorizationHeader ?? '');
  if (!bearer || bearer[1].length > MAX_TOKEN_LENGTH) return fail(401, 'auth_required');
  const accessToken = bearer[1];

  const body = parseBody(input.body);
  const idToken = body?.idToken;
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > MAX_TOKEN_LENGTH) {
    return fail(400, 'invalid_request');
  }

  // 1) 驗 Supabase 登入者
  let userId: string;
  try {
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return fail(401, 'invalid_session');
    const user = (await response.json()) as { id?: unknown; is_anonymous?: unknown } | null;
    if (!user || typeof user.id !== 'string' || !UUID_PATTERN.test(user.id) || user.is_anonymous === true) {
      return fail(401, 'invalid_session');
    }
    userId = user.id.toLowerCase();
  } catch {
    logError('[line-bind] supabase auth lookup failed');
    return fail(502, 'upstream_unavailable');
  }

  // 2) 驗 LINE ID token（簽章／效期／client_id 由 LINE 驗，這裡再核對 aud／iss／exp／sub 格式）
  let lineUserId: string;
  try {
    const response = await fetchImpl(LINE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }).toString(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return fail(401, 'invalid_line_token');
    const claims = (await response.json()) as { iss?: unknown; aud?: unknown; sub?: unknown; exp?: unknown } | null;
    const audOk = claims?.aud === channelId;
    const issOk = claims?.iss === LINE_ISSUER;
    const expOk = typeof claims?.exp === 'number' && claims.exp * 1000 > now();
    const subOk = typeof claims?.sub === 'string' && LINE_USER_ID_PATTERN.test(claims.sub);
    if (!claims || !audOk || !issOk || !expOk || !subOk) return fail(401, 'invalid_line_token');
    lineUserId = claims.sub as string;
  } catch {
    logError('[line-bind] LINE verify request failed');
    return fail(502, 'upstream_unavailable');
  }

  // 3) 兩邊都已驗證 -> service_role 寫入
  try {
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/bind_line_user_id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: userId, p_line_user_id: lineUserId }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      logError(`[line-bind] bind_line_user_id rpc http ${response.status}`);
      return fail(502, 'bind_failed');
    }
    const result = (await response.json()) as { ok?: unknown; error?: unknown; already_bound?: unknown } | null;
    if (result?.ok === true) {
      return { status: 200, body: { ok: true, ...(result.already_bound === true ? { already_bound: true } : {}) } };
    }
    switch (result?.error) {
      case 'line_id_in_use':
      case 'profile_bound_to_other_line':
        return fail(409, result.error);
      case 'profile_not_found':
        return fail(404, 'profile_not_found');
      case 'invalid_input':
        return fail(400, 'invalid_request');
      default:
        logError('[line-bind] bind_line_user_id returned an unexpected result');
        return fail(502, 'bind_failed');
    }
  } catch {
    logError('[line-bind] bind_line_user_id rpc request failed');
    return fail(502, 'upstream_unavailable');
  }
}
