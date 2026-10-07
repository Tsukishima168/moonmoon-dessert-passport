import React, { useState } from 'react';
import {
    CheckCircle,
    Navigation,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Sparkles,
    MapPin,
    Instagram,
    MessageCircle,
    ShoppingBag,
    Star,
    Search,
    Check
} from 'lucide-react';
import { STAMPS } from '../constants';
import { Stamp } from '../types';
import {
    isStampUnlocked,
    unlockStamp,
    getUnlockedStampCount,
} from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';
import { getNextMission, type JourneyMode } from '../src/lib/memberJourney';

interface BadgeJourneyProps {
    mode: JourneyMode;
    onModeChange: (mode: JourneyMode) => void;
    onStampUnlocked: (newAchievements: string[]) => void;
    onGpsCheckin: (stamp: Stamp) => void;
    isCheckingLocation: boolean;
    gpsDebug?: {
        stampId: string;
        status: 'success' | 'out_of_range' | 'permission_denied' | 'position_unavailable' | 'timeout' | 'unsupported' | 'error';
        distanceMeters?: number;
        accuracyMeters?: number;
        checkedAt: string;
    } | null;
}

// Map icon names to Lucide components
const IconMap: Record<string, any> = {
    MapPin,
    CheckCircle,
    Instagram,
    MessageCircle,
    ShoppingBag,
    Star,
    Search,
    Navigation,
    Sparkles,
};

