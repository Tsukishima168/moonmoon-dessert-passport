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
    CircleAlert,
} from 'lucide-react';
import { getPassportPointsBalance, redeemItem } from '../passportUtils';
import { REDEEMABLE_ITEMS } from '../constants';
import { RedeemableItem } from '../types';
import { adjustPointsByIdentity } from '../src/api/points';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';
import { useLiff } from '../src/contexts/LiffContext';
import { KiwimuRewardBalanceCard } from './kiwimu/KiwimuRewardBalanceCard';
import { KiwimuRewardCard } from './kiwimu/KiwimuRewardCard';
import { KiwimuRewardConfirmDialog } from './kiwimu/KiwimuRewardConfirmDialog';
import { KiwimuRewardSuccessDialog } from './kiwimu/KiwimuRewardSuccessDialog';

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

// ─── 確認彈窗 ────────────────────────────────────────────

interface ConfirmDialogProps {
    reward: RedeemableItem;
    onConfirm: () => void;
    onCancel: () => void;
}


// ─── 兌換成功彈窗 ─────────────────────────────────────────

interface SuccessDialogProps {
    reward: RedeemableItem;
    onClose: () => void;
}


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
                <KiwimuRewardConfirmDialog
                    rewardName={pendingReward.name}
                    pointsCost={pendingReward.pointsCost}
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingReward(null)}
                />
            )}

            {/* 成功彈窗 */}
            {successReward && (
                <KiwimuRewardSuccessDialog
                    rewardName={successReward.name}
                    category={successReward.category}
                    onClose={() => setSuccessReward(null)}
                />
            )}

            {/* 主要介面 */}
            <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
                {/* 標題列 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, color: '#3d2c00' }}>會員福利</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9e7b3a' }}>使用積分兌換甜點與專屬福利</p>
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
                <KiwimuRewardBalanceCard points={userPoints} />

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
                        <KiwimuRewardCard
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
                    積分可透過每日簽到、完成任務與消費累積。<br />
                    兌換時請出示此畫面給店員確認。
                </p>
            </div>
        </>
    );
};

export default RewardShop;
