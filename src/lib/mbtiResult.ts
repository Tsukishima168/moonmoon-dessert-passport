import { supabase } from './supabase';

const MBTI_RESULT_KEY = 'user_mbti_result';
const MBTI_VARIANT_KEY = 'user_mbti_variant';

const VALID_MBTI_TYPES = new Set([
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
]);

export type MbtiVariant = 'A' | 'T';

export interface MbtiResultSnapshot {
  mbtiType: string;
  variant: MbtiVariant | null;
  completedAt?: string | null;
  source?: string;
}

function normalizeVariant(value: unknown): MbtiVariant | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized === 'A' || normalized === 'T' ? normalized : null;
}

export function normalizeMbtiResult(
  typeValue: unknown,
  variantValue?: unknown
): MbtiResultSnapshot | null {
  if (typeof typeValue !== 'string') return null;

  const normalized = typeValue.trim().toUpperCase();
  const match = normalized.match(/^([EI][NS][TF][JP])(?:[-_\s]?([AT]))?$/);
  if (!match || !VALID_MBTI_TYPES.has(match[1])) {
    return null;
  }

  return {
    mbtiType: match[1],
    variant: normalizeVariant(variantValue) ?? normalizeVariant(match[2]),
  };
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredMbtiResult(): MbtiResultSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;

  return normalizeMbtiResult(
    storage.getItem(MBTI_RESULT_KEY),
    storage.getItem(MBTI_VARIANT_KEY)
  );
}

export function saveStoredMbtiResult(result: MbtiResultSnapshot): void {
  const storage = getStorage();
  const normalized = normalizeMbtiResult(result.mbtiType, result.variant);
  if (!storage || !normalized) return;

  try {
    storage.setItem(MBTI_RESULT_KEY, normalized.mbtiType);
    if (normalized.variant) {
      storage.setItem(MBTI_VARIANT_KEY, normalized.variant);
    } else {
      storage.removeItem(MBTI_VARIANT_KEY);
    }
  } catch {
    // Local persistence is best-effort only.
  }
}

function metadataValue(metadata: unknown, keys: string[]): unknown {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return null;
}

interface LatestMbtiRpcRow {
  mbti_type?: string | null;
  result_type?: string | null;
  suffix?: string | null;
  finished_at?: string | null;
  share_url?: string | null;
}

async function loadLatestMbtiResultFromRpc(): Promise<MbtiResultSnapshot | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_my_latest_mbti_result');
  if (error) {
    const missingFunctionCodes = new Set(['42883', 'PGRST202']);
    if (!missingFunctionCodes.has(error.code ?? '')) {
      console.warn('[mbtiResult] latest MBTI RPC failed:', error.message);
    }
    return null;
  }

  const row = Array.isArray(data) ? (data[0] as LatestMbtiRpcRow | undefined) : null;
  if (!row) return null;

  const normalized = normalizeMbtiResult(row.mbti_type ?? row.result_type, row.suffix);
  if (!normalized) return null;

  return {
    ...normalized,
    completedAt: row.finished_at ?? null,
    source: 'get_my_latest_mbti_result',
  };
}

export async function loadCloudMbtiResult(userId: string): Promise<MbtiResultSnapshot | null> {
  if (!supabase) return null;

  const rpcResult = await loadLatestMbtiResultFromRpc();
  if (rpcResult) {
    return rpcResult;
  }

  const { data, error } = await supabase
    .from('user_events')
    .select('metadata, created_at')
    .eq('user_id', userId)
    .eq('event_type', 'quiz_completed')
    .in('site', ['kiwimu', 'mbti', 'kiwimu_mbti'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('[mbtiResult] load cloud MBTI result failed:', error.message);
    return null;
  }

  for (const row of data ?? []) {
    const metadata = (row as { metadata?: unknown }).metadata;
    const normalized = normalizeMbtiResult(
      metadataValue(metadata, ['mbti_type', 'mbtiType', 'result_type', 'resultType']),
      metadataValue(metadata, ['variant', 'suffix'])
    );

    if (normalized) {
      return {
        ...normalized,
        completedAt: (row as { created_at?: string | null }).created_at ?? null,
        source: 'user_events',
      };
    }
  }

  return null;
}
