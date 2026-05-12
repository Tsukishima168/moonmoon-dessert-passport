import { supabase } from './src/lib/supabase';

export type RewardClaimResult =
    | { ok: true; rewardId: string }
    | { ok: false; reason: 'unconfigured' | 'invalid_or_used' | 'request_failed' };

export interface RewardClaimTarget {
    rewardId: string;
    stampId: string;
    stampName: string;
}

const REWARD_CLAIM_TARGETS: Record<string, RewardClaimTarget> = {
    store_visit_2026_q1: {
        rewardId: 'store_visit_2026_q1',
        stampId: 'shop_checkin',
        stampName: '月島登陸',
    },
    egg_master_2026_q1: {
        rewardId: 'egg_master_2026_q1',
        stampId: 'egg_master_2026_q1',
        stampName: '島主限定徽章',
    },
};

export function resolveRewardClaimTarget(rewardId: string | null | undefined): RewardClaimTarget | null {
    if (!rewardId) {
        return null;
    }

    const normalizedRewardId = rewardId.trim();
    return REWARD_CLAIM_TARGETS[normalizedRewardId] ?? null;
}

export async function consumeRewardClaim(code: string, rewardId: string): Promise<RewardClaimResult> {
    if (!supabase) {
        return { ok: false, reason: 'unconfigured' };
    }

    const normalizedCode = code.trim();
    const normalizedRewardId = rewardId.trim();

    try {
        const { data, error } = await supabase.rpc('consume_reward_claim', {
            p_code: normalizedCode,
            p_reward_id: normalizedRewardId,
        });

        if (error) {
            console.error('Reward claim RPC failed:', error.message);
            return { ok: false, reason: 'request_failed' };
        }

        const result = data as { ok?: boolean; reward_id?: string; error?: string } | null;

        if (result?.ok && result.reward_id) {
            return { ok: true, rewardId: result.reward_id };
        }

        return { ok: false, reason: 'invalid_or_used' };
    } catch (error) {
        console.error('Reward claim error:', error);
        return { ok: false, reason: 'request_failed' };
    }
}
