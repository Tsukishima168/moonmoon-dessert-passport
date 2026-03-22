import { supabase } from '../lib/supabase';

export interface PointLog {
    id: string;
    amount: number;
    reason: string;
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

async function resolveProfile(identity: PointIdentity): Promise<ProfilePointRecord | null> {
    if (!supabase) return null;

    const column = identity.authUserId ? 'id' : identity.lineUserId ? 'line_user_id' : null;
    const value = identity.authUserId || identity.lineUserId;
    if (!column || !value) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, points')
        .eq(column, value)
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
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('line_user_id', userId)
                .maybeSingle();

            if (!profileData) return [];
            targetUuid = profileData.id as string;
        }

        const { data, error } = await supabase
            .from('point_logs')
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
