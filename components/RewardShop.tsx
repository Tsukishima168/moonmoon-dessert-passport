/**
 * RewardShop.tsx — 兌換商城 MVP
 * W2-8 | Kiwimu PWA 遊戲化留存系統
 * Created: 2026-02-26 by Antigravity
 *
 * 功能：
 * - 顯示全站可兌換商品（數位 + 線下）
 * - 根據用戶積分餘額顯示可兌換狀態
 * - 兌換流程：確認 → 扣點 → 顯示兌換碼/引導
 * - DEV ONLY：尚未部署，Claude Code 接手後可整合至 PassportScreen.tsx
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    X,
    Coins,
    Gift,
    Sparkles,
    CircleAlert,
    Coffee,
    CupSoda,
    CakeSlice,
    ShoppingBag,
    Sticker as StickerIcon,
    type LucideIcon,
} from 'lucide-react';
import { getPassportPointsBalance, redeemItem } from '../passportUtils';
import { REDEEMABLE_ITEMS } from '../constants';
import { RedeemableItem } from '../types';
import { adjustPointsByIdentity } from '../src/api/points';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';
import { useLiff } from '../src/contexts/LiffContext';

// ─── 型別 ──────────────────────────────────────────────────

interface RewardShopProps {
    onClose?: () => void;
    currentPoints?: number;
}

interface RewardCardProps {
    reward: RedeemableItem;
    userPoints: number;
    onRedeem: (reward: RedeemableItem) => void;
}

// ─── 商品卡片 ──────────────────────────────────────────────

const REWARD_ICON_MAP: Record<string, { Icon: LucideIcon; accent: string; bg: string }> = {
    tea_buckwheat: { Icon: CupSoda, accent: '#0f766e', bg: '#d1fae5' },
    coffee_iced: { Icon: Coffee, accent: '#7c2d12', bg: '#ffedd5' },
    coffee_sicily: { Icon: Coffee, accent: '#9a3412', bg: '#ffedd5' },
    latte_matcha: { Icon: CupSoda, accent: '#166534', bg: '#dcfce7' },
    second_half: { Icon: CupSoda, accent: '#1d4ed8', bg: '#dbeafe' },
    pudding_classic: { Icon: CakeSlice, accent: '#b45309', bg: '#fef3c7' },
    chiffon_slice: { Icon: CakeSlice, accent: '#c2410c', bg: '#ffedd5' },
    seasonal_fruit: { Icon: Sparkles, accent: '#be185d', bg: '#fce7f3' },
    sticker_set: { Icon: StickerIcon, accent: '#6d28d9', bg: '#ede9fe' },
    cooler_bag: { Icon: ShoppingBag, accent: '#1f2937', bg: '#e5e7eb' },
};

const RewardCard: React.FC<RewardCardProps> = ({ reward, userPoints, onRedeem }) => {
    const canAfford = userPoints >= reward.pointsCost;
    const categoryLabel = reward.category === 'drink'
        ? '飲品'
        : reward.category === 'dessert'
            ? '甜點'
            : '周邊';
    const iconMeta = REWARD_ICON_MAP[reward.id] ?? { Icon: Gift, accent: '#92400e', bg: '#fef3c7' };
    const RewardIcon = iconMeta.Icon;

    return (
        <div
            style={{
                background: canAfford
                    ? 'linear-gradient(135deg, #fff9f0 0%, #fff3e0 100%)'
                    : '#f5f5f5',
                border: `2px solid ${canAfford ? '#f0c070' : '#e0e0e0'}`,
                borderRadius: 16,
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                opacity: canAfford ? 1 : 0.65,
                position: 'relative',
                transition: 'all 0.2s ease',
            }}
        >
            {/* 標籤 */}
            <span
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: reward.category === 'drink' ? '#e3f2fd' : reward.category === 'dessert' ? '#fff3e0' : '#ede7f6',
                    color: reward.category === 'drink' ? '#1565c0' : reward.category === 'dessert' ? '#e65100' : '#6a1b9a',
                    fontWeight: 600,
                }}
            >
                {categoryLabel}
            </span>

            {/* 主體 */}
            <div
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: iconMeta.bg,
                    color: iconMeta.accent,
                    border: `1px solid ${canAfford ? iconMeta.accent : '#d1d5db'}`,
                }}
            >
                <RewardIcon size={34} strokeWidth={2.2} />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, textAlign: 'center', color: '#3d2c00' }}>
                {reward.name}
            </h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, textAlign: 'center', color: '#8d6e63', minHeight: 36 }}>
                {reward.description}
            </p>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 18,
                    fontWeight: 800,
                    color: canAfford ? '#e65100' : '#9e9e9e',
                }}
            >
                <Coins size={18} />
                <span>{reward.pointsCost} 積分</span>
            </div>

            <button
                onClick={() => onRedeem(reward)}
                disabled={!canAfford}
                style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: canAfford
                        ? 'linear-gradient(90deg, #ff8f00, #ffa000)'
                        : '#bdbdbd',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                }}
            >
                {canAfford ? '立即兌換' : `還需 ${reward.pointsCost - userPoints} 積分`}
            </button>
        </div>
    );
};

