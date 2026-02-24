import { PassportState, Achievement } from './types';
import { ACHIEVEMENTS, STAMPS } from './constants';

const STORAGE_KEY = 'moonmoon_passport';
const SITES_KEY = 'moonmoon_visited_sites';

function safeSetItem(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error('Error writing passport state:', error);
    }
}

function safeRemoveItem(key: string) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error clearing passport state:', error);
    }
}

export function getPassportState(): PassportState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migration: Ensure new fields exist
            if (!parsed.unlockedAchievements) parsed.unlockedAchievements = [];
            if (!parsed.visitedSites) parsed.visitedSites = [];
            return parsed;
        }
    } catch (error) {
        console.error('Error reading passport state:', error);
    }

    return {
        unlockedStamps: [],
        unlockedAchievements: [],
        redeemedRewards: [],
        visitedSites: [],
        createdAt: Date.now(),
        lastUpdatedAt: Date.now()
    };
}

// Simplified achievement check: only stamp_count type
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

// Returns newly unlocked achievements
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

// ─── Moon Site Tracking ───
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
    safeRemoveItem(STORAGE_KEY);
}

/**
 * ⭐ 事件驅動 - 當印章解鎖時發出自訂事件
 */
export function emitStampUnlockedEvent(stampId: string) {
    const event = new CustomEvent('stamp-unlocked', {
        detail: { stampId, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
}

/**
 * Get the next uncollected stamp in the journey sequence
 */
export function getNextStampInJourney(): typeof STAMPS[number] | null {
    const state = getPassportState();
    return STAMPS.find(stamp => !state.unlockedStamps.includes(stamp.id)) || null;
}