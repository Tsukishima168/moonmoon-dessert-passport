export interface ProfileCenterDraft {
  displayName: string;
  isMbtiPublic: boolean;
  isFootprintPublic: boolean;
  favoriteCharacterId: string;
  passportTitleId: string;
}

interface ProfileCenterSeed {
  authDisplayName?: string | null;
  liffDisplayName?: string | null;
}

export interface KiwimuCharacterOption {
  id: string;
  name: string;
  mood: string;
}

export interface PassportTitleOption {
  id: string;
  label: string;
  hint: string;
}

export type ProfileCenterSyncTone = 'idle' | 'syncing' | 'success' | 'warning' | 'error';

export interface ProfileCenterSyncStatus {
  tone: ProfileCenterSyncTone;
  message: string;
}

const STORAGE_KEY = 'moonmoon_profile_center_mvp';

export const PROFILE_CENTER_AVATAR_URL = '/icon-192x192.png';

export const KIWIMU_CHARACTER_OPTIONS: KiwimuCharacterOption[] = [
  { id: 'kiwimu', name: 'Kiwimu', mood: '絕對接納' },
  { id: 'bascat', name: 'Bascat', mood: '焦慮防禦' },
  { id: 'sugrana', name: 'Sugrana', mood: '渴望理解' },
  { id: 'caramoon', name: 'Caramoon', mood: '懷舊苦甜' },
  { id: 'eggle', name: 'Eggle', mood: '脆弱攪拌' },
  { id: 'gully', name: 'Gully', mood: '冷感邊界' },
  { id: 'saltme', name: 'Saltme', mood: '微抗議' },
  { id: 'sugarwe', name: 'Sugarwe', mood: '融化治癒' },
];

export const LOCKED_PASSPORT_TITLE: PassportTitleOption = {
  id: 'locked',
  label: '待解鎖稱號',
  hint: '之後由點數或名額條件發放',
};

export function resolvePassportTitle(passportTitleId: string): PassportTitleOption {
  if (passportTitleId === LOCKED_PASSPORT_TITLE.id) {
    return LOCKED_PASSPORT_TITLE;
  }

  return {
    id: passportTitleId,
    label: passportTitleId,
    hint: '此稱號已由系統發放。',
  };
}

function getStoredDraft(): Partial<ProfileCenterDraft> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (error) {
    console.error('Error reading profile center draft:', error);
    return {};
  }
}

export function resolveProfileCenterDraft(seed: ProfileCenterSeed): ProfileCenterDraft {
  const stored = getStoredDraft();
  const fallbackDisplayName =
    seed.authDisplayName?.trim() ||
    seed.liffDisplayName?.trim() ||
    '月島旅人';

  return {
    displayName: stored.displayName?.trim() || fallbackDisplayName,
    isMbtiPublic: typeof stored.isMbtiPublic === 'boolean' ? stored.isMbtiPublic : false,
    isFootprintPublic: typeof stored.isFootprintPublic === 'boolean' ? stored.isFootprintPublic : false,
    favoriteCharacterId:
      typeof stored.favoriteCharacterId === 'string' && stored.favoriteCharacterId
        ? stored.favoriteCharacterId
        : KIWIMU_CHARACTER_OPTIONS[0].id,
    passportTitleId: LOCKED_PASSPORT_TITLE.id,
  };
}

export function saveProfileCenterDraft(draft: ProfileCenterDraft): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        displayName: draft.displayName,
        isMbtiPublic: draft.isMbtiPublic,
        isFootprintPublic: draft.isFootprintPublic,
        favoriteCharacterId: draft.favoriteCharacterId,
      })
    );
  } catch (error) {
    console.error('Error saving profile center draft:', error);
  }
}
