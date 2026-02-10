export type RewardClaimResult =
    | { ok: true; rewardId: string }
    | { ok: false; reason: 'unconfigured' | 'invalid_or_used' | 'request_failed' };

const SUPABASE_URL =
    (import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL ||
        import.meta.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_ANON_KEY =
    (import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export async function consumeRewardClaim(code: string, rewardId: string): Promise<RewardClaimResult> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return { ok: false, reason: 'unconfigured' };
    }

    try {
        // Attempt to update the claim record:
        // WHERE code = code
        // AND reward_id = rewardId
        // AND claimed_at IS NULL
        // SET claimed_at = NOW()

        // Supabase REST API: PATCH /reward_claims?code=eq.CODE&reward_id=eq.ID&claimed_at=is.null
        const query = new URLSearchParams({
            code: `eq.${code}`,
            reward_id: `eq.${rewardId}`,
            claimed_at: 'is.null',
        });

        const res = await fetch(`${SUPABASE_URL}/rest/v1/reward_claims?${query.toString()}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation' // Return the updated row
            },
            body: JSON.stringify({
                claimed_at: new Date().toISOString()
            })
        });

        if (!res.ok) {
            console.error('Reward claim request failed:', res.status, res.statusText);
            return { ok: false, reason: 'request_failed' };
        }

        const data = await res.json();

        // If a row was returned, the update was successful (meaning it was unclaimed before)
        if (Array.isArray(data) && data.length > 0) {
            return { ok: true, rewardId: data[0].reward_id };
        }

        // If no row returned, either code/reward_id is wrong OR it was already claimed (claimed_at is not null)
        return { ok: false, reason: 'invalid_or_used' };
    } catch (error) {
        console.error('Reward claim error:', error);
        return { ok: false, reason: 'request_failed' };
    }
}
