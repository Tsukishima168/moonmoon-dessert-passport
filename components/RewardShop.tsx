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
            <div className="px-4 pb-8 max-w-[480px] mx-auto">
                {/* 標題列 */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-brand-black">會員福利</h2>
                        <p className="mt-1 text-[13px] text-brand-black/60 font-medium">使用積分兌換甜點與專屬福利</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {errorMessage && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-3.5 py-3">
                        <CircleAlert size={18} className="shrink-0 mt-0.5" />
                        <div className="flex-1 text-[13px] leading-relaxed font-semibold">
                            {errorMessage}
                        </div>
                        <button
                            type="button"
                            onClick={() => setErrorMessage(null)}
                            className="text-red-700 p-0 bg-transparent border-none cursor-pointer flex items-center justify-center"
                            aria-label="關閉錯誤訊息"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* 積分餘額卡 */}
                <KiwimuRewardBalanceCard points={userPoints} />

                {/* 篩選器 */}
                <div className="flex gap-2 mb-5">
                    {(['all', 'drink', 'dessert', 'merch'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`flex-1 py-2 rounded-xl border-2 text-[13px] cursor-pointer transition-all ${
                                filter === type
                                    ? 'border-brand-black bg-brand-lime font-bold text-brand-black'
                                    : 'border-gray-200 bg-white font-medium text-gray-400 hover:border-gray-300'
                            }`}
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
                <div className="grid grid-cols-2 gap-3">
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
                <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
                    積分可透過每日簽到、完成任務與消費累積。<br />
                    兌換時請出示此畫面給店員確認。
                </p>
            </div>
        </>
    );
};

export default RewardShop;
