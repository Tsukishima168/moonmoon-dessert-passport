import { supabase } from '../lib/supabase';
import {
    getLegacyWalletByIdentity,
    type PointIdentity,
} from './points';
import {
    canUseEconomyWriteAuthority,
    getWalletOwnerKey,
    normalizeEconomyEnvelope,
    readLedgerInteger,
    readNonNegativeLedgerInteger,
} from './economyContract.js';
import { getTaipeiDay, shiftTaipeiDay } from './economyDay.js';

export type EconomyCode =
    | 'OK'
    | 'AUTH_REQUIRED'
    | 'NOT_ELIGIBLE'
    | 'LIMIT_REACHED'
    | 'INSUFFICIENT_POINTS'
    | 'OUT_OF_STOCK'
    | 'EXPIRED'
    | 'ALREADY_PROCESSED'
    | 'INVALID_PROOF'
    | 'ROLLOUT_DISABLED'
    | 'UNAVAILABLE';

export interface EconomyEnvelope<T = Record<string, unknown>> {
    ok: boolean;
    code: EconomyCode;
    request_id: string;
    data: T;
}

interface EconomyWalletData {
    balance: number;
    history: Array<{
        id: string;
        delta: number;
        balance_after: number;
        entry_type: string;
        source_site: string;
        reference_type: string;
        reference_id: string;
        created_at: string;
    }>;
}

interface EconomyEventData {
    event_id?: string;
    status?: 'accepted' | 'shadow';
    awarded_points?: number;
    balance?: number;
}

export type PassportWalletSource = 'economy_v2' | 'legacy_remote' | 'guest' | 'unavailable';

export interface PassportWalletEntry {
    id: string;
    delta: number;
    balanceAfter: number | null;
    entryType: string;
    sourceSite: string;
    referenceType: string;
    referenceId: string;
    createdAt: string;
}

export interface PassportWalletSnapshot {
    available: boolean;
    source: PassportWalletSource;
    balance: number;
    history: PassportWalletEntry[];
    code: EconomyCode;
    ownerKey: string | null;
    requestId?: string;
    error?: string;
}

export interface PassportCheckinState {
    canCheckin: boolean;
    streakCount: number;
    checkedTaipeiDates: string[];
}

export interface PassportCheckinResult {
    ok: boolean;
    code: EconomyCode;
    source: Exclude<PassportWalletSource, 'guest' | 'unavailable'> | 'unavailable';
    pointsAwarded: number;
    balance: number | null;
    ownerKey: string | null;
    shadowObserved?: boolean;
    error?: string;
}

