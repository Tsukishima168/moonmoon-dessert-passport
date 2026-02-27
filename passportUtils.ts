import { PassportState, Achievement, PointTransaction, RedeemableItem } from './types';
import { ACHIEVEMENTS, STAMPS, REDEEMABLE_ITEMS } from './constants';
import { performCheckin, recordPointTransaction } from './src/lib/checkinService';

const STORAGE_KEY = 'moonmoon_passport';
const DEVICE_ID_KEY = 'moonmoon_device_id';

// ─── Device ID（持久化 UUID，跨模組共用）───
export function getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        try { localStorage.setItem(DEVICE_ID_KEY, id); } catch (e) { /* ignore */ }
    }
    return id;
}

/** Set Device ID (used when migrating to LINE userId) */
export function setDeviceId(newId: string): void {
    try {
        localStorage.setItem(DEVICE_ID_KEY, newId);
    } catch (e) {
        console.error('Error setting device id:', e);
    }
}

const MIGRATED_KEY = 'moonmoon_passport_migrated_to_supabase';

export function getIsMigratedToSupabase(): boolean {
    return localStorage.getItem(MIGRATED_KEY) === 'true';
}

export function markMigratedToSupabase(): void {
    try {
        localStorage.setItem(MIGRATED_KEY, 'true');
    } catch (e) {
        console.error('Error marking as migrated:', e);
    }
}

function safeSetItem(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error('Error writing passport state:', error);
    }
}

export function getPassportState(): PassportState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migration & Defaults
            return {
                unlockedStamps: parsed.unlockedStamps || [],
                unlockedAchievements: parsed.unlockedAchievements || [],
                redeemedRewards: parsed.redeemedRewards || [],
                visitedSites: parsed.visitedSites || [],
                lastCheckinAt: parsed.lastCheckinAt || 0,
                points: parsed.points || 0,
                pointsHistory: parsed.pointsHistory || [],
                createdAt: parsed.createdAt || Date.now(),
                lastUpdatedAt: parsed.lastUpdatedAt || Date.now()
            };
        }
    } catch (error) {
        console.error('Error reading passport state:', error);
    }

    return {
        unlockedStamps: [],
        unlockedAchievements: [],
        redeemedRewards: [],
        visitedSites: [],
        lastCheckinAt: 0,
        points: 0,
        pointsHistory: [],
        createdAt: Date.now(),
        lastUpdatedAt: Date.now()
    };
}

// Achievement logic: stamp count
function checkAchievements(state: PassportState): string[] {
    const newUnlockedIds: string[] = [];
    const currentStampCount = state.unlockedStamps.length;

    ACHIEVEMENTS.forEach(achievement => {
        if (state.unlockedAchievements.includes(achievement.id)) return;
        if (currentStampCount >= achievement.condition.target) {
            state.unlockedAchievements.push(achievement.id);
            newUnlockedIds.push(achievement.id);
        }
    });

    return newUnlockedIds;
}

export function unlockStamp(stampId: string): string[] {
    const state = getPassportState();
    let newAchievements: string[] = [];

    if (!state.unlockedStamps.includes(stampId)) {
        state.unlockedStamps.push(stampId);
        state.lastUpdatedAt = Date.now();
        newAchievements = checkAchievements(state);
        safeSetItem(STORAGE_KEY, JSON.stringify(state));
        emitStampUnlockedEvent(stampId);
    }

    return newAchievements;
}

export function markRewardRedeemed(tierId: string): void {
    const state = getPassportState();
    if (!state.redeemedRewards.includes(tierId)) {
        state.redeemedRewards.push(tierId);
        state.lastUpdatedAt = Date.now();
        safeSetItem(STORAGE_KEY, JSON.stringify(state));
    }
}

// ─── Gamification: Daily Check-in ───

/**
 * Checks if the user can check in today
 */
export function canCheckinToday(): boolean {
    const state = getPassportState();
    if (!state.lastCheckinAt) return true;

    const last = new Date(state.lastCheckinAt);
    const now = new Date();

    // Check if it's a different day
    return (
        last.getFullYear() !== now.getFullYear() ||
        last.getMonth() !== now.getMonth() ||
        last.getDate() !== now.getDate()
    );
}

