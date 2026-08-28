// Server response code whitelist. Must stay byte-for-byte aligned with the
// other three sites' baseline contract (map-kiwimu-com/lib/economyContract.ts,
// kiwimu-com/shared/economy.ts). Only codes the economy_v2 RPCs can actually
// return belong here.
//
// NOTE: 'UNAVAILABLE' is intentionally NOT included. The server never emits
// it — it is a client-only synthesized sentinel used by economy.ts and
// rewards.ts to represent local failures (missing Supabase config, network
// error, malformed/unparseable payload). Accepting it here would let a
// forged envelope masquerade as a legitimate server response and pass
// normalizeEconomyEnvelope() below.
export const ECONOMY_CODES = Object.freeze([
  'OK',
  'AUTH_REQUIRED',
  'NOT_ELIGIBLE',
  'LIMIT_REACHED',
  'INSUFFICIENT_POINTS',
  'OUT_OF_STOCK',
  'EXPIRED',
  'ALREADY_PROCESSED',
  'INVALID_PROOF',
  'ROLLOUT_DISABLED',
]);

const ECONOMY_CODE_SET = new Set(ECONOMY_CODES);
const ECONOMY_ENVELOPE_KEYS = Object.freeze(['ok', 'code', 'request_id', 'data']);

// Single source of truth for request_id / entity id UUID validation across
// this repo (economy.ts, rewards.ts both import this instead of redefining
// their own pattern). Literal is aligned with the map/kiwimu baseline: UUID
// versions 1-8, RFC 4122 variant (8/9/a/b).
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

const TERMINAL_PENDING_CLAIM_CODE_SET = new Set([
  'NOT_ELIGIBLE',
  'LIMIT_REACHED',
  'EXPIRED',
  'INVALID_PROOF',
]);

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isEconomyCode(value) {
  return typeof value === 'string' && ECONOMY_CODE_SET.has(value);
}

/**
 * @param {unknown} value
 * @param {string} [expectedRequestId]
 */
export function normalizeEconomyEnvelope(value, expectedRequestId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value;
  const keys = Object.keys(candidate);
  if (
    keys.length !== ECONOMY_ENVELOPE_KEYS.length
    || !keys.every((key) => ECONOMY_ENVELOPE_KEYS.includes(key))
  ) return null;
  if (typeof candidate.ok !== 'boolean' || !isEconomyCode(candidate.code)) return null;
  if (!isUuid(candidate.request_id)) return null;
  if (expectedRequestId !== undefined && candidate.request_id !== expectedRequestId) return null;
  if (
    !candidate.data
    || typeof candidate.data !== 'object'
    || Array.isArray(candidate.data)
  ) return null;

  return {
    ok: candidate.ok,
    code: candidate.code,
    request_id: candidate.request_id,
    data: candidate.data,
  };
}

/** @param {unknown} value */
export function readLedgerInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

/** @param {unknown} value */
export function readNonNegativeLedgerInteger(value) {
  const parsed = readLedgerInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

/**
 * @param {{ authUserId?: string | null, lineUserId?: string | null }} identity
 */
export function getWalletOwnerKey(identity) {
  if (identity.authUserId) return `auth:${identity.authUserId}`;
  if (identity.lineUserId) return `line:${identity.lineUserId}`;
  return null;
}

/**
 * @param {{ source?: string, ownerKey?: string | null } | null | undefined} authority
 * @param {string | null | undefined} authUserId
 */
export function canUseEconomyWriteAuthority(authority, authUserId) {
  return Boolean(
    authUserId
    && authority?.source === 'economy_v2'
    && authority.ownerKey === `auth:${authUserId}`
  );
}

/** @param {unknown} code */
export function isTerminalPendingClaimCode(code) {
  return typeof code === 'string' && TERMINAL_PENDING_CLAIM_CODE_SET.has(code);
}
