// ============================================================
// Kiwimu 全站遊戲化型別定義 (Gamification Shared Types)
// 資料來源：PWA_遊戲化留存系統.md | 資料合約.md
// Created: 2026-02-26 by Antigravity
// ============================================================

// ─── 點數行為來源 ───────────────────────────────────────────
export type PointSource = 'passport' | 'gacha' | 'mbti' | 'shop';

// 對應 Supabase point_transactions.action 欄位
export type PointAction =
    | 'daily_checkin'   // +1~5 pts（連續天加成）
    | 'mbti_complete'   // +2 pts（每週限一次）
    | 'share_result'    // +2 pts（每週限一次）
    | 'gacha_earn'      // +N pts（轉盤獎勵）
    | 'shop_purchase'   // +5 pts（到店消費）
    | 'quest_complete'  // +5 pts（週任務全完）
    | 'month_quest'     // +20 pts（月任務）
    | 'redeem_spend';   // -N pts（兌換扣點）

// ─── 點數交易記錄 ─────────────────────────────────────────
// 對應 Supabase point_transactions 表
export interface PointTransaction {
    id: string;
    device_id?: string;
    user_id?: string;
    type: PointAction;
    amount: number;              // 正數=獲得，負數=扣除
    description: string;
    source?: PointSource;
    timestamp: number;           // Unix ms（localStorage）
    created_at?: string;         // ISO string（Supabase）
}

// ─── 連續簽到獎勵表 ──────────────────────────────────────
// 對應 PWA_遊戲化留存系統.md §3-2
export const STREAK_BONUS_TABLE: Record<number, number> = {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 5, // Day 7 大獎
};

/**
 * 根據連續簽到天數計算應得點數
 * 斷簽不歸零，但 streak 重置到 1
 */
export function getCheckinPoints(streakCount: number): number {
    const normalizedStreak = ((streakCount - 1) % 7) + 1;
    return STREAK_BONUS_TABLE[normalizedStreak] ?? 1;
}

// ─── 任務定義 ──────────────────────────────────────────────
export type QuestType = 'daily' | 'weekly' | 'monthly' | 'seasonal';

export interface QuestDefinition {
    id: string;
    type: QuestType;
    name: string;
    description: string;
    pointReward: number;
    requirement: number;          // 需要完成幾次
}

// 週任務清單（完成全部得 +5 週幣）
export const WEEKLY_QUESTS: QuestDefinition[] = [
    {
        id: 'weekly_mbti',
        type: 'weekly',
        name: '完成 MBTI 測驗',
        description: '本週完成一次性格測驗',
        pointReward: 0, // 個別獎勵在 PointAction 中，全完成才觸發 quest_complete +5
        requirement: 1,
    },
    {
        id: 'weekly_share',
        type: 'weekly',
        name: '分享結果卡',
        description: '本週分享一次測驗結果',
        pointReward: 0,
        requirement: 1,
    },
    {
        id: 'weekly_checkin_3',
        type: 'weekly',
        name: '連續登入 3 天',
        description: '本週連續簽到 3 天',
        pointReward: 0,
        requirement: 3,
    },
];

// ─── 事件標準（資料合約.md）─────────────────────────────────
export type KiwimuEventName =
    | 'login_success'
    | 'mbti_completed'
    | 'mission_complete'
    | 'stamp_claim'
    | 'order_redirect'
    | 'order_success'
    | 'reward_redeem';

export interface KiwimuEventPayload {
    user_id?: string;
    device_id: string;
    event_time: number;
    site_id: PointSource;
    session_id?: string;
    mbti?: string;            // e.g. 'INTJ-A'
    mission_id?: string;
    order_id?: string;
    reward_id?: string;
}

// ─── 兌換商品 ──────────────────────────────────────────────
export interface RewardItem {
    id: string;
    name: string;
    type: 'digital' | 'offline';
    costPoints: number;
    stock?: number;            // undefined = 無限
    availableUntil?: Date;
    isActive: boolean;
}

// 對應 Supabase reward_inventory 初始資料
export const DEFAULT_REWARDS: Omit<RewardItem, 'isActive'>[] = [
    { id: 'sticker_basic', name: 'Kiwimu 數位貼圖 ×1', type: 'digital', costPoints: 10 },
    { id: 'card_limited', name: '限定色版角色卡', type: 'digital', costPoints: 30 },
    { id: 'drink_discount', name: '甜點店飲品折扣碼', type: 'offline', costPoints: 50 },
    { id: 'sr_character', name: '指定 SR 角色直接換', type: 'digital', costPoints: 100 },
    { id: 'free_dessert', name: '甜點店免費甜點兌換券', type: 'offline', costPoints: 150, stock: 20 },
];
