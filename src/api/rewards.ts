import type { RedeemableItem } from '../../types';
import { supabase } from '../lib/supabase';

export type RewardCategory = 'drink' | 'dessert' | 'merch';
export type RewardRedemptionStatus = 'issued' | 'fulfilled' | 'cancelled' | 'expired';

type EconomyCode =
  | 'OK'
  | 'AUTH_REQUIRED'
  | 'NOT_ELIGIBLE'
  | 'LIMIT_REACHED'
  | 'INSUFFICIENT_POINTS'
  | 'OUT_OF_STOCK'
  | 'EXPIRED'
  | 'ALREADY_PROCESSED'
  | 'INVALID_PROOF'
  | 'ROLLOUT_DISABLED'
  | 'UNAVAILABLE';

interface EconomyEnvelope {
  ok: boolean;
  code: EconomyCode;
  request_id: string;
  data: Record<string, unknown>;
}

export interface RewardRedemptionSummary {
  id: string;
  rewardId: string;
  rewardName: string;
  rewardCategory: RewardCategory;
  pointsCost: number;
  status: RewardRedemptionStatus;
  issuedAt: string;
  expiresAt: string;
  fulfilledAt: string | null;
}

export interface RewardCredentialReceipt {
  redemptionId: string;
  rewardId: string;
  rewardName: string;
  pointsCost: number;
  status: 'issued';
  credential: string;
  expiresAt: string;
  balance: number;
}

export interface RotatedRewardCredential {
  redemptionId: string;
  credential: string;
  expiresAt: string;
}

export interface StaffRewardFulfillment {
  redemptionId: string;
  rewardId: string;
  rewardName: string;
  fulfilledBy: string;
  fulfilledAt: string;
  replayed: boolean;
}

export interface StaffPassportPuddingFulfillment {
  passportNumber: number;
  holderName: string;
  fulfilledBy: string;
  fulfilledAt: string;
  replayed: boolean;
}

interface ApiResult<T> {
  data: T | null;
  error: Error | null;
}

