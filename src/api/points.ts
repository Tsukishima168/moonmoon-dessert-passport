const SUPABASE_URL = (import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

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

function getAuthHeaders(contentType?: boolean): HeadersInit {
    return {
        ...(contentType ? { 'Content-Type': 'application/json' } : {}),
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
}

async function resolveProfile(identity: PointIdentity): Promise<ProfilePointRecord | null> {
    const query = identity.authUserId
        ? `id=eq.${identity.authUserId}`
        : identity.lineUserId
            ? `line_user_id=eq.${identity.lineUserId}`
            : null;

    if (!query) return null;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}&select=id,points`, {
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        throw new Error('Failed to fetch profile points');
    }

    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
        id: data[0].id,
        points: data[0].points || 0,
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
    try {
        // If isLineId is true, we first need to find the UUID
        let targetUuid = userId;

        if (isLineId) {
            const resProfile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?line_user_id=eq.${userId}&select=id`, {
                headers: getAuthHeaders(),
            });
            const dataProfile = await resProfile.json();
            if (dataProfile && dataProfile.length > 0) {
                targetUuid = dataProfile[0].id;
            } else {
                return []; // User not found
            }
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/point_logs?user_id=eq.${targetUuid}&select=*&order=created_at.desc`, {
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error('Failed to fetch point logs');

        const data = await res.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching point logs:', error);
        return [];
    }
}

export async function addPoints(userId: string, amount: number, reason: string, isLineId: boolean = true): Promise<{ ok: boolean, error?: string }> {
    try {
        // 1. Get current profile to find UUID and current points
        const profile = await resolveProfile(
            isLineId ? { lineUserId: userId } : { authUserId: userId }
        );

        if (!profile) return { ok: false, error: 'User not found' };

        const { id, points } = profile;
        const newPoints = (points || 0) + amount;

        // 2. Update profiles table
        const resUpdate = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                ...getAuthHeaders(true),
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ points: newPoints })
        });

        if (!resUpdate.ok) throw new Error('Failed to update points');

        // 3. Create point log entry
        await fetch(`${SUPABASE_URL}/rest/v1/point_logs`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(true),
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({
                user_id: id,
                amount: amount,
                reason: reason
            })
        });

        return { ok: true };
    } catch (error) {
        console.error('Error adding points:', error);
        return { ok: false, error: String(error) };
    }
}

export async function adjustPointsByIdentity(
    identity: PointIdentity,
    amount: number,
    reason: string
): Promise<{ ok: boolean; balance?: number; error?: string }> {
    try {
        const profile = await resolveProfile(identity);
        if (!profile) return { ok: false, error: 'User not found' };

        const newPoints = (profile.points || 0) + amount;

        const resUpdate = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            headers: {
                ...getAuthHeaders(true),
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({ points: newPoints }),
        });

        if (!resUpdate.ok) throw new Error('Failed to update points');

        await fetch(`${SUPABASE_URL}/rest/v1/point_logs`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(true),
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                user_id: profile.id,
                amount,
                reason,
            }),
        });

        return { ok: true, balance: newPoints };
    } catch (error) {
        console.error('Error adjusting points by identity:', error);
        return { ok: false, error: String(error) };
    }
}
