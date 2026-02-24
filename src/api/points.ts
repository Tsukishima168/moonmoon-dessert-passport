
const SUPABASE_URL = (import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

export interface PointLog {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
}

export async function getUserPoints(userId: string, isLineId: boolean = false): Promise<number> {
    try {
        let query = `id=eq.${userId}`;
        if (isLineId) {
            query = `line_user_id=eq.${userId}`;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}&select=points`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            }
        });

        if (!res.ok) throw new Error('Failed to fetch points');

        const data = await res.json();
        if (data && data.length > 0) {
            return data[0].points || 0;
        }
        return 0;
    } catch (error) {
        console.error('Error fetching points:', error);
        return 0;
    }
}

export async function getUserPointLogs(userId: string, isLineId: boolean = false): Promise<PointLog[]> {
    try {
        // If isLineId is true, we first need to find the UUID
        let targetUuid = userId;

        if (isLineId) {
            const resProfile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?line_user_id=eq.${userId}&select=id`, {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                }
            });
            const dataProfile = await resProfile.json();
            if (dataProfile && dataProfile.length > 0) {
                targetUuid = dataProfile[0].id;
            } else {
                return []; // User not found
            }
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/point_logs?user_id=eq.${targetUuid}&select=*&order=created_at.desc`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            }
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
        let query = `line_user_id=eq.${userId}`;
        if (!isLineId) query = `id=eq.${userId}`;

        const resProfile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}&select=id,points`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            }
        });

        const profiles = await resProfile.json();
        if (!profiles || profiles.length === 0) return { ok: false, error: 'User not found' };

        const { id, points } = profiles[0];
        const newPoints = (points || 0) + amount;

        // 2. Update profiles table
        const resUpdate = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ points: newPoints })
        });

        if (!resUpdate.ok) throw new Error('Failed to update points');

        // 3. Create point log entry
        await fetch(`${SUPABASE_URL}/rest/v1/point_logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

