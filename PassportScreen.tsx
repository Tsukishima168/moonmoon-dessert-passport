import React, { useState, useEffect } from 'react';
import { CheckCircle, Instagram, MessageCircle, MapPin, Eye, Users, Brain, Star, Share2, Lock, X, Mail, ShoppingBag } from 'lucide-react';
import { STAMPS, REWARD_TIERS, LINKS } from './constants';
import { Stamp } from './types';
import {
    getPassportState,
    unlockStamp,
    isStampUnlocked,
    getUnlockedStampCount
} from './passportUtils';
import { Button } from './components/Button';
import { trackEvent, trackOutboundNavigation } from './analytics';

const iconMap: Record<string, React.ElementType> = {
    CheckCircle,
    Instagram,
    MessageCircle,
    MapPin,
    Eye,
    Users,
    Brain,
    Star,
    Share2,
    Mail,
    ShoppingBag
};

interface PassportScreenProps {
    onClose: () => void;
}

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose }) => {
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [passwordInput, setPasswordInput] = useState('');
    const [selectedStampForPassword, setSelectedStampForPassword] = useState<Stamp | null>(null);
    const [checkboxStamps, setCheckboxStamps] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setUnlockedCount(getUnlockedStampCount());
    }, []);

    const handleStampClick = (stamp: Stamp) => {
        if (isStampUnlocked(stamp.id)) {
            return; // Already unlocked
        }

        // Direct navigation for external link badges
        if (stamp.id === 'ig_followed') {
            window.open(LINKS.INSTAGRAM, '_blank');
            trackOutboundNavigation(LINKS.INSTAGRAM, 'passport_badge_click');
            return;
        }
        if (stamp.id === 'line_joined') {
            window.open(LINKS.LINE_OA, '_blank');
            trackOutboundNavigation(LINKS.LINE_OA, 'passport_badge_click');
            return;
        }
        if (stamp.id === 'google_review') {
            window.open(LINKS.GOOGLE_MAPS, '_blank');
            trackOutboundNavigation(LINKS.GOOGLE_MAPS, 'passport_badge_click');
            return;
        }

        if (stamp.unlockMethod === 'checkbox') {
            // Toggle checkbox state (will unlock on "confirm" later)
            setCheckboxStamps(prev => ({ ...prev, [stamp.id]: !prev[stamp.id] }));
        } else if (stamp.unlockMethod === 'password') {
            // Show password input dialog
            setSelectedStampForPassword(stamp);
            setPasswordInput('');
        }
    };

    const handlePasswordSubmit = () => {
        if (!selectedStampForPassword) return;

        // Simple password validation (you can customize these)
        let isValid = false;
        if (selectedStampForPassword.id === 'mbti_completed') {
            // MBTI test password (can be customized)
            isValid = passwordInput.toUpperCase().startsWith('MBTI');
        } else if (selectedStampForPassword.id === 'google_review') {
            // Google review secret code
            isValid = passwordInput.toUpperCase().includes('KIWIMU');
        }

        if (isValid) {
            unlockStamp(selectedStampForPassword.id);
            setUnlockedCount(getUnlockedStampCount());
            setSelectedStampForPassword(null);
            setPasswordInput('');
            trackEvent('stamp_unlocked', { stamp_id: selectedStampForPassword.id, method: 'password' });
        } else {
            alert('密碼錯誤！請再試一次。');
        }
    };

    const handleCheckboxConfirm = (stampId: string) => {
        if (checkboxStamps[stampId]) {
            unlockStamp(stampId);
            setUnlockedCount(getUnlockedStampCount());
            setCheckboxStamps(prev => ({ ...prev, [stampId]: false }));
            trackEvent('stamp_unlocked', { stamp_id: stampId, method: 'checkbox' });
        }
    };

    const availableRewards = REWARD_TIERS.filter(tier => unlockedCount >= tier.requiredStamps);
    const nextReward = REWARD_TIERS.find(tier => unlockedCount < tier.requiredStamps);

    return (
        <div className="min-h-screen bg-brand-bg pt-16 md:pt-20 px-4 md:px-6 pb-12 animate-fade-in">
            {/* Header - Responsive */}
            <div className="max-w-4xl mx-auto mb-6 md:mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-brand-black">月島登島護照</h1>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border-2 border-brand-black flex items-center justify-center hover:bg-brand-gray transition-all hover:scale-105 shadow-[2px_2px_0px_black]"
                    >
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Enhanced Progress Card */}
                <div className="bg-gradient-to-br from-white to-brand-lime/10 rounded-2xl p-4 md:p-5 border-2 border-brand-black shadow-[4px_4px_0px_black]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm md:text-base font-bold text-gray-600">收集進度</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xl md:text-2xl font-bold text-brand-black">{unlockedCount}</span>
                            <span className="text-sm text-gray-500">/</span>
                            <span className="font-mono text-lg md:text-xl font-bold text-gray-400">10</span>
                        </div>
                    </div>
                    {/* Enhanced Progress Bar with Milestones */}
                    <div className="relative h-3 md:h-4 w-full bg-gray-200 rounded-full overflow-hidden border border-brand-black">
                        <div
                            className="h-full bg-gradient-to-r from-brand-lime to-brand-lime/80 transition-all duration-500 rounded-full"
                            style={{ width: `${(unlockedCount / 10) * 100}%` }}
                        />
                        {/* Milestone markers */}
                        {[3, 5, 7, 10].map((milestone) => (
                            <div
                                key={milestone}
                                className={`absolute top-0 bottom-0 w-0.5 bg-brand-black ${unlockedCount >= milestone ? 'opacity-100' : 'opacity-30'
                                    }`}
                                style={{ left: `${(milestone / 10) * 100}%` }}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                        {[3, 5, 7, 10].map((milestone) => (
                            <span
                                key={milestone}
                                className={`text-[10px] md:text-xs font-bold transition-colors ${unlockedCount >= milestone ? 'text-brand-lime-dark' : 'text-gray-400'
                                    }`}
                            >
                                {milestone}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Collapsible Guide - Mobile Friendly */}
                <details className="mt-4 group">
                    <summary className="cursor-pointer p-4 bg-white border-2 border-brand-black rounded-xl shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all list-none">
                        <div className="flex items-center justify-between">
                            <p className="text-sm md:text-base font-bold text-brand-black">📖 如何集章</p>
                            <span className="text-xs bg-brand-lime px-2 py-1 rounded-full font-bold group-open:rotate-180 transition-transform">▼</span>
                        </div>
                    </summary>
                    <div className="mt-2 p-4 bg-white/80 border border-brand-black/10 rounded-xl">
                        <ol className="text-xs md:text-sm font-sans text-brand-black space-y-2 list-decimal list-inside">
                            <li><strong>完成測驗</strong> → 自動解鎖「甜點測驗」章</li>
                            <li><strong>到店掃 QR</strong> → 掃描店內隱藏 QR Code 解鎖「秘密角落」等</li>
                            <li><strong>勾選完成</strong> → IG 追蹤、加 LINE、觀察者挑戰等，點擊印章後勾選並確認</li>
                            <li><strong>密碼解鎖</strong> → 完成 MBTI／Google 評論後，點擊對應印章輸入通關碼</li>
                        </ol>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="font-bold mb-1 text-xs md:text-sm">🏪 到店使用方式</p>
                            <ul className="space-y-0.5 list-disc list-inside text-gray-700 text-xs">
                                <li>到店可掃描店內 QR Code 收集更多印章</li>
                                <li>兌換獎勵時出示「階段獎勵」區塊給店員即可</li>
                            </ul>
                        </div>
                    </div>
                </details>

                {/* Warning - Compact */}
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-3 text-xs text-yellow-800">
                    ⚠️ <strong>溫馨提醒</strong>：請使用同一支手機收集印章
                </div>
            </div>

            {/* Stamps Grid - Enhanced Responsive */}
            <div className="max-w-4xl mx-auto mb-8">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-brand-black mb-1">收集 10 枚印章</h2>
                <p className="text-xs md:text-sm text-gray-600 mb-4">點擊印章可查看解鎖方式或確認完成</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {STAMPS.map((stamp) => {
                        const unlocked = isStampUnlocked(stamp.id);
                        const Icon = iconMap[stamp.icon] || CheckCircle;
                        const isChecked = checkboxStamps[stamp.id];

                        return (
                            <div
                                key={stamp.id}
                                onClick={() => handleStampClick(stamp)}
                                className={`
                  relative p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-300 cursor-pointer group
                  ${unlocked
                                        ? 'bg-gradient-to-br from-brand-lime/30 to-brand-lime/10 border-brand-lime shadow-[3px_3px_0px_rgba(212,255,0,0.5)] animate-pulse-slow'
                                        : isChecked
                                            ? 'bg-white border-brand-black shadow-[3px_3px_0px_black] scale-[1.02]'
                                            : 'bg-white/80 border-gray-300 hover:border-brand-black hover:shadow-[3px_3px_0px_black] hover:scale-[1.02]'
                                    }
                `}
                            >
                                {unlocked && (
                                    <div className="absolute top-2 right-2 animate-bounce">
                                        <CheckCircle size={18} className="text-brand-lime-dark drop-shadow-sm" fill="currentColor" />
                                    </div>
                                )}

                                <div className={`mb-2 transition-all ${unlocked ? 'text-brand-black scale-110' : 'text-gray-400 group-hover:text-brand-black group-hover:scale-105'
                                    }`}>
                                    <Icon size={24} className="md:w-7 md:h-7" />
                                </div>

                                <h3 className="text-xs md:text-sm font-bold text-brand-black mb-1 leading-tight">{stamp.name}</h3>
                                <p className="text-[10px] md:text-xs text-gray-600 leading-snug">{stamp.description}</p>

                                {stamp.unlockMethod === 'checkbox' && !unlocked && isChecked && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxConfirm(stamp.id);
                                        }}
                                        className="mt-2 w-full bg-brand-black text-white text-xs py-1 rounded-lg hover:bg-brand-black/80"
                                    >
                                        確認完成
                                    </button>
                                )}

                                {stamp.unlockMethod === 'password' && !unlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-xl">
                                        <Lock size={20} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rewards */}
            <div className="max-w-2xl mx-auto mb-8">
                <h2 className="text-xl font-bold text-brand-black mb-4">階段獎勵</h2>

                {availableRewards.map((reward) => (
                    <div key={reward.id} className="mb-4 bg-white border-2 border-brand-black rounded-xl p-5 shadow-[4px_4px_0px_black]">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="inline-block bg-brand-lime px-2 py-0.5 rounded-full text-xs font-bold uppercase mb-2">
                                    {reward.requiredStamps} 章達成
                                </div>
                                <h3 className="text-lg font-bold text-brand-black">{reward.title}</h3>
                                <p className="text-sm text-gray-600">{reward.description}</p>
                            </div>
                        </div>

                        {reward.redemptionMethod === 'show-screen' ? (
                            <div className="bg-brand-lime/20 border-2 border-brand-lime rounded-lg p-4 text-center">
                                <p className="text-sm font-bold text-brand-black">✅ 已達成！出示此頁面給店員即可兌換</p>
                            </div>
                        ) : (
                            <a
                                href={`${LINKS.LINE_OA}?text=${encodeURIComponent('我已完成月島護照 10 章收集！\n想要兌換原味千層蛋糕 🎁')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => trackOutboundNavigation(LINKS.LINE_OA, 'passport_tier10_redeem')}
                            >
                                <Button
                                    fullWidth
                                    variant="black"
                                    className="rounded-xl shadow-[4px_4px_0px_#D4FF00] hover:shadow-[2px_2px_0px_#D4FF00]"
                                >
                                    🎁 前往 LINE@ 領取兌換券
                                </Button>
                            </a>
                        )}
                    </div>
                ))}

                {nextReward && (
                    <div className="bg-white/50 border border-gray-300 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock size={16} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">還需 {nextReward.requiredStamps - unlockedCount} 章</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-600">{nextReward.title}</h3>
                        <p className="text-sm text-gray-500">{nextReward.description}</p>
                    </div>
                )}
            </div>

            {/* Password Modal */}
            {selectedStampForPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-xl font-bold text-brand-black mb-2">{selectedStampForPassword.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">{selectedStampForPassword.description}</p>

                        <input
                            type="text"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            placeholder="輸入密碼或通關碼"
                            className="w-full px-4 py-3 border-2 border-brand-black rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-brand-lime"
                            autoFocus
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedStampForPassword(null)}
                                className="flex-1 py-3 border-2 border-brand-black rounded-xl font-bold hover:bg-brand-gray transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handlePasswordSubmit}
                                className="flex-1 py-3 bg-brand-black text-white rounded-xl font-bold hover:bg-brand-black/80 transition-colors"
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassportScreen;