const ENVELOPE_KEYS = ['ok', 'code', 'request_id', 'data'] as const;
const REDEEM_DATA_KEYS = [
  'redemption_id',
  'reward_id',
  'reward_name',
  'points_cost',
  'status',
  'credential',
  'expires_at',
  'balance',
] as const;
const ROTATE_DATA_KEYS = ['redemption_id', 'credential', 'expires_at'] as const;
const STAFF_REWARD_DATA_KEYS = [
  'redemption_id',
  'reward_id',
  'reward_name',
  'fulfilled_by',
  'fulfilled_at',
] as const;
const STAFF_PUDDING_DATA_KEYS = [
  'passport_number',
  'holder_name',
  'fulfilled_by',
  'fulfilled_at',
] as const;
const ECONOMY_CODES = new Set<EconomyCode>([
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REWARD_CREDENTIAL_PATTERN = /^R2-[0-9A-F]{16}\.[0-9a-f]{48}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isRewardCategory(value: unknown): value is RewardCategory {
  return value === 'drink' || value === 'dessert' || value === 'merch';
}

function economyError(code: EconomyCode): Error {
  return new Error(code);
}

function normalizeEnvelope(value: unknown, requestId: string): EconomyEnvelope | null {
  if (!isExactRecord(value, ENVELOPE_KEYS)) return null;
  if (typeof value.ok !== 'boolean') return null;
  if (typeof value.code !== 'string' || !ECONOMY_CODES.has(value.code as EconomyCode)) return null;
  if (value.request_id !== requestId || !isRecord(value.data)) return null;
  return value as unknown as EconomyEnvelope;
}

export async function getRewardCatalog(): Promise<ApiResult<RedeemableItem[]>> {
  if (!supabase) return { data: null, error: economyError('UNAVAILABLE') };

  const { data, error } = await supabase
    .from('reward_items')
    .select(
      'reward_id,name,description,points_cost,category,redemption_method,is_active,sort_order,economy_metadata',
    )
    .order('sort_order', { ascending: true })
    .order('reward_id', { ascending: true });

  if (error || !Array.isArray(data)) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  const catalog: RedeemableItem[] = [];
  for (const value of data as unknown[]) {
    if (
      !isRecord(value)
      || typeof value.reward_id !== 'string'
      || value.reward_id.trim().length === 0
      || typeof value.name !== 'string'
      || typeof value.description !== 'string'
      || !isNonNegativeInteger(value.points_cost)
      || value.points_cost === 0
      || !isRewardCategory(value.category)
      || value.redemption_method !== 'show-screen'
      || value.is_active !== true
      || !isRecord(value.economy_metadata)
    ) {
      return { data: null, error: economyError('UNAVAILABLE') };
    }

    const imageUrl = value.economy_metadata.image_url;
    catalog.push({
      id: value.reward_id,
      name: value.name,
      description: value.description,
      pointsCost: value.points_cost,
      category: value.category,
      available: true,
      redemptionMethod: 'show-screen',
      ...(typeof imageUrl === 'string' && imageUrl.length > 0 ? { imageUrl } : {}),
    });
  }

  return { data: catalog, error: null };
}

export async function getMyRewardRedemptions(): Promise<ApiResult<RewardRedemptionSummary[]>> {
  if (!supabase) return { data: null, error: economyError('UNAVAILABLE') };

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(
      'id,reward_id,reward_name,reward_category,points_cost,status,issued_at,expires_at,fulfilled_at',
    )
    .order('issued_at', { ascending: false })
    .limit(20);

  if (error || !Array.isArray(data)) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  const redemptions: RewardRedemptionSummary[] = [];
  for (const value of data as unknown[]) {
    if (
      !isRecord(value)
      || !isUuid(value.id)
      || typeof value.reward_id !== 'string'
      || typeof value.reward_name !== 'string'
      || !isRewardCategory(value.reward_category)
      || !isNonNegativeInteger(value.points_cost)
      || !['issued', 'fulfilled', 'cancelled', 'expired'].includes(String(value.status))
      || !isIsoDate(value.issued_at)
      || !isIsoDate(value.expires_at)
      || (value.fulfilled_at !== null && !isIsoDate(value.fulfilled_at))
    ) {
      return { data: null, error: economyError('UNAVAILABLE') };
    }

    redemptions.push({
      id: value.id,
      rewardId: value.reward_id,
      rewardName: value.reward_name,
      rewardCategory: value.reward_category,
      pointsCost: value.points_cost,
      status: value.status as RewardRedemptionStatus,
      issuedAt: value.issued_at,
      expiresAt: value.expires_at,
      fulfilledAt: value.fulfilled_at as string | null,
    });
  }

  return { data: redemptions, error: null };
}

export async function redeemRewardItem(params: {
  rewardId: string;
}): Promise<ApiResult<RewardCredentialReceipt>> {
  if (!supabase) return { data: null, error: economyError('UNAVAILABLE') };

  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('redeem_reward_item', {
    p_reward_id: params.rewardId,
    p_request_id: requestId,
  });
  if (error) return { data: null, error: economyError('UNAVAILABLE') };

  const envelope = normalizeEnvelope(data, requestId);
  if (!envelope) return { data: null, error: economyError('UNAVAILABLE') };
  if (!envelope.ok || envelope.code !== 'OK') {
    return { data: null, error: economyError(envelope.code) };
  }
  if (!isExactRecord(envelope.data, REDEEM_DATA_KEYS)) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  const payload = envelope.data;
  if (
    !isUuid(payload.redemption_id)
    || typeof payload.reward_id !== 'string'
    || typeof payload.reward_name !== 'string'
    || !isNonNegativeInteger(payload.points_cost)
    || payload.status !== 'issued'
    || typeof payload.credential !== 'string'
    || !REWARD_CREDENTIAL_PATTERN.test(payload.credential)
    || !isIsoDate(payload.expires_at)
    || !isNonNegativeInteger(payload.balance)
  ) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  return {
    data: {
      redemptionId: payload.redemption_id,
      rewardId: payload.reward_id,
      rewardName: payload.reward_name,
      pointsCost: payload.points_cost,
      status: 'issued',
      credential: payload.credential,
      expiresAt: payload.expires_at,
      balance: payload.balance,
    },
    error: null,
  };
}

export async function rotateRewardRedemptionProof(
  redemptionId: string,
): Promise<ApiResult<RotatedRewardCredential>> {
  if (!supabase || !isUuid(redemptionId)) {
    return { data: null, error: economyError('NOT_ELIGIBLE') };
  }

  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('rotate_reward_redemption_proof', {
    p_redemption_id: redemptionId,
    p_request_id: requestId,
  });
  if (error) return { data: null, error: economyError('UNAVAILABLE') };

  const envelope = normalizeEnvelope(data, requestId);
  if (!envelope) return { data: null, error: economyError('UNAVAILABLE') };
  if (!envelope.ok || envelope.code !== 'OK') {
    return { data: null, error: economyError(envelope.code) };
  }
  if (!isExactRecord(envelope.data, ROTATE_DATA_KEYS)) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  const payload = envelope.data;
  if (
    !isUuid(payload.redemption_id)
    || typeof payload.credential !== 'string'
    || !REWARD_CREDENTIAL_PATTERN.test(payload.credential)
    || !isIsoDate(payload.expires_at)
  ) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  return {
    data: {
      redemptionId: payload.redemption_id,
      credential: payload.credential,
      expiresAt: payload.expires_at,
    },
    error: null,
  };
}

export async function fulfillRewardRedemption(params: {
  credential: string;
}): Promise<ApiResult<StaffRewardFulfillment>> {
  if (!supabase || params.credential.trim().length < 10) {
    return { data: null, error: economyError('INVALID_PROOF') };
  }

  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('fulfill_reward_redemption', {
    p_redemption_code: params.credential.trim(),
    p_request_id: requestId,
  });
  if (error) return { data: null, error: economyError('UNAVAILABLE') };

  const envelope = normalizeEnvelope(data, requestId);
  if (!envelope) return { data: null, error: economyError('UNAVAILABLE') };
  const replayed = !envelope.ok && envelope.code === 'ALREADY_PROCESSED';
  if ((!envelope.ok || envelope.code !== 'OK') && !replayed) {
    return { data: null, error: economyError(envelope.code) };
  }
  if (!isExactRecord(envelope.data, STAFF_REWARD_DATA_KEYS)) {
    return { data: null, error: economyError(replayed ? 'ALREADY_PROCESSED' : 'UNAVAILABLE') };
  }

  const payload = envelope.data;
  if (
    !isUuid(payload.redemption_id)
    || typeof payload.reward_id !== 'string'
    || typeof payload.reward_name !== 'string'
    || !isUuid(payload.fulfilled_by)
    || !isIsoDate(payload.fulfilled_at)
  ) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  return {
    data: {
      redemptionId: payload.redemption_id,
      rewardId: payload.reward_id,
      rewardName: payload.reward_name,
      fulfilledBy: payload.fulfilled_by,
      fulfilledAt: payload.fulfilled_at,
      replayed,
    },
    error: null,
  };
}

export async function fulfillPassportPudding(params: {
  passportNumber: number;
}): Promise<ApiResult<StaffPassportPuddingFulfillment>> {
  if (!supabase || !Number.isSafeInteger(params.passportNumber)) {
    return { data: null, error: economyError('NOT_ELIGIBLE') };
  }

  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('fulfill_passport_pudding', {
    p_passport_number: params.passportNumber,
    p_request_id: requestId,
  });
  if (error) return { data: null, error: economyError('UNAVAILABLE') };

  const envelope = normalizeEnvelope(data, requestId);
  if (!envelope) return { data: null, error: economyError('UNAVAILABLE') };
  const replayed = !envelope.ok && envelope.code === 'ALREADY_PROCESSED';
  if ((!envelope.ok || envelope.code !== 'OK') && !replayed) {
    return { data: null, error: economyError(envelope.code) };
  }
  if (!isExactRecord(envelope.data, STAFF_PUDDING_DATA_KEYS)) {
    return { data: null, error: economyError(replayed ? 'ALREADY_PROCESSED' : 'UNAVAILABLE') };
  }

  const payload = envelope.data;
  if (
    !isNonNegativeInteger(payload.passport_number)
    || typeof payload.holder_name !== 'string'
    || !isUuid(payload.fulfilled_by)
    || !isIsoDate(payload.fulfilled_at)
  ) {
    return { data: null, error: economyError('UNAVAILABLE') };
  }

  return {
    data: {
      passportNumber: payload.passport_number,
      holderName: payload.holder_name,
      fulfilledBy: payload.fulfilled_by,
      fulfilledAt: payload.fulfilled_at,
      replayed,
    },
    error: null,
  };
}
