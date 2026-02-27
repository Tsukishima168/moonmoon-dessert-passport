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

import React, { useState, useCallback } from 'react';
import { getPassportPointsBalance, redeemItem } from '../passportUtils';
import { DEFAULT_REWARDS } from '../../_共享_資料/gamification-types';

// ─── 型別 ──────────────────────────────────────────────────

interface RewardShopProps {
    onClose?: () => void;
}

interface RewardCardProps {
    reward: typeof DEFAULT_REWARDS[number];
    userPoints: number;
    onRedeem: (rewardId: string, rewardName: string) => void;
}

// ─── 商品卡片 ──────────────────────────────────────────────

const REWARD_EMOJI: Record<string, string> = {
    sticker_basic: '🎭',
    card_limited: '🃏',
    drink_discount: '🧋',
    sr_character: '⭐',
    free_dessert: '🍰',
};

const RewardCard: React.FC<RewardCardProps> = ({ reward, userPoints, onRedeem }) => {
    const canAfford = userPoints >= reward.costPoints;
    const isOffline = reward.type === 'offline';

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
                    background: isOffline ? '#e8f5e9' : '#e3f2fd',
                    color: isOffline ? '#388e3c' : '#1565c0',
                    fontWeight: 600,
                }}
            >
                {isOffline ? '🏪 線下' : '💻 數位'}
            </span>

            {/* 庫存警告 */}
            {reward.stock !== undefined && (
                <span
                    style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: '#fff3e0',
                        color: '#e65100',
                        fontWeight: 600,
                    }}
                >
                    剩 {reward.stock} 份
                </span>
            )}

            {/* 主體 */}
            <div style={{ fontSize: 40 }}>{REWARD_EMOJI[reward.id] ?? '🎁'}</div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, textAlign: 'center', color: '#3d2c00' }}>
                {reward.name}
            </h3>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 18,
                    fontWeight: 800,
                    color: canAfford ? '#e65100' : '#9e9e9e',
                }}
            >
                🪙 {reward.costPoints} 積分
            </div>

            <button
                onClick={() => onRedeem(reward.id, reward.name)}
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
                {canAfford ? '立即兌換' : `還需 ${reward.costPoints - userPoints} 積分`}
            </button>
        </div>
    );
};

// ─── 確認彈窗 ────────────────────────────────────────────

interface ConfirmDialogProps {
    rewardId: string;
    rewardName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ rewardName, onConfirm, onCancel }) => (
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
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
            <h3 style={{ margin: '0 0 8px', color: '#3d2c00' }}>確認兌換？</h3>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14 }}>
                <strong>{rewardName}</strong>
                <br />
                兌換後積分將立即扣除，請確認。
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
    rewardName: string;
    isOffline: boolean;
    onClose: () => void;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({ rewardName, isOffline, onClose }) => (
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
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', color: '#3d2c00' }}>兌換成功！</h2>
            <p style={{ color: '#5d4037', margin: '0 0 16px', fontSize: 15 }}>
                <strong>{rewardName}</strong><br />已成功兌換
            </p>

            {isOffline ? (
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #f0c070',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20,
                        fontSize: 13,
                        color: '#5d4037',
                    }}
                >
                    📍 <strong>線下核銷說明</strong><br />
                    請於店內出示此畫面給店員掃描核銷<br />
                    <span style={{ fontSize: 11, color: '#9e7b3a' }}>（此畫面有效時間：10 分鐘）</span>
                </div>
            ) : (
                <div
                    style={{
                        background: '#e3f2fd',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20,
                        fontSize: 13,
                        color: '#1565c0',
                    }}
                >
                    💻 <strong>數位獎品說明</strong><br />
                    請截圖保存，或等待系統自動發送至您的帳號
                </div>
            )}

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

const RewardShop: React.FC<RewardShopProps> = ({ onClose }) => {
    const [userPoints, setUserPoints] = useState(() => getPassportPointsBalance());
    const [pendingReward, setPendingReward] = useState<{ id: string; name: string } | null>(null);
    const [successReward, setSuccessReward] = useState<{ name: string; isOffline: boolean } | null>(null);
    const [filter, setFilter] = useState<'all' | 'digital' | 'offline'>('all');

    const handleRedeemClick = useCallback((rewardId: string, rewardName: string) => {
        setPendingReward({ id: rewardId, name: rewardName });
    }, []);

    const handleConfirm = useCallback(() => {
        if (!pendingReward) return;

        const result = redeemItem(pendingReward.id);
        if (result.success) {
            setUserPoints(result.newBalance);
            const rewardDef = DEFAULT_REWARDS.find(r => r.id === pendingReward.id);
            setSuccessReward({
                name: pendingReward.name,
                isOffline: rewardDef?.type === 'offline',
            });
        } else {
            alert(result.error || '兌換失敗，請稍後再試');
        }
        setPendingReward(null);
    }, [pendingReward]);

    const filteredRewards = DEFAULT_REWARDS.filter(r =>
        filter === 'all' ? true : r.type === filter
    );

    return (
        <>
            {/* 確認彈窗 */}
            {pendingReward && (
                <ConfirmDialog
                    rewardId={pendingReward.id}
                    rewardName={pendingReward.name}
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingReward(null)}
                />
            )}

            {/* 成功彈窗 */}
            {successReward && (
                <SuccessDialog
                    rewardName={successReward.name}
                    isOffline={successReward.isOffline}
                    onClose={() => setSuccessReward(null)}
                />
            )}

            {/* 主要介面 */}
            <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
                {/* 標題列 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, color: '#3d2c00' }}>🏪 兌換商城</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9e7b3a' }}>用積分換取專屬獎勵</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                width: 36, height: 36, borderRadius: 18,
                                border: 'none', background: '#f5f5f5',
                                fontSize: 18, cursor: 'pointer', color: '#666',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

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
                        <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 800, color: '#fff' }}>
                            🪙 {userPoints}
                        </p>
                    </div>
                    <div style={{ fontSize: 40 }}>👜</div>
                </div>

                {/* 篩選器 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {(['all', 'digital', 'offline'] as const).map(type => (
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
                            {type === 'all' ? '全部' : type === 'digital' ? '💻 數位' : '🏪 線下'}
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
                    🪙 積分可通過每日簽到、MBTI 測驗、分享好友等行為獲得<br />
                    線下獎品請於店內出示兌換畫面
                </p>
            </div>
        </>
    );
};

export default RewardShop;
