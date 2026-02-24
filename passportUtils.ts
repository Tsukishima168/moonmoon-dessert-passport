import { PassportState, Achievement } from './types';
import { ACHIEVEMENTS, STAMPS } from './constants';

const STORAGE_KEY = 'moonmoon_passport';

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
 * Performs daily check-in and returns points awarded
 */
export function performDailyCheckin(): number {
    if (!canCheckinToday()) return 0;

    const state = getPassportState();
    const pointsAwarded = 10; // Basic daily points

    state.lastCheckinAt = Date.now();
    state.lastUpdatedAt = Date.now();

    // Points are technically managed via the points.ts API tied to userId
    // but we track the timestamp locally to prevent multiple clicks
    safeSetItem(STORAGE_KEY, JSON.stringify(state));

    const event = new CustomEvent('daily-checkin', {
        detail: { timestamp: state.lastCheckinAt, points: pointsAwarded }
    });
    document.dispatchEvent(event);

    return pointsAwarded;
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