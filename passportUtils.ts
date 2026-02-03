import { PassportState } from './types';

const STORAGE_KEY = 'moonmoon_passport';

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
}

export function markRewardRedeemed(tierId: string): void {
    const state = getPassportState();
    if (!state.redeemedRewards.includes(tierId)) {
        state.redeemedRewards.push(tierId);
        state.lastUpdatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    localStorage.removeItem(STORAGE_KEY);
}
