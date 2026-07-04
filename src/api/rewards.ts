import { supabase } from '../lib/supabase';

export type RewardCategory = 'drink' | 'dessert' | 'merch';

export interface RewardRedemption {
  id: string;
  reward_id: string;
  reward_name: string;
  reward_category: RewardCategory;
  points_cost: number;
  redemption_code: string;
  status: 'issued' | 'fulfilled' | 'cancelled' | 'expired';
  issued_at: string;
  expires_at: string;
  fulfilled_at?: string | null;
}

interface RewardRedeemRpcResult {
  ok: boolean;
  error?: string;
  balance?: number;
  points_cost?: number;
  redemption?: RewardRedemption;
}

export async function redeemRewardItem(params: {
  rewardId: string;
  expectedPointsCost: number;
}): Promise<{ data: { balance: number; redemption: RewardRedemption } | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase.rpc('redeem_reward_item', {
    p_reward_id: params.rewardId,
    p_expected_points_cost: params.expectedPointsCost,
  });

  if (error) {
    return { data: null, error: error as Error };
  }

  const result = data as RewardRedeemRpcResult;
  if (!result.ok || typeof result.balance !== 'number' || !result.redemption) {
    return { data: null, error: new Error(result.error || 'reward_redeem_failed') };
  }

  return {
    data: {
      balance: result.balance,
      redemption: result.redemption,
    },
    error: null,
  };
}

export async function fulfillRewardRedemptionStaff(params: {
  redemptionCode: string;
  staffPassword: string;
}): Promise<{ data: RewardRedemption | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase.rpc('fulfill_reward_redemption_staff', {
    p_redemption_code: params.redemptionCode,
    p_staff_password: params.staffPassword,
  });

  if (error) {
    return { data: null, error: error as Error };
  }

  const result = data as RewardRedeemRpcResult;
  if (!result.ok || !result.redemption) {
    return { data: null, error: new Error(result.error || 'reward_fulfill_failed') };
  }

  return { data: result.redemption, error: null };
}

export async function getMyRewardRedemptions(): Promise<{ data: RewardRedemption[]; error: Error | null }> {
  if (!supabase) {
    return { data: [], error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('id,reward_id,reward_name,reward_category,points_cost,redemption_code,status,issued_at,expires_at,fulfilled_at')
    .order('issued_at', { ascending: false })
    .limit(20);

  if (error) {
    return { data: [], error: error as Error };
  }

  return { data: (data as RewardRedemption[]) || [], error: null };
}
