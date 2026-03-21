import { supabase } from '../lib/supabase';
import {
  KIWIMU_CHARACTER_OPTIONS,
  ProfileCenterDraft,
  ProfileCenterSyncStatus,
  resolveProfileCenterDraft,
} from '../lib/profileCenter';

interface LoadProfileCenterParams {
  authUserId?: string | null;
  lineUserId?: string | null;
  authDisplayName?: string | null;
  liffDisplayName?: string | null;
}

type ProfileRow = Record<string, unknown>;
type ProfileLookupSource = 'authUserId' | 'lineUserId';

interface ResolvedProfileRow {
  profileId: string;
  row: ProfileRow;
  source: ProfileLookupSource;
}

export interface ProfileCenterLoadResult {
  draft: ProfileCenterDraft;
  syncStatus: ProfileCenterSyncStatus;
}

export interface ProfileCenterSaveResult {
  syncStatus: ProfileCenterSyncStatus;
}

function hasOwn(row: ProfileRow, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function readString(row: ProfileRow, keys: string[]): string | null {
  for (const key of keys) {
    if (!hasOwn(row, key)) continue;
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readBoolean(row: ProfileRow, key: string): boolean | null {
  if (!hasOwn(row, key)) return null;
  return typeof row[key] === 'boolean' ? (row[key] as boolean) : null;
}

function readCharacterId(row: ProfileRow, key: string): string | null {
  const value = readString(row, [key]);
  if (!value) return null;
  return KIWIMU_CHARACTER_OPTIONS.some((option) => option.id === value) ? value : null;
}

async function fetchProfileRowBySource(
  source: ProfileLookupSource,
  value: string
): Promise<ResolvedProfileRow | null> {
  if (!supabase) return null;

  const column = source === 'authUserId' ? 'id' : 'line_user_id';
  const query = supabase.from('profiles').select('*').eq(column, value);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error(`[profileCenter] Failed to fetch profile row by ${column}:`, error);
    return null;
  }

  const row = data ? (data as ProfileRow) : null;
  const profileId = row ? readString(row, ['id']) : null;

  if (!row || !profileId) return null;

  return {
    profileId,
    row,
    source,
  };
}

async function fetchProfileRow(params: {
  authUserId?: string | null;
  lineUserId?: string | null;
}): Promise<ResolvedProfileRow | null> {
  if (params.authUserId) {
    const authMatch = await fetchProfileRowBySource('authUserId', params.authUserId);
    if (authMatch) return authMatch;
  }

  if (params.lineUserId) {
    const lineMatch = await fetchProfileRowBySource('lineUserId', params.lineUserId);
    if (lineMatch) return lineMatch;
  }

  return null;
}

export async function loadProfileCenterDraft(
  params: LoadProfileCenterParams
): Promise<ProfileCenterLoadResult> {
  const baseDraft = resolveProfileCenterDraft({
    authDisplayName: params.authDisplayName,
    liffDisplayName: params.liffDisplayName,
  });

  const resolved = await fetchProfileRow(params);
  if (!resolved) {
    return {
      draft: baseDraft,
      syncStatus: {
        tone: 'warning',
        message: '目前沒有對應到 shared profiles，暫時只使用本機草稿。',
      },
    };
  }

  const { row } = resolved;
  const syncMessage =
    resolved.source === 'authUserId'
      ? '已從 shared profiles 讀取會員資料。'
      : '已從 shared profiles（line_user_id fallback）讀取會員資料。';

  return {
    draft: {
      ...baseDraft,
      displayName:
        readString(row, ['full_name', 'nickname', 'display_name']) || baseDraft.displayName,
      isMbtiPublic: readBoolean(row, 'is_mbti_public') ?? baseDraft.isMbtiPublic,
      isFootprintPublic:
        readBoolean(row, 'is_footprint_public') ?? baseDraft.isFootprintPublic,
      favoriteCharacterId:
        readCharacterId(row, 'favorite_character_id') || baseDraft.favoriteCharacterId,
      passportTitleId:
        readString(row, ['passport_title_id']) || baseDraft.passportTitleId,
    },
    syncStatus: {
      tone: resolved.source === 'authUserId' ? 'success' : 'warning',
      message: syncMessage,
    },
  };
}

export async function saveProfileCenterDraftToProfile(
  params: {
    authUserId: string;
    lineUserId?: string | null;
    draft: ProfileCenterDraft;
  }
): Promise<ProfileCenterSaveResult> {
  if (!supabase) {
    return {
      syncStatus: {
        tone: 'warning',
        message: 'Supabase 尚未設定完成，資料只會留在本機草稿。',
      },
    };
  }

  let resolved = await fetchProfileRow({
    authUserId: params.authUserId,
    lineUserId: params.lineUserId,
  });

  if (!resolved) {
    // 首次使用：嘗試以 authUserId 建立 profiles row
    const displayName = params.draft.displayName.trim();
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: params.authUserId,
        ...(params.lineUserId ? { line_user_id: params.lineUserId } : {}),
        ...(displayName ? { full_name: displayName } : {}),
        is_mbti_public: params.draft.isMbtiPublic,
        is_footprint_public: params.draft.isFootprintPublic,
        favorite_character_id: params.draft.favoriteCharacterId,
        passport_title_id: params.draft.passportTitleId,
      });

    if (insertError) {
      console.error('[profileCenter] Failed to insert new profile row:', insertError);
      return {
        syncStatus: {
          tone: 'error',
          message: `建立 shared profiles 失敗：${insertError.message}`,
        },
      };
    }

    return {
      syncStatus: {
        tone: 'success',
        message: '首次建立 shared profiles 完成，重新整理後可讀回設定。',
      },
    };
  }

  const { profileId, row, source } = resolved;
  const { draft } = params;

  const updates: Record<string, unknown> = {};
  const displayName = draft.displayName.trim();

  if (displayName) {
    if (hasOwn(row, 'full_name')) updates.full_name = displayName;
    if (hasOwn(row, 'nickname')) updates.nickname = displayName;
    if (hasOwn(row, 'display_name')) updates.display_name = displayName;
  }

  if (hasOwn(row, 'is_mbti_public')) {
    updates.is_mbti_public = draft.isMbtiPublic;
  }

  if (hasOwn(row, 'is_footprint_public')) {
    updates.is_footprint_public = draft.isFootprintPublic;
  }

  if (hasOwn(row, 'favorite_character_id')) {
    updates.favorite_character_id = draft.favoriteCharacterId;
  }

  if (hasOwn(row, 'passport_title_id')) {
    updates.passport_title_id = draft.passportTitleId;
  }

  if (Object.keys(updates).length === 0) {
    return {
      syncStatus: {
        tone: 'warning',
        message: 'shared profiles 沒有可寫入欄位，這次未送出更新。',
      },
    };
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId);

  if (error) {
    console.error('[profileCenter] Failed to save profile center draft:', error);
    return {
      syncStatus: {
        tone: 'error',
        message: `shared profiles 寫回失敗：${error.message}`,
      },
    };
  }

  if (source === 'lineUserId' && profileId !== params.authUserId) {
    console.warn('[profileCenter] Saved through line_user_id fallback row.', {
      authUserId: params.authUserId,
      lineUserId: params.lineUserId || null,
      matchedProfileId: profileId,
    });
    return {
      syncStatus: {
        tone: 'warning',
        message: '已透過 line_user_id fallback 寫回 shared profiles。',
      },
    };
  }

  return {
    syncStatus: {
      tone: 'success',
      message: '已寫回 shared profiles，重新整理後應可讀回目前設定。',
    },
  };
}
