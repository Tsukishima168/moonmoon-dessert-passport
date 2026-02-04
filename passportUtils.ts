import { PassportState } from './types';

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
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading passport state:', error);
    }

    return {
        unlockedStamps: [],
        redeemedRewards: [],
        createdAt: Date.now(),
        lastUpdatedAt: Date.now()
    };
}

export function unlockStamp(stampId: string): void {
    const state = getPassportState();
    if (!state.unlockedStamps.includes(stampId)) {
        state.unlockedStamps.push(stampId);
        state.lastUpdatedAt = Date.now();
        safeSetItem(STORAGE_KEY, JSON.stringify(state));
    }
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



export function resetPassport(): void {
    safeRemoveItem(STORAGE_KEY);
}