// ─── 確認彈窗 ────────────────────────────────────────────

interface ConfirmDialogProps {
    reward: RedeemableItem;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ reward, onConfirm, onCancel }) => (
    <div
        style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
        }}
    >
        <div
            style={{
                background: '#fff',
                borderRadius: 20,
                padding: 28,
                maxWidth: 320,
                width: '100%',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 56,
                    height: 56,
                    margin: '0 auto 8px',
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff7ed',
                    color: '#ea580c',
                }}
            >
                <Gift size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#3d2c00' }}>確認兌換？</h3>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14 }}>
                <strong>{reward.name}</strong>
                <br />
                本次將扣除 <strong>{reward.pointsCost} 點</strong>，請確認你要兌換這項福利。
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 1, padding: '12px 0', borderRadius: 10,
                        border: '2px solid #eee', background: '#fff',
                        color: '#666', fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    取消
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        flex: 1, padding: '12px 0', borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(90deg, #ff8f00, #ffa000)',
                        color: '#fff', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    確認兌換
                </button>
            </div>
        </div>
    </div>
);

// ─── 兌換成功彈窗 ─────────────────────────────────────────

interface SuccessDialogProps {
    reward: RedeemableItem;
    onClose: () => void;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({ reward, onClose }) => (
    <div
        style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
        }}
    >
        <div
            style={{
                background: 'linear-gradient(135deg, #fff9f0, #fff3e0)',
                border: '2px solid #f0c070',
                borderRadius: 20,
                padding: 32,
                maxWidth: 320,
                width: '100%',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 68,
                    height: 68,
                    margin: '0 auto 12px',
                    borderRadius: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.85)',
                    color: '#f59e0b',
                }}
            >
                <Sparkles size={34} />
            </div>
            <h2 style={{ margin: '0 0 8px', color: '#3d2c00' }}>兌換成功！</h2>
            <p style={{ color: '#5d4037', margin: '0 0 16px', fontSize: 15 }}>
                <strong>{reward.name}</strong><br />已成功兌換
            </p>

            <div
                style={{
                    background: reward.category === 'merch' ? '#ede7f6' : '#fff',
                    border: '1px solid #f0c070',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#5d4037',
                }}
            >
                <strong>兌換提醒</strong><br />
                請於店內出示此畫面給店員確認兌換。<br />
                <span style={{ fontSize: 11, color: '#9e7b3a' }}>目前仍為 MVP 測試版，實際核銷以店內流程為準。</span>
            </div>

            <button
                onClick={onClose}
                style={{
                    width: '100%', padding: '12px 0', borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(90deg, #ff8f00, #ffa000)',
                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
            >
                完成
            </button>
        </div>
    </div>
);

// ─── 主元件 ────────────────────────────────────────────────

const RewardShop: React.FC<RewardShopProps> = ({ onClose, currentPoints }) => {
    const { user } = useSupabaseAuth();
    const { profile } = useLiff();
    const [userPoints, setUserPoints] = useState(() => getPassportPointsBalance());
    const [pendingReward, setPendingReward] = useState<RedeemableItem | null>(null);
    const [successReward, setSuccessReward] = useState<RedeemableItem | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'drink' | 'dessert' | 'merch'>('all');

    useEffect(() => {
        if (typeof currentPoints === 'number') {
            setUserPoints(currentPoints);
        }
    }, [currentPoints]);

    useEffect(() => {
        const handler = (e: Event) => {
            const evt = e as CustomEvent<{ balance?: number }>;
            if (typeof evt.detail?.balance === 'number') {
                setUserPoints(evt.detail.balance);
                return;
            }
            setUserPoints(getPassportPointsBalance());
        };

        document.addEventListener('passport-points-updated', handler);
        return () => document.removeEventListener('passport-points-updated', handler);
    }, []);

    const handleRedeemClick = useCallback((reward: RedeemableItem) => {
        setErrorMessage(null);
        setPendingReward(reward);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!pendingReward) return;

        const result = redeemItem(pendingReward.id);
        if (result.success) {
            setUserPoints(result.newBalance);
            setErrorMessage(null);
            if (user?.id || profile?.userId) {
                await adjustPointsByIdentity(
                    {
                        authUserId: user?.id,
                        lineUserId: profile?.userId,
                    },
                    -pendingReward.pointsCost,
                    `reward_redeem_${pendingReward.id}`
                ).catch((error) => {
                    console.warn('[RewardShop] Profile point sync failed:', error);
                });
            }
            setSuccessReward(pendingReward);
        } else {
            setErrorMessage(result.error || '兌換失敗，請稍後再試');
        }
        setPendingReward(null);
    }, [pendingReward, profile?.userId, user?.id]);

    const filteredRewards = REDEEMABLE_ITEMS.filter(r =>
        filter === 'all' ? true : r.category === filter
    );

    return (
        <>
            {/* 確認彈窗 */}
            {pendingReward && (
                <ConfirmDialog
                    reward={pendingReward}
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingReward(null)}
                />
            )}

            {/* 成功彈窗 */}
            {successReward && (
                <SuccessDialog
                    reward={successReward}
                    onClose={() => setSuccessReward(null)}
                />
            )}

            {/* 主要介面 */}
            <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
                {/* 標題列 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, color: '#3d2c00' }}>會員福利</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9e7b3a' }}>這裡是點數兌換，不是集章里程碑</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                width: 36, height: 36, borderRadius: 18,
                                border: 'none', background: '#f5f5f5',
                                cursor: 'pointer', color: '#666',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {errorMessage && (
                    <div
                        style={{
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            borderRadius: 16,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            padding: '12px 14px',
                        }}
                    >
                        <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
                            {errorMessage}
                        </div>
                        <button
                            type="button"
                            onClick={() => setErrorMessage(null)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            aria-label="關閉錯誤訊息"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* 積分餘額卡 */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #ff8f00, #ffa000)',
                        borderRadius: 16,
                        padding: '16px 20px',
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>我的積分餘額</p>
                        <div style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                            <Coins size={24} />
                            <p style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>{userPoints}</p>
                        </div>
                    </div>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.16)',
                            color: '#fff',
                        }}
                    >
                        <ShoppingBag size={28} />
                    </div>
                </div>

                {/* 篩選器 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {(['all', 'drink', 'dessert', 'merch'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 10,
                                border: `2px solid ${filter === type ? '#ffa000' : '#e0e0e0'}`,
                                background: filter === type ? '#fff9f0' : '#fff',
                                color: filter === type ? '#e65100' : '#9e9e9e',
                                fontWeight: filter === type ? 700 : 500,
                                fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {type === 'all'
                                ? '全部'
                                : type === 'drink'
                                    ? '飲品'
                                    : type === 'dessert'
                                        ? '甜點'
                                        : '周邊'}
                        </button>
                    ))}
                </div>

                {/* 商品列表 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {filteredRewards.map(reward => (
                        <RewardCard
                            key={reward.id}
                            reward={reward}
                            userPoints={userPoints}
                            onRedeem={handleRedeemClick}
                        />
                    ))}
                </div>

                {/* 說明文字 */}
                <p
                    style={{
                        marginTop: 24, textAlign: 'center', fontSize: 12,
                        color: '#bdbdbd', lineHeight: 1.6,
                    }}
                >
                    點數福利會和 shop 訂購會員測試活動一起使用。<br />
                    線下品項目前請於店內出示兌換畫面，由店員人工確認。
                </p>
            </div>
        </>
    );
};

export default RewardShop;
