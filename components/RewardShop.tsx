import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, RefreshCw, TicketCheck, X } from 'lucide-react';
import type { RedeemableItem } from '../types';
import {
    getMyRewardRedemptions,
    getRewardCatalog,
    redeemRewardItem,
    rotateRewardRedemptionProof,
    type RewardRedemptionSummary,
} from '../src/api/rewards';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';
import { KiwimuRewardBalanceCard } from './kiwimu/KiwimuRewardBalanceCard';
import { KiwimuRewardCard } from './kiwimu/KiwimuRewardCard';
import { KiwimuRewardConfirmDialog } from './kiwimu/KiwimuRewardConfirmDialog';
import { KiwimuRewardSuccessDialog } from './kiwimu/KiwimuRewardSuccessDialog';

interface RewardShopProps {
    onClose?: () => void;
    currentPoints?: number;
}

interface VisibleCredential {
    credential: string;
    expiresAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
    AUTH_REQUIRED: '請先登入 Passport 後再兌換。',
    NOT_ELIGIBLE: '這筆兌換目前不符合資格。',
    LIMIT_REACHED: '你已達到這項福利的本期兌換上限。',
    INSUFFICIENT_POINTS: '積分不足，無法兌換此福利。',
    OUT_OF_STOCK: '這項福利目前已兌換完畢。',
    EXPIRED: '這張兌換憑證已過期。',
    ALREADY_PROCESSED: '這筆操作已完成；請從有效憑證重新顯示核銷碼。',
    INVALID_PROOF: '兌換憑證格式不正確。',
    ROLLOUT_DISABLED: '正式兌換功能尚未對此帳號開放。',
    UNAVAILABLE: '兌換服務暫時無法確認，未扣除任何正式點數。',
};

function errorMessage(error: Error | null): string {
    return ERROR_MESSAGES[error?.message || 'UNAVAILABLE'] || ERROR_MESSAGES.UNAVAILABLE;
}

