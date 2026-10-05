/**
 * RewardShop.tsx — 兌換商城 MVP
 * W2-8 | Kiwimu PWA 遊戲化留存系統
 * Created: 2026-02-26 by Antigravity
 *
 * 功能：
 * - 顯示全站可兌換商品（數位 + 線下）
 * - 兌換流程：確認 → 伺服器扣點 → 顯示兌換碼/引導
 *
 * 點數規則（2026-10-04 Penso 決定「兌換頁改顯示伺服器點數」）：
 * - 「可兌換點數」= 伺服器 profiles.points（RPC redeem_reward_item 扣的就是這一本帳）。
 *   讀取來源 getServerPointsBalance；兌換成功後直接採用 RPC 回傳的 balance。
 * - 本機 localStorage 的點數只是「遊戲積分（不可兌換）」，僅在有值時以小字參考顯示，
 *   絕不拿來判斷能不能兌換（否則會出現畫面說夠、伺服器說「積分不足」）。
 * - 未登入（訪客）不顯示可兌換點數，改引導 Google 登入。
 *
 * 注意：目前 PassportScreen 沒有掛載本元件（2026-05-12 起 shop 分頁對外隱藏），
 * 重新開放時直接掛上即可，不需再改點數邏輯。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    X,
    CircleAlert,
} from 'lucide-react';
import { getPassportPointsBalance, recordServerRewardRedemption } from '../passportUtils';
import { REDEEMABLE_ITEMS } from '../constants';
import { RedeemableItem } from '../types';
import { redeemRewardItem, type RewardRedemption } from '../src/api/rewards';
import { getServerPointsBalance } from '../src/api/points';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';
import { KiwimuRewardBalanceCard, type RewardBalanceStatus } from './kiwimu/KiwimuRewardBalanceCard';
import { KiwimuRewardCard } from './kiwimu/KiwimuRewardCard';
import { KiwimuRewardConfirmDialog } from './kiwimu/KiwimuRewardConfirmDialog';
import { KiwimuRewardSuccessDialog } from './kiwimu/KiwimuRewardSuccessDialog';

// ─── 型別 ──────────────────────────────────────────────────

interface RewardShopProps {
    onClose?: () => void;
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

const RewardShop: React.FC<RewardShopProps> = ({ onClose }) => {
    const { user, loading: authLoading, signInWithGoogle } = useSupabaseAuth();
    const userId = user?.id ?? null;
    // 可兌換點數 = 伺服器餘額（null = 還沒讀到／讀取失敗／訪客）
    const [serverPoints, setServerPoints] = useState<number | null>(null);
    const [serverLoadFailed, setServerLoadFailed] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    // 遊戲積分 = 本機 localStorage，僅供參考、不可兌換
    const [gamePoints, setGamePoints] = useState(() => getPassportPointsBalance());
    const [pendingReward, setPendingReward] = useState<RedeemableItem | null>(null);
    const [successReward, setSuccessReward] = useState<RedeemableItem | null>(null);
    const [successRedemption, setSuccessRedemption] = useState<RewardRedemption | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'drink' | 'dessert' | 'merch'>('all');

    // 讀伺服器餘額：登入後、換帳號、按「重試」、兌換失敗後都會重讀
    useEffect(() => {
        if (!userId) {
            setServerPoints(null);
            setServerLoadFailed(false);
            return;
        }

        let active = true;
        setServerPoints(null);
        setServerLoadFailed(false);
        void getServerPointsBalance(userId).then((balance) => {
            if (!active) return;
            if (balance === null) {
                setServerLoadFailed(true);
                return;
            }
            setServerPoints(balance);
        });

        return () => {
            active = false;
        };
    }, [userId, reloadKey]);

    // 本機點數事件只更新「遊戲積分」，絕不動可兌換點數
    useEffect(() => {
        const handler = () => setGamePoints(getPassportPointsBalance());

        document.addEventListener('passport-points-updated', handler);
        return () => document.removeEventListener('passport-points-updated', handler);
    }, []);

    const balanceStatus: RewardBalanceStatus = useMemo(() => {
        if (authLoading) return 'loading';
        if (!userId) return 'guest';
        if (serverLoadFailed) return 'error';
        return serverPoints === null ? 'loading' : 'ready';
    }, [authLoading, userId, serverLoadFailed, serverPoints]);

    const handleLogin = useCallback(() => {
        void signInWithGoogle();
    }, [signInWithGoogle]);

    const handleRedeemClick = useCallback((reward: RedeemableItem) => {
        setErrorMessage(null);
        // 訪客：實體福利必須綁定 Google 帳號，直接帶去登入
        if (!userId) {
            handleLogin();
            return;
        }
        setPendingReward(reward);
    }, [handleLogin, userId]);

    const handleConfirm = useCallback(async () => {
        if (!pendingReward || redeeming) return;

        if (!userId) {
            setErrorMessage('請先登入 Passport 後再兌換，避免點數與兌換紀錄不同步。');
            setPendingReward(null);
            return;
        }

        setRedeeming(true);
        setErrorMessage(null);

        const { data, error } = await redeemRewardItem({
            rewardId: pendingReward.id,
            expectedPointsCost: pendingReward.pointsCost,
        });

        if (error || !data) {
            const msgMap: Record<string, string> = {
                auth_required: '請先登入 Passport 後再兌換。',
                profile_not_found: '找不到會員資料，請重新登入後再試。',
                reward_unavailable: '此福利目前無法兌換。',
                reward_price_changed: '兌換點數已更新，請重新整理後再試。',
                insufficient_points: '可兌換點數不足，無法兌換此福利。每日簽到可累積可兌換點數。',
            };
            setErrorMessage(msgMap[error?.message || ''] || '兌換失敗，請稍後再試。');
            setRedeeming(false);
            setPendingReward(null);
            // 餘額或價格與伺服器對不上時，重讀伺服器餘額，畫面才不會停在過期的數字
            if (error?.message === 'insufficient_points' || error?.message === 'reward_price_changed') {
                setReloadKey((key) => key + 1);
            }
            return;
        }

        // 兌換成功：可兌換點數直接採用 RPC 回傳的伺服器餘額；本機遊戲積分不動
        recordServerRewardRedemption(pendingReward.id);
        setServerPoints(data.balance);
        setServerLoadFailed(false);
        setSuccessReward(pendingReward);
        setSuccessRedemption(data.redemption);
        setRedeeming(false);
        setPendingReward(null);
    }, [pendingReward, redeeming, userId]);

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
                    isSubmitting={redeeming}
                    onConfirm={handleConfirm}
                    onCancel={() => {
                        if (!redeeming) setPendingReward(null);
                    }}
                />
            )}

            {/* 成功彈窗 */}
            {successReward && (
                <KiwimuRewardSuccessDialog
                    rewardName={successReward.name}
                    category={successReward.category}
                    redemptionCode={successRedemption?.redemption_code}
                    expiresAt={successRedemption?.expires_at}
                    balance={serverPoints ?? undefined}
                    onClose={() => {
                        setSuccessReward(null);
                        setSuccessRedemption(null);
                    }}
                />
            )}

            {/* 主要介面 */}
            <div className="px-4 pb-8 max-w-[480px] mx-auto">
                {/* 標題列 */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-brand-black">會員福利</h2>
                        <p className="mt-1 text-[13px] text-brand-black/60 font-medium">使用可兌換點數兌換甜點與專屬福利</p>
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

                {/* 可兌換點數（伺服器）＋ 遊戲積分（本機、不可兌換） */}
                <KiwimuRewardBalanceCard
                    points={serverPoints}
                    status={balanceStatus}
                    gamePoints={gamePoints}
                    onLogin={handleLogin}
                    onRetry={() => setReloadKey((key) => key + 1)}
                />

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
                            userPoints={serverPoints}
                            status={balanceStatus}
                            onRedeem={handleRedeemClick}
                        />
                    ))}
                </div>

                {/* 說明文字 */}
                <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
                    兌換時請出示此畫面給店員確認。
                </p>
            </div>
        </>
    );
};

export default RewardShop;