const BadgeJourney: React.FC<BadgeJourneyProps> = ({ mode, onModeChange, onStampUnlocked, onGpsCheckin, isCheckingLocation, gpsDebug }) => {
    const [externalPending, setExternalPending] = useState<string | null>(null);
    const [showCollected, setShowCollected] = useState(false);
    const visibleStamps = STAMPS.filter(stamp => !stamp.isSecret);
    const unlockedCount = getUnlockedStampCount();
    const nextStamp = getNextMission(STAMPS, STAMPS.filter(s => isStampUnlocked(s.id)).map(s => s.id), mode);
    const totalStamps = visibleStamps.length;
    const allComplete = unlockedCount >= totalStamps;

    // Separate stamps into collected and uncollected
    const collectedStamps = STAMPS.filter(s => isStampUnlocked(s.id));

    const handleExternalGo = (stamp: Stamp) => {
        if (stamp.externalLink) {
            setExternalPending(stamp.id);
            trackEvent('stamp_external_started', { stamp_id: stamp.id });
            trackOutboundNavigation(stamp.externalLink, `badge_journey_${stamp.id}`, {
                entrySurface: 'passport_badge_journey',
                destinationType: 'external',
            });
            window.open(stamp.externalLink, '_blank');
        }
    };

    const handleExternalComplete = (stampId: string) => {
        const newIds = unlockStamp(stampId);
        setExternalPending(null);
        trackEvent('stamp_unlocked', { stamp_id: stampId, method: 'external' });
        onStampUnlocked(newIds);
    };

    const getAnimClass = (type?: string) => {
        switch (type) {
            case 'pulse': return 'animate-pulse';
            case 'bounce': return 'animate-bounce';
            case 'spin': return 'animate-spin-slow';
            case 'float': return 'animate-float';
            default: return '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border-2 border-brand-black bg-white p-4">
                <div className="member-journey-heading"><h3>從一件小事開始集章</h3><span>探索進度 {unlockedCount} / {totalStamps}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="選擇任務情境">
                    {(['online', 'store'] as const).map(value => (
                        <button key={value} type="button" aria-pressed={mode === value}
                            onClick={() => onModeChange(value)}
                            className={`min-h-11 rounded-xl border border-brand-black px-3 py-3 text-xs font-bold ${mode === value ? 'bg-brand-lime text-brand-black' : 'bg-white text-brand-black/70'}`}>
                            {value === 'online' ? '先做線上任務' : '我已到店'}
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-brand-black/65">
                    {mode === 'online' ? '例如先完成免費 MBTI 測驗，下次回來再查看護照紀錄。' : '到店後才使用定位或掃描現場 QR；實體獎勵兌換尚未開放。'}
                    印章探索進度先保留在此裝置，跨站足跡不會自動換成印章。
                </p>
            </div>
            {/* ─── Next Action Card ─── */}
            {!allComplete && nextStamp && (
                <div className="bg-white rounded-2xl p-5 border-2 border-brand-black shadow-[4px_4px_0px_black] relative overflow-hidden group">

                    <p className="text-[12px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">
                        接著可以做
                    </p>

                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl bg-brand-lime flex items-center justify-center border-2 border-brand-black shadow-[3px_3px_0px_black] shrink-0 ${getAnimClass(nextStamp.animationType)}`}>
                            {React.createElement(IconMap[nextStamp.icon] || MapPin, { size: 32, className: 'text-brand-black' })}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-brand-black mb-1">{nextStamp.name}</h3>
                            <p className="text-xs text-gray-600 mb-4 font-medium">{nextStamp.id === 'quiz_completed' ? '前往免費 MBTI 測驗，完成後從結果頁回到護照。' : nextStamp.guideHint}</p>

                            {/* Action Buttons based on unlockMethod */}
                            {nextStamp.unlockMethod === 'gps' && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => onGpsCheckin(nextStamp)}
                                        disabled={isCheckingLocation}
                                        className="w-full py-3 bg-brand-black text-white rounded-xl font-bold text-sm border-2 border-brand-black shadow-[3px_3px_0px_rgba(212,255,0,0.5)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCheckingLocation ? (
                                            <><Loader2 size={16} className="animate-spin" /> 定位中...</>
                                        ) : (
                                            <><Navigation size={16} /> {nextStamp.guideCta}</>
                                        )}
                                    </button>
                                    <div className="rounded-xl bg-brand-gray/10 px-3 py-2 text-[11px] text-gray-500">
                                        判定半徑 {nextStamp.location?.radius ?? 0} m，建議站在戶外並開啟高精準定位。
                                        {gpsDebug?.stampId === nextStamp.id && (
                                            <span className="block mt-1 font-medium text-brand-black/70">
                                                最近一次：{typeof gpsDebug.distanceMeters === 'number' ? `距離 ${Math.round(gpsDebug.distanceMeters)} m` : '未取得距離'}
                                                {typeof gpsDebug.accuracyMeters === 'number' ? ` · 精度 ±${Math.round(gpsDebug.accuracyMeters)} m` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {nextStamp.unlockMethod === 'external' && (
                                externalPending === nextStamp.id ? (
                                    <button
                                        onClick={() => handleExternalComplete(nextStamp.id)}
                                        className="w-full py-3 bg-brand-lime text-brand-black rounded-xl font-bold text-sm border-2 border-brand-black shadow-[3px_3px_0px_black] active:translate-y-0.5 flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} /> 確認完成
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleExternalGo(nextStamp)}
                                        className="w-full py-3 bg-brand-black text-white rounded-xl font-bold text-sm border-2 border-brand-black shadow-[3px_3px_0px_rgba(212,255,0,0.5)] active:translate-y-0.5 flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={16} /> {nextStamp.guideCta}
                                    </button>
                                )
                            )}

                            {nextStamp.id === 'quiz_completed' ? (
                                <a href="https://kiwimu.com/?from=passport_online_mission" target="_blank" rel="noopener noreferrer"
                                    onClick={() => trackOutboundNavigation('https://kiwimu.com/?from=passport_online_mission', 'member_mbti_mission', { entrySurface: 'passport_badge_journey', destinationType: 'quiz' })}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-black bg-brand-black px-3 py-3 text-sm font-bold text-white">
                                    做免費 MBTI 測驗 <ExternalLink size={16} />
                                </a>
                            ) : nextStamp.unlockMethod === 'qr' && (
                                <div className="w-full py-2.5 bg-gray-50 text-brand-black/60 rounded-xl text-[11px] font-bold text-center border border-dashed border-gray-300">
                                    {nextStamp.id === 'quiz_completed' ? '完成甜點測驗自動解鎖' : '尋找店內 QR Code 掃描'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!nextStamp && !allComplete && (
                <div role="status" className="rounded-2xl border border-brand-black/20 bg-white p-4">
                    <p className="text-sm font-bold">{mode === 'online' ? '目前線上任務已完成' : '目前到店任務已完成'}</p>
                    <p className="mt-2 text-xs leading-relaxed text-brand-black/65">{mode === 'online' ? '下次到店時切換「我已到店」，繼續定位與 QR 探索。' : '可以切換線上任務，或回到護照首頁查看紀錄。'}</p>
                </div>
            )}

            {/* ─── Collected Stamps (Collapsible) ─── */}
            {collectedStamps.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-brand-black/10 overflow-hidden">
                    <button
                        onClick={() => setShowCollected(!showCollected)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand-gray/5 pointer-events-auto"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-brand-black">已收集印章 ({collectedStamps.length})</span>
                            <div className="flex -space-x-1.5 focus-within:z-10">
                                {collectedStamps.slice(0, 5).map(s => (
                                    <div key={s.id} className="w-6 h-6 rounded-lg bg-brand-lime border border-brand-black flex items-center justify-center">
                                        {React.createElement(IconMap[s.icon] || MapPin, { size: 12, className: 'text-brand-black' })}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {showCollected ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>

                    {showCollected && (
                        <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 bg-gray-50/50">
                            {collectedStamps.map(stamp => (
                                <div
                                    key={stamp.id}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-gray-200"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center shrink-0">
                                        {React.createElement(IconMap[stamp.icon] || MapPin, { size: 16, className: 'text-brand-black' })}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-brand-black truncate">{stamp.name}</p>
                                        <p className="text-[9px] text-brand-lime-dark font-bold">COMPLETED</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BadgeJourney;