const RewardShop: React.FC<RewardShopProps> = ({ onClose, currentPoints = 0 }) => {
    const { user } = useSupabaseAuth();
    const [userPoints, setUserPoints] = useState(currentPoints);
    const [catalog, setCatalog] = useState<RedeemableItem[]>([]);
    const [redemptions, setRedemptions] = useState<RewardRedemptionSummary[]>([]);
    const [redemptionsOwnerId, setRedemptionsOwnerId] = useState<string | null>(null);
    const currentUserIdRef = useRef<string | null>(user?.id ?? null);
    currentUserIdRef.current = user?.id ?? null;
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [pendingReward, setPendingReward] = useState<RedeemableItem | null>(null);
    const [successReward, setSuccessReward] = useState<RedeemableItem | null>(null);
    const [visibleCredential, setVisibleCredential] = useState<VisibleCredential | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [rotatingId, setRotatingId] = useState<string | null>(null);
    const [errorMessageText, setErrorMessageText] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'drink' | 'dessert' | 'merch'>('all');

    useEffect(() => {
        setUserPoints(currentPoints);
    }, [currentPoints]);

    const refreshRedemptions = useCallback(async () => {
        const ownerId = user?.id ?? null;
        if (!ownerId) {
            setRedemptions([]);
            setRedemptionsOwnerId(null);
            return;
        }

        const result = await getMyRewardRedemptions();
        if (currentUserIdRef.current !== ownerId) return;
        if (result.error || !result.data) {
            setErrorMessageText(errorMessage(result.error));
            return;
        }
        setRedemptions(result.data);
        setRedemptionsOwnerId(ownerId);
    }, [user?.id]);

    useEffect(() => {
        let active = true;
        setCatalogLoading(true);

        void getRewardCatalog().then((result) => {
            if (!active) return;
            setCatalogLoading(false);
            if (result.error || !result.data) {
                setCatalog([]);
                setErrorMessageText(errorMessage(result.error));
                return;
            }
            setCatalog(result.data);
        });

        void refreshRedemptions();
        return () => {
            active = false;
        };
    }, [refreshRedemptions]);

    const activeRedemptions = useMemo(
        () => redemptionsOwnerId === (user?.id ?? null)
            ? redemptions.filter((redemption) => (
                redemption.status === 'issued' && Date.parse(redemption.expiresAt) > Date.now()
            ))
            : [],
        [redemptions, redemptionsOwnerId, user?.id],
    );

    const filteredRewards = useMemo(
        () => catalog.filter((reward) => filter === 'all' || reward.category === filter),
        [catalog, filter],
    );

    const handleConfirm = useCallback(async () => {
        if (!pendingReward || redeeming) return;
        if (!user?.id) {
            setErrorMessageText('請先登入 Passport 後再兌換，避免點數與兌換紀錄不同步。');
            setPendingReward(null);
            return;
        }

        setRedeeming(true);
        setErrorMessageText(null);
        const result = await redeemRewardItem({ rewardId: pendingReward.id });

        if (result.error || !result.data) {
            setErrorMessageText(errorMessage(result.error));
            setRedeeming(false);
            setPendingReward(null);
            return;
        }

        setUserPoints(result.data.balance);
        setSuccessReward(pendingReward);
        setVisibleCredential({
            credential: result.data.credential,
            expiresAt: result.data.expiresAt,
        });
        setRedeeming(false);
        setPendingReward(null);
        document.dispatchEvent(new Event('economy-wallet-updated'));
        void refreshRedemptions();
    }, [pendingReward, redeeming, refreshRedemptions, user?.id]);

    const handleShowCredential = useCallback(async (redemption: RewardRedemptionSummary) => {
        if (rotatingId) return;
        setRotatingId(redemption.id);
        setErrorMessageText(null);
        const result = await rotateRewardRedemptionProof(redemption.id);
        setRotatingId(null);

        if (result.error || !result.data) {
            setErrorMessageText(errorMessage(result.error));
            void refreshRedemptions();
            return;
        }

        setSuccessReward(
            catalog.find((reward) => reward.id === redemption.rewardId) || {
                id: redemption.rewardId,
                name: redemption.rewardName,
                description: '已由伺服器保留的會員兌換項目',
                pointsCost: redemption.pointsCost,
                category: redemption.rewardCategory,
                available: true,
                redemptionMethod: 'show-screen',
            },
        );
        setVisibleCredential({
            credential: result.data.credential,
            expiresAt: result.data.expiresAt,
        });
    }, [catalog, refreshRedemptions, rotatingId]);

    return (
        <>
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

            {successReward && visibleCredential && (
                <KiwimuRewardSuccessDialog
                    rewardName={successReward.name}
                    category={successReward.category}
                    redemptionCredential={visibleCredential.credential}
                    expiresAt={visibleCredential.expiresAt}
                    balance={userPoints}
                    onClose={() => {
                        setSuccessReward(null);
                        setVisibleCredential(null);
                    }}
                />
            )}

            <div className="mx-auto max-w-[480px] px-4 pb-8">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-brand-black">點數兌換</h2>
                        <p className="mt-1 text-[13px] font-medium text-brand-black/60">
                            價格、供應與資格皆由正式伺服器目錄決定
                        </p>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                            aria-label="關閉點數兌換"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {errorMessageText && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700">
                        <CircleAlert size={18} className="mt-0.5 shrink-0" />
                        <div className="flex-1 text-[13px] font-semibold leading-relaxed">
                            {errorMessageText}
                        </div>
                        <button
                            type="button"
                            onClick={() => setErrorMessageText(null)}
                            className="flex items-center justify-center border-none bg-transparent p-0 text-red-700"
                            aria-label="關閉錯誤訊息"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <KiwimuRewardBalanceCard points={userPoints} />

                {activeRedemptions.length > 0 && (
                    <section className="mb-5 rounded-2xl border-2 border-brand-black bg-white p-4 shadow-[3px_3px_0px_black]">
                        <div className="mb-3 flex items-center gap-2">
                            <TicketCheck size={18} className="text-brand-black" />
                            <h3 className="text-sm font-black text-brand-black">我的有效核銷憑證</h3>
                        </div>
                        <div className="space-y-2">
                            {activeRedemptions.map((redemption) => (
                                <div
                                    key={redemption.id}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-brand-gray/10 px-3 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-brand-black">
                                            {redemption.rewardName}
                                        </p>
                                        <p className="mt-1 text-[11px] font-semibold text-brand-black/45">
                                            有效至 {new Date(redemption.expiresAt).toLocaleDateString('zh-TW')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleShowCredential(redemption)}
                                        disabled={rotatingId !== null}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-brand-black bg-brand-lime px-3 py-2 text-xs font-black text-brand-black disabled:opacity-50"
                                    >
                                        <RefreshCw size={13} className={rotatingId === redemption.id ? 'animate-spin' : ''} />
                                        顯示
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <div className="mb-5 flex gap-2">
                    {(['all', 'drink', 'dessert', 'merch'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFilter(type)}
                            className={`flex-1 rounded-xl border-2 py-2 text-[13px] transition-all ${
                                filter === type
                                    ? 'border-brand-black bg-brand-lime font-bold text-brand-black'
                                    : 'border-gray-200 bg-white font-medium text-gray-400 hover:border-gray-300'
                            }`}
                        >
                            {type === 'all' ? '全部' : type === 'drink' ? '飲品' : type === 'dessert' ? '甜點' : '周邊'}
                        </button>
                    ))}
                </div>

                {catalogLoading ? (
                    <div className="rounded-2xl border-2 border-dashed border-brand-black/20 bg-white/70 px-4 py-8 text-center text-sm font-bold text-brand-black/45">
                        正在讀取正式兌換目錄…
                    </div>
                ) : filteredRewards.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredRewards.map((reward) => (
                            <KiwimuRewardCard
                                key={reward.id}
                                reward={reward}
                                userPoints={userPoints}
                                onRedeem={(selected) => {
                                    setErrorMessageText(null);
                                    setPendingReward(selected);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border-2 border-dashed border-brand-black/20 bg-white/70 px-4 py-8 text-center text-sm font-bold text-brand-black/45">
                        目前沒有可兌換的正式品項。
                    </div>
                )}

                <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
                    兌換由伺服器同時完成扣點、庫存保留與憑證建立。<br />
                    請在店員面前出示完整核銷憑證。
                </p>
            </div>
        </>
    );
};

export default RewardShop;
