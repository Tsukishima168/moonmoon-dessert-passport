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
    getNextStampInJourney,
} from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';

interface BadgeJourneyProps {
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

const BadgeJourney: React.FC<BadgeJourneyProps> = ({ onStampUnlocked, onGpsCheckin, isCheckingLocation, gpsDebug }) => {
    const [externalPending, setExternalPending] = useState<string | null>(null);
    const [showCollected, setShowCollected] = useState(false);
    const visibleStamps = STAMPS.filter(stamp => !stamp.isSecret);
    const unlockedCount = getUnlockedStampCount();
    const nextStamp = getNextStampInJourney();
    const totalStamps = visibleStamps.length;
    const allComplete = unlockedCount >= totalStamps;

    // Separate stamps into collected and uncollected
    const collectedStamps = STAMPS.filter(s => isStampUnlocked(s.id));

    const handleExternalGo = (stamp: Stamp) => {
        if (stamp.externalLink) {
            setExternalPending(stamp.id);
            trackEvent('stamp_external_started', { stamp_id: stamp.id });
            trackOutboundNavigation(stamp.externalLink, 'badge_journey');
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
            {/* ─── Progress Tracker ─── */}
            <div className="bg-white rounded-2xl p-4 border-2 border-brand-black shadow-[4px_4px_0px_black]">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Adventure Progress</span>
                    <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-bold text-brand-black">{unlockedCount}</span>
                        <span className="text-sm text-gray-400">/</span>
                        <span className="font-mono text-lg font-bold text-gray-400">{totalStamps}</span>
                    </div>
                </div>
                <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-brand-black">
                    <div
                        className="h-full bg-brand-lime transition-all duration-700 ease-out"
                        style={{ width: `${(unlockedCount / totalStamps) * 100}%` }}
                    />
                </div>
            </div>

            {/* ─── Next Action Card ─── */}
            {!allComplete && nextStamp && (
                <div className="bg-white rounded-2xl p-5 border-2 border-brand-black shadow-[4px_4px_0px_black] relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-lime/10 rounded-full transition-transform group-hover:scale-125" />

                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
                        Next Mission
                    </p>

                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl bg-brand-lime flex items-center justify-center border-2 border-brand-black shadow-[3px_3px_0px_black] flex-shrink-0 ${getAnimClass(nextStamp.animationType)}`}>
                            {React.createElement(IconMap[nextStamp.icon] || MapPin, { size: 32, className: 'text-brand-black' })}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-brand-black mb-1">{nextStamp.name}</h3>
                            <p className="text-xs text-gray-500 mb-4 font-medium">{nextStamp.guideHint}</p>

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

                            {nextStamp.unlockMethod === 'qr' && (
                                <div className="w-full py-2.5 bg-gray-50 text-brand-black/60 rounded-xl text-[11px] font-bold text-center border border-dashed border-gray-300">
                                    {nextStamp.id === 'quiz_completed' ? '完成甜點測驗自動解鎖' : '尋找店內 QR Code 掃描'}
                                </div>
                            )}
                        </div>
                    </div>
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
                                    <div className="w-8 h-8 rounded-lg bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center flex-shrink-0">
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