/**
 * Performs daily check-in — localStorage 即時 + Supabase 持久化雙寫
 * 
 * @returns points awarded (0 = already checked in today)
 */
export function performDailyCheckin(): number {
    if (!canCheckinToday()) return 0;

    const state = getPassportState();

    // 1. ✅ 即時更新時間戳 + 先給 1 點（保證 UI 同步更新，不等 Supabase）
    state.lastCheckinAt = Date.now();
    state.lastUpdatedAt = Date.now();
    // 先同步寫入 1 點，讓 UI 即時顯示
    state.points = (state.points || 0) + 1;
    if (!state.pointsHistory) state.pointsHistory = [];
    state.pointsHistory.push({
        id: crypto.randomUUID(),
        type: 'daily_checkin',
        amount: 1,
        description: '每日簽到（即時）',
        timestamp: Date.now(),
    });
    safeSetItem(STORAGE_KEY, JSON.stringify(state));

    // 派送即時 UI 事件（讓 React 元件立刻更新顯示）
    document.dispatchEvent(new CustomEvent('daily-checkin', {
        detail: { timestamp: state.lastCheckinAt, points: 1, streakCount: 1, isBonusDay: false }
    }));

    // 2. async 呼叫 Supabase — 取得真實 streak，並做差值補正
    const deviceId = getDeviceId();
    performCheckin(deviceId).then((result) => {
        if (result.success && result.pointsAwarded > 1) {
            // 真實點數 > 1 → 補足差值（避免重複給 1 點）
            const diff = result.pointsAwarded - 1;
            addPassportPoints(diff, 'daily_checkin', `第 ${result.streakCount} 天簽到（補正 +${diff}）`);
        } else if (result.success) {
            // 1 點已在上面給了，只需 dispatch 正確的 streakCount 事件
        }
        // 派送 Supabase 確認後的完整事件（讓 UI 更新 streak 顯示）
        document.dispatchEvent(new CustomEvent('daily-checkin', {
            detail: {
                timestamp: state.lastCheckinAt,
                points: result.pointsAwarded,
                streakCount: result.streakCount,
                isBonusDay: result.isBonusDay,
            }
        }));
    }).catch((e) => {
        // Supabase 失敗 → 1 點已在上面給了，不需再補
        console.warn('[performDailyCheckin] Supabase failed, 1pt already applied from localStorage:', e);
    });

    return 1;
}

// ─── Gamification: Level & Points ───

/**
 * Calculate user "Experience Level" based on stamps and activities
 * This is a visual-only gamification metric
 */
export function calculateUserLevel(): number {
    const state = getPassportState();
    const stampPoints = state.unlockedStamps.length * 50;
    const achievementPoints = state.unlockedAchievements.length * 100;
    const sitePoints = state.visitedSites.length * 20;

    const totalXp = stampPoints + achievementPoints + sitePoints;

    // Simple level formula: Level 1 = 0, Level 2 = 100, Level 3 = 300, etc.
    if (totalXp < 100) return 1;
    if (totalXp < 300) return 2;
    if (totalXp < 700) return 3;
    if (totalXp < 1200) return 4;
    return 5; // Max level for now
}

export function isStampUnlocked(stampId: string): boolean {
    const state = getPassportState();
    return state.unlockedStamps.includes(stampId);
}

export function getUnlockedStampCount(): number {
    const state = getPassportState();
    return state.unlockedStamps.length;
}

export function getUnlockedAchievements(): string[] {
    const state = getPassportState();
    return state.unlockedAchievements || [];
}

export function markSiteVisited(siteId: string): void {
    const state = getPassportState();
    if (!state.visitedSites.includes(siteId)) {
        state.visitedSites.push(siteId);
        state.lastUpdatedAt = Date.now();
        safeSetItem(STORAGE_KEY, JSON.stringify(state));
    }
}

export function getVisitedSites(): string[] {
    const state = getPassportState();
    return state.visitedSites || [];
}

