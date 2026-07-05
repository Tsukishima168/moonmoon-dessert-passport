import { supabase } from '../lib/supabase';

export interface PointLog {
    id: string;
    points: number;
    action: string;
    description: string | null;
    source: string | null;
    created_at: string;
}

export interface PointIdentity {
    authUserId?: string | null;
    lineUserId?: string | null;
}

interface ProfilePointRecord {
    id: string;
    points: number;
}

interface OwnProfileByLineIdResult {
    ok: boolean;
    error?: string;
    data?: { id: string; points: number | null } | null;
}

async function resolveProfile(identity: PointIdentity): Promise<ProfilePointRecord | null> {
    if (!supabase) return null;

    // authUserId：有 Supabase auth session，直接走 own-read RLS policy（auth.uid() = id）。
    if (identity.authUserId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, points')
            .eq('id', identity.authUserId)
            .maybeSingle();

        if (error) {
            console.error('[points] Failed to resolve profile:', error);
            return null;
        }

        if (!data) return null;

        return {
            id: data.id as string,
            points: (data.points as number) || 0,
        };
    }

    // lineUserId：LIFF-only 用戶沒有 Supabase auth session，profiles 表已無公開
    // SELECT policy，改走白名單 RPC（只回 id/points，不含 email/phone/google_id 等）。
    if (identity.lineUserId) {
        const { data, error } = await supabase.rpc('get_own_profile_by_line_id', {
            p_line_user_id: identity.lineUserId,
        });

        if (error) {
            console.error('[points] Failed to resolve profile by line_user_id:', error);
            return null;
        }

        const result = data as OwnProfileByLineIdResult;
        if (!result?.ok || !result.data) return null;

        return {
            id: result.data.id,
            points: result.data.points || 0,
        };
    }

    return null;
}

export async function getUserPoints(userId: string, isLineId: boolean = false): Promise<number> {
    try {
        const profile = await resolveProfile(
            isLineId ? { lineUserId: userId } : { authUserId: userId }
        );
        return profile?.points || 0;
    } catch (error) {
        console.error('Error fetching points:', error);
        return 0;
    }
}

export async function getUserPointsByIdentity(identity: PointIdentity): Promise<number> {
    try {
        const profile = await resolveProfile(identity);
        return profile?.points || 0;
    } catch (error) {
        console.error('Error fetching points by identity:', error);
        return 0;
    }
}

export async function getUserPointLogs(userId: string, isLineId: boolean = false): Promise<PointLog[]> {
    if (!supabase) return [];

    try {
        let targetUuid = userId;

        if (isLineId) {
            // profiles 已無公開 SELECT policy，改走白名單 RPC 取回自己的 id
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_own_profile_by_line_id', {
                p_line_user_id: userId,
            });

            if (rpcError) {
                console.error('[points] Failed to resolve profile id by line_user_id:', rpcError);
                return [];
            }

            const result = rpcData as OwnProfileByLineIdResult;
            if (!result?.ok || !result.data) return [];
            targetUuid = result.data.id;
        }

        const { data, error } = await supabase
            .from('point_transactions')
            .select('*')
            .eq('user_id', targetUuid)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[points] Failed to fetch point logs:', error);
            return [];
        }

        return (data as PointLog[]) || [];
    } catch (error) {
        console.error('Error fetching point logs:', error);
        return [];
    }
}

export async function addPoints(
    userId: string,
    amount: number,
    reason: string,
    isLineId: boolean = true
): Promise<{ ok: boolean; error?: string }> {
    return adjustPointsByIdentity(
        isLineId ? { lineUserId: userId } : { authUserId: userId },
        amount,
        reason
    );
}

export async function adjustPointsByIdentity(
    identity: PointIdentity,
    amount: number,
    reason: string
): Promise<{ ok: boolean; balance?: number; error?: string }> {
    if (!supabase) return { ok: false, error: 'Supabase not configured' };

    try {
        // RPC adjust_points 依賴 auth.uid()，需要 Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
            // LIFF-only 使用者沒有 Supabase session，無法走 RPC
            // 安全設計：不再允許無 auth session 的點數操作
            console.warn(
                '[points] No Supabase session — skipping adjust_points.',
                'LIFF-only users must link Supabase auth to sync points.'
            );
            return { ok: false, error: 'Supabase auth session required' };
        }

        // 透過 RPC 原子操作加減點數（解決 race condition）
        const { data, error } = await supabase.rpc('adjust_points', {
            p_amount: amount,
            p_reason: reason,
        });

        if (error) {
            console.error('[points] RPC adjust_points failed:', error);
            return { ok: false, error: error.message };
        }

        const result = data as { ok: boolean; balance?: number; error?: string };
        return result;
    } catch (error) {
        console.error('Error adjusting points by identity:', error);
        return { ok: false, error: String(error) };
    }
}