export interface PassportCheckinAuthority {
    source: PassportWalletSource;
    balance: number;
    ownerKey: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unavailableSnapshot(
    error: string,
    code: EconomyCode = 'UNAVAILABLE',
    ownerKey: string | null = null
): PassportWalletSnapshot {
    return {
        available: false,
        source: 'unavailable',
        balance: 0,
        history: [],
        code,
        ownerKey,
        error,
    };
}

function isMissingEconomyRpc(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    return error.code === 'PGRST202'
        || error.code === '42883'
        || /could not find the function/i.test(error.message || '');
}

function normalizeEnvelope<T>(value: unknown, requestId: string): EconomyEnvelope<T> | null {
    return normalizeEconomyEnvelope(value, requestId) as EconomyEnvelope<T> | null;
}

export { getTaipeiDay } from './economyDay.js';

function isPassportCheckinEntry(entry: PassportWalletEntry): boolean {
    return entry.sourceSite === 'passport'
        && (entry.referenceType === 'passport.daily_checkin'
            || entry.referenceType.startsWith('daily_checkin'));
}

export function derivePassportCheckinState(
    history: PassportWalletEntry[],
    now: Date = new Date()
): PassportCheckinState {
    const checkedDays = new Set(
        history
            .filter(isPassportCheckinEntry)
            .map((entry) => getTaipeiDay(entry.createdAt))
    );
    const today = getTaipeiDay(now);
    let cursor = checkedDays.has(today) ? today : shiftTaipeiDay(today, -1);
    let streakCount = 0;

    while (checkedDays.has(cursor) && streakCount < 3650) {
        streakCount += 1;
        cursor = shiftTaipeiDay(cursor, -1);
    }

    return {
        canCheckin: !checkedDays.has(today),
        streakCount,
        checkedTaipeiDates: Array.from(checkedDays).sort(),
    };
}

function normalizeV2History(history: EconomyWalletData['history'] | undefined): PassportWalletEntry[] | null {
    if (!Array.isArray(history)) return null;
    const normalized: PassportWalletEntry[] = [];

    for (const entry of history) {
        const delta = readLedgerInteger(entry?.delta);
        const balanceAfter = readNonNegativeLedgerInteger(entry?.balance_after);
        if (
            !entry
            || typeof entry.id !== 'string'
            || delta === null
            || balanceAfter === null
            || typeof entry.entry_type !== 'string'
            || typeof entry.source_site !== 'string'
            || typeof entry.reference_type !== 'string'
            || typeof entry.reference_id !== 'string'
            || typeof entry.created_at !== 'string'
            || Number.isNaN(Date.parse(entry.created_at))
        ) {
            return null;
        }

        normalized.push({
            id: entry.id,
            delta,
            balanceAfter,
            entryType: entry.entry_type,
            sourceSite: entry.source_site,
            referenceType: entry.reference_type,
            referenceId: entry.reference_id,
            createdAt: entry.created_at,
        });
    }

    return normalized;
}

async function readLegacyWallet(identity: PointIdentity): Promise<PassportWalletSnapshot> {
    const ownerKey = getWalletOwnerKey(identity);
    const legacy = await getLegacyWalletByIdentity(identity);
    if (!legacy.ok) {
        return unavailableSnapshot(legacy.error || 'Legacy remote wallet unavailable', 'UNAVAILABLE', ownerKey);
    }

    const balance = readNonNegativeLedgerInteger(legacy.balance);
    if (balance === null) {
        return unavailableSnapshot('Legacy remote wallet returned an invalid balance', 'UNAVAILABLE', ownerKey);
    }

    const history: PassportWalletEntry[] = [];
    for (const entry of legacy.history) {
        const delta = readLedgerInteger(entry?.points);
        if (
            !entry
            || typeof entry.id !== 'string'
            || delta === null
            || typeof entry.action !== 'string'
            || (entry.source !== null && typeof entry.source !== 'string')
            || typeof entry.created_at !== 'string'
            || Number.isNaN(Date.parse(entry.created_at))
        ) {
            return unavailableSnapshot('Legacy remote wallet returned malformed history', 'UNAVAILABLE', ownerKey);
        }

        history.push({
            id: entry.id,
            delta,
            balanceAfter: null,
            entryType: delta < 0 ? 'spend' : 'earn',
            sourceSite: entry.source || 'passport',
            referenceType: entry.action,
            referenceId: entry.id,
            createdAt: entry.created_at,
        });
    }

    return {
        available: true,
        source: 'legacy_remote',
        balance,
        history,
        code: 'OK',
        ownerKey,
    };
}

/**
 * Reads Economy v2 first for authenticated members. Only an explicit server
 * rollout denial (or the RPC not existing yet) may use the transitional remote
 * profile ledger. A valid v2 balance of zero is authoritative and never falls
 * back to localStorage or the legacy profile balance.
 */
export async function readPassportWallet(identity: PointIdentity): Promise<PassportWalletSnapshot> {
    const ownerKey = getWalletOwnerKey(identity);
    if (!identity.authUserId && !identity.lineUserId) {
        return {
            available: true,
            source: 'guest',
            balance: 0,
            history: [],
            code: 'AUTH_REQUIRED',
            ownerKey: null,
        };
    }

    if (!supabase) {
        return unavailableSnapshot('Supabase not configured', 'UNAVAILABLE', ownerKey);
    }

    if (identity.authUserId) {
        const requestId = crypto.randomUUID();
        const { data, error } = await supabase.rpc('economy_get_wallet', {
            p_source_site: 'passport',
            p_history_limit: 100,
            p_request_id: requestId,
        });

        if (!error) {
            const envelope = normalizeEnvelope<EconomyWalletData>(data, requestId);
            if (envelope?.ok && envelope.code === 'OK') {
                const balance = readNonNegativeLedgerInteger(envelope.data.balance);
                const history = normalizeV2History(envelope.data.history);
                if (balance === null || history === null) {
                    return unavailableSnapshot(
                        'Economy wallet returned a malformed success payload',
                        'UNAVAILABLE',
                        ownerKey
                    );
                }
                return {
                    available: true,
                    source: 'economy_v2',
                    balance,
                    history,
                    code: 'OK',
                    ownerKey,
                    requestId: envelope.request_id || requestId,
                };
            }

            if (envelope?.code !== 'ROLLOUT_DISABLED') {
                return unavailableSnapshot(
                    `Economy wallet rejected the request (${envelope?.code || 'invalid response'})`,
                    envelope?.code || 'UNAVAILABLE',
                    ownerKey
                );
            }
        } else if (!isMissingEconomyRpc(error)) {
            return unavailableSnapshot(error.message, 'UNAVAILABLE', ownerKey);
        }
    }

    return readLegacyWallet(identity);
}

async function submitPassportEvent(
    actorUserId: string,
    eventType: 'passport.activated' | 'passport.daily_checkin',
    referenceId: string,
    evidence: Record<string, unknown> = {}
): Promise<{ envelope: EconomyEnvelope<EconomyEventData> | null; missing: boolean; error?: string }> {
    if (!supabase) {
        return { envelope: null, missing: true, error: 'Supabase not configured' };
    }

    const requestId = crypto.randomUUID();
    const { data, error } = await supabase.rpc('economy_submit_event', {
        p_event: {
            event_id: crypto.randomUUID(),
            event_type: eventType,
            occurred_at: new Date().toISOString(),
            source_site: 'passport',
            actor_user_id: actorUserId,
            reference_id: referenceId,
            evidence,
            schema_version: 1,
        },
        p_request_id: requestId,
    });

    if (error) {
        return {
            envelope: null,
            missing: isMissingEconomyRpc(error),
            error: error.message,
        };
    }

    return {
        envelope: normalizeEnvelope<EconomyEventData>(data, requestId),
        missing: false,
    };
}

export async function submitPassportActivation(actorUserId: string): Promise<EconomyCode> {
    const result = await submitPassportEvent(
        actorUserId,
        'passport.activated',
        'passport-activated',
        { surface: 'passport' }
    );
    if (result.missing) return 'ROLLOUT_DISABLED';
    return result.envelope?.code || 'UNAVAILABLE';
}

export async function performPassportCheckin(
    identity: PointIdentity,
    authority: PassportCheckinAuthority
): Promise<PassportCheckinResult> {
    const ownerKey = getWalletOwnerKey(identity);
    if (!identity.authUserId) {
        return {
            ok: false,
            code: 'AUTH_REQUIRED',
            source: 'unavailable',
            pointsAwarded: 0,
            balance: null,
            ownerKey,
        };
    }

    // A write is allowed only after this screen has read the v2 wallet. This
    // couples read/write rollout and prevents a legacy/v2 split-brain. The
    // legacy profile ledger remains read-only in this adapter.
    if (!canUseEconomyWriteAuthority(authority, identity.authUserId)) {
        return {
            ok: false,
            code: 'ROLLOUT_DISABLED',
            source: authority.source === 'legacy_remote' && authority.ownerKey === ownerKey
                ? 'legacy_remote'
                : 'unavailable',
            pointsAwarded: 0,
            balance: authority.source === 'legacy_remote' && authority.ownerKey === ownerKey
                ? authority.balance
                : null,
            ownerKey,
            error: 'Economy v2 wallet authority is required before check-in',
        };
    }

    const eventResult = await submitPassportEvent(
        identity.authUserId,
        'passport.daily_checkin',
        `passport-checkin-${getTaipeiDay(new Date())}`,
        { surface: 'passport_checkin' }
    );

    if (eventResult.missing || eventResult.envelope?.code === 'ROLLOUT_DISABLED') {
        return {
            ok: false,
            code: 'ROLLOUT_DISABLED',
            source: 'economy_v2',
            pointsAwarded: 0,
            balance: authority.balance,
            ownerKey,
            error: eventResult.error || 'Economy v2 write rollout is disabled',
        };
    }

    if (!eventResult.envelope) {
        return {
            ok: false,
            code: 'UNAVAILABLE',
            source: 'unavailable',
            pointsAwarded: 0,
            balance: null,
            ownerKey,
            error: eventResult.error || 'Economy event response unavailable',
        };
    }

    const { envelope } = eventResult;
    if (envelope.ok && envelope.code === 'OK' && envelope.data.status === 'accepted') {
        const pointsAwarded = readNonNegativeLedgerInteger(envelope.data.awarded_points);
        const balance = readNonNegativeLedgerInteger(envelope.data.balance);
        if (pointsAwarded === null || balance === null) {
            return {
                ok: false,
                code: 'UNAVAILABLE',
                source: 'unavailable',
                pointsAwarded: 0,
                balance: null,
                ownerKey,
                error: 'Economy check-in returned a malformed success payload',
            };
        }
        return {
            ok: true,
            code: 'OK',
            source: 'economy_v2',
            pointsAwarded,
            balance,
            ownerKey,
        };
    }

    if (envelope.ok && envelope.code === 'OK' && envelope.data.status === 'shadow') {
        return {
            ok: false,
            code: 'ROLLOUT_DISABLED',
            source: 'economy_v2',
            pointsAwarded: 0,
            balance: authority.balance,
            ownerKey,
            shadowObserved: true,
            error: 'Shadow events are observational and do not award client-visible points',
        };
    }

    if (envelope.code === 'ALREADY_PROCESSED' || envelope.code === 'LIMIT_REACHED') {
        return {
            ok: false,
            code: envelope.code,
            source: 'economy_v2',
            pointsAwarded: 0,
            balance: authority.balance,
            ownerKey,
        };
    }

    return {
        ok: false,
        code: envelope.code,
        source: 'unavailable',
        pointsAwarded: 0,
        balance: null,
        ownerKey,
    };
}

export async function claimPendingEconomyActivity(
    claimId: string
): Promise<EconomyEnvelope<EconomyEventData>> {
    const requestId = crypto.randomUUID();
    if (!UUID_PATTERN.test(claimId)) {
        return {
            ok: false,
            code: 'NOT_ELIGIBLE',
            request_id: requestId,
            data: {},
        };
    }

    if (!supabase) {
        return {
            ok: false,
            code: 'UNAVAILABLE',
            request_id: requestId,
            data: {},
        };
    }

    const { data, error } = await supabase.rpc('economy_claim_pending', {
        p_claim_id: claimId,
        p_request_id: requestId,
    });

    if (error) {
        return {
            ok: false,
            code: isMissingEconomyRpc(error) ? 'ROLLOUT_DISABLED' : 'UNAVAILABLE',
            request_id: requestId,
            data: {},
        };
    }

    return normalizeEnvelope<EconomyEventData>(data, requestId) || {
        ok: false,
        code: 'UNAVAILABLE',
        request_id: requestId,
        data: {},
    };
}