export function resetPassport(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function emitStampUnlockedEvent(stampId: string) {
    const event = new CustomEvent('stamp-unlocked', {
        detail: { stampId, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
}

export function getNextStampInJourney(): typeof STAMPS[number] | null {
    const state = getPassportState();
    return STAMPS.find(stamp => !state.unlockedStamps.includes(stamp.id)) || null;
}

// ─── Points System ───

/**
 * Add points to the passport balance（localStorage + Supabase 雙寫）
 * 
 * - localStorage 即時更新（主要 UI 來源）
 * - Supabase point_transactions async 寫入（持久化備份）
 * - 注意：daily_checkin 的 Supabase 寫入由 checkinService 負責，此處不重複
 */
export function addPassportPoints(
    amount: number,
    type: PointTransaction['type'],
    description: string
): number {
    const state = getPassportState();
    state.points = (state.points || 0) + amount;
    state.lastUpdatedAt = Date.now();

    const tx: PointTransaction = {
        id: crypto.randomUUID(),
        type,
        amount,
        description,
        timestamp: Date.now(),
    };

    if (!state.pointsHistory) state.pointsHistory = [];
    state.pointsHistory.push(tx);
    if (state.pointsHistory.length > 200) {
        state.pointsHistory.splice(0, state.pointsHistory.length - 200);
    }

    safeSetItem(STORAGE_KEY, JSON.stringify(state));

    // Async 寫入 Supabase（非 daily_checkin，那個由 checkinService 直接處理）
    if (type !== 'daily_checkin') {
        const deviceId = getDeviceId();
        void recordPointTransaction(deviceId, amount, type, description);
    }

    return state.points;
}

/**
 * Get current points balance
 */
export function getPassportPointsBalance(): number {
    const state = getPassportState();
    return state.points || 0;
}

/**
 * Redeem an item from the points store
 */
export function redeemItem(itemId: string): { success: boolean; newBalance: number; error?: string } {
    const item = REDEEMABLE_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, newBalance: getPassportPointsBalance(), error: '找不到此商品' };
    if (!item.available) return { success: false, newBalance: getPassportPointsBalance(), error: '此商品暫時無法兌換' };

    const state = getPassportState();
    const currentPoints = state.points || 0;

    if (currentPoints < item.pointsCost) {
        return { success: false, newBalance: currentPoints, error: '積分不足' };
    }

    // Deduct points
    state.points = currentPoints - item.pointsCost;
    state.lastUpdatedAt = Date.now();

    const tx: PointTransaction = {
        id: crypto.randomUUID(),
        type: 'redeem_spend',
        amount: -item.pointsCost,
        description: `兌換 ${item.name}`,
        timestamp: Date.now(),
    };

    if (!state.pointsHistory) state.pointsHistory = [];
    state.pointsHistory.push(tx);
    if (state.pointsHistory.length > 200) {
        state.pointsHistory.splice(0, state.pointsHistory.length - 200);
    }

    safeSetItem(STORAGE_KEY, JSON.stringify(state));
    return { success: true, newBalance: state.points };
}

/**
 * Get points transaction history
 */
export function getPointsHistory(): PointTransaction[] {
    const state = getPassportState();
    return (state.pointsHistory || []).slice().reverse(); // newest first
}

/**
 * Handle incoming points sync from Gacha (via URL params)
 * Call this on Passport page load to credit points from Gacha redirect
 */
export function handleIncomingPointsSync(): { credited: number } | null {
    try {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const amount = params.get('amount');
        const source = params.get('source');
        const ts = params.get('ts');

        if (action !== 'add_points' || !amount || !source || !ts) return null;

        const pointsAmount = parseInt(amount, 10);
        if (isNaN(pointsAmount) || pointsAmount <= 0) return null;

        // Prevent duplicate sync: check if this timestamp was already processed
        const SYNC_KEY = 'moonmoon_points_last_sync_ts';
        const lastSyncTs = localStorage.getItem(SYNC_KEY);
        if (lastSyncTs === ts) return null; // Already processed

        // Credit points
        addPassportPoints(pointsAmount, 'gacha_earn', `扭蛋同步 +${pointsAmount} 積分`);
        localStorage.setItem(SYNC_KEY, ts);

        // Clean up URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);

        return { credited: pointsAmount };
    } catch (e) {
        console.error('Failed to process incoming points sync:', e);
        return null;
    }
}