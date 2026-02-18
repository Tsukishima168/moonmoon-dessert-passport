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
            return parsed;
        }
    } catch (error) {
        console.error('Error reading passport state:', error);
    }

    return {
        unlockedStamps: [],
        unlockedAchievements: [],
        redeemedRewards: [],
        createdAt: Date.now(),
        lastUpdatedAt: Date.now()
    };
}

// Logic to check if any new achievements are unlocked specific to the current state
function checkAchievements(state: PassportState): string[] {
    const newUnlockedIds: string[] = [];
    const currentStampCount = state.unlockedStamps.length;

    // Helper to count secret stamps
    const secretStampCount = state.unlockedStamps.filter(id => {
        const stamp = STAMPS.find(s => s.id === id);
        return stamp?.isSecret; // Only count if stamp definition has isSecret=true
    }).length;

    ACHIEVEMENTS.forEach(achievement => {
        if (state.unlockedAchievements.includes(achievement.id)) return;

        let unlocked = false;
        const { type, target } = achievement.condition;

        if (type === 'stamp_count') {
            if (currentStampCount >= (target as number)) unlocked = true;
        } else if (type === 'specific_stamp') {
            if (state.unlockedStamps.includes(target as string)) unlocked = true;
        } else if (type === 'secret_count') {
            if (secretStampCount >= (target as number)) unlocked = true;
        }

        if (unlocked) {
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

    // 1. Add stamp if not exists
    if (!state.unlockedStamps.includes(stampId)) {
        state.unlockedStamps.push(stampId);
        state.lastUpdatedAt = Date.now();

        // 2. Check for achievements whenever a stamp is added
        newAchievements = checkAchievements(state);

        safeSetItem(STORAGE_KEY, JSON.stringify(state));
    } else {
        // Even if stamp exists, check achievements (case of migration or manual updates)
        // But usually achievements unlock ON the event.
        // Let's safe-guard: if we somehow missed an achievement, should we unlock it now?
        // For now, only unlock on state change to avoid spamming.
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

export function resetPassport(): void {
    safeRemoveItem(STORAGE_KEY);
}
