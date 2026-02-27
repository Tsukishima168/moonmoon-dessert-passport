/**
 * checkinService.ts — 每日簽到服務（Supabase + localStorage 雙寫）
 * 
 * 設計原則：
 * - localStorage 是「即時 UI」的主要來源（不等網路）
 * - Supabase 是「持久化備份」（async，失敗不影響 UX）
 * - device_id 對應 passportUtils 的 moonmoon_device_id
 * - streak_count 從 Supabase 計算（跨裝置正確），offline 用 localStorage
 */

import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CheckinResult {
    success: boolean;
    pointsAwarded: number;
    streakCount: number;
    isBonusDay: boolean;      // Day 7 = 限定貼圖 bonus
    error?: string;
}

// ─── Streak Logic ──────────────────────────────────────────────────────────────

/** 
 * 根據連簽天數計算今日點數
 * Day 1-2 → +1, Day 3-4 → +2, Day 5-6 → +3, Day 7 → +5
 */
export function calcStreakPoints(streakCount: number): number {
    if (streakCount >= 7) return 5;
    if (streakCount >= 5) return 3;
    if (streakCount >= 3) return 2;
    return 1;
}

// ─── Supabase Operations ──────────────────────────────────────────────────────

/** 從 Supabase 查詢最新的 streak（跨裝置同步） */
async function getStreakFromSupabase(deviceId: string): Promise<number> {
    if (!supabase) return 1;
    try {
        const { data, error } = await supabase
            .from('daily_checkins')
            .select('streak_count, checked_in_at')
            .eq('device_id', deviceId)
            .order('checked_in_at', { ascending: false })
            .limit(2);

        if (error || !data || data.length === 0) return 1;

        const latest = data[0];
        const latestDate = new Date(latest.checked_in_at);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // 昨天有簽到 → streak 繼續
        const isConsecutive =
            latestDate.toDateString() === yesterday.toDateString();

        return isConsecutive ? (latest.streak_count + 1) : 1;
    } catch (e) {
        console.warn('[checkinService] getStreak failed, using 1', e);
        return 1;
    }
}

/** 寫入 Supabase daily_checkins（fire-and-forget） */
async function writeCheckinToSupabase(
    deviceId: string,
    streakCount: number,
    pointsEarned: number,
): Promise<void> {
    if (!supabase) return;
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { error } = await supabase
            .from('daily_checkins')
            .upsert(
                {
                    device_id: deviceId,
                    checked_in_at: today,
                    streak_count: streakCount,
                    points_earned: pointsEarned,
                },
                { onConflict: 'device_id,checked_in_at' } // 防重複
            );
        if (error) console.warn('[checkinService] upsert failed:', error.message);
    } catch (e) {
        console.warn('[checkinService] writeCheckin exception:', e);
    }
}

/** 寫入 point_transactions（fire-and-forget） */
async function writePointTransactionToSupabase(
    deviceId: string,
    points: number,
    action: string,
    description: string,
): Promise<void> {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('point_transactions')
            .insert({
                device_id: deviceId,
                points,
                action,
                description,
                source: 'passport',
            });
        if (error) console.warn('[checkinService] point_tx failed:', error.message);
    } catch (e) {
        console.warn('[checkinService] point_tx exception:', e);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 執行每日簽到（雙寫）
 * 
 * @param deviceId - 來自 localStorage moonmoon_device_id
 * @returns CheckinResult
 */
export async function performCheckin(deviceId: string): Promise<CheckinResult> {
    // 1. 從 Supabase 取得正確 streak（async，可能略慢）
    const streakCount = await getStreakFromSupabase(deviceId);
    const pointsAwarded = calcStreakPoints(streakCount);
    const isBonusDay = streakCount % 7 === 0; // 每 7 天倍數是 bonus

    // 2. 寫入 Supabase（async，不 await 阻塞 UI）
    void writeCheckinToSupabase(deviceId, streakCount, pointsAwarded);
    void writePointTransactionToSupabase(
        deviceId,
        pointsAwarded,
        'daily_checkin',
        `第 ${streakCount} 天簽到 +${pointsAwarded} 積分`,
    );

    return {
        success: true,
        pointsAwarded,
        streakCount,
        isBonusDay,
    };
}

/**
 * 向 Supabase 寫入任意行為產生的積分
 * 供 passportUtils 的其他 addPassportPoints 行為呼叫
 */
export async function recordPointTransaction(
    deviceId: string,
    points: number,
    action: string,
    description: string,
): Promise<void> {
    void writePointTransactionToSupabase(deviceId, points, action, description);
}
