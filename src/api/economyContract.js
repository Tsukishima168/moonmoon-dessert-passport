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
  'UNAVAILABLE',
]);

const ECONOMY_CODE_SET = new Set(ECONOMY_CODES);
const TERMINAL_PENDING_CLAIM_CODE_SET = new Set([
  'NOT_ELIGIBLE',
  'LIMIT_REACHED',
  'EXPIRED',
  'INVALID_PROOF',
]);

/** @param {unknown} value */
export function isEconomyCode(value) {
  return typeof value === 'string' && ECONOMY_CODE_SET.has(value);
}

/** @param {unknown} value */
export function normalizeEconomyEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value;
  if (typeof candidate.ok !== 'boolean' || !isEconomyCode(candidate.code)) return null;
  if (typeof candidate.request_id !== 'string' || candidate.request_id.trim().length === 0) return null;
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
