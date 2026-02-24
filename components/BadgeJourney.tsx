import React, { useState } from 'react';
import { CheckCircle, Navigation, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { STAMPS } from '../constants';
import { Stamp } from '../types';
import { isStampUnlocked, unlockStamp, getUnlockedStampCount, getNextStampInJourney } from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';

interface BadgeJourneyProps {
    onStampUnlocked: (newAchievements: string[]) => void;
    onGpsCheckin: (stamp: Stamp) => void;
    isCheckingLocation: boolean;
}

const BadgeJourney: React.FC<BadgeJourneyProps> = ({ onStampUnlocked, onGpsCheckin, isCheckingLocation }) => {
    const [externalPending, setExternalPending] = useState<string | null>(null);
    const [showCollected, setShowCollected] = useState(false);

    const unlockedCount = getUnlockedStampCount();
    const nextStamp = getNextStampInJourney();
    const totalStamps = STAMPS.length;
    const allComplete = unlockedCount >= totalStamps;

    // Separate stamps into collected and uncollected
    const collectedStamps = STAMPS.filter(s => isStampUnlocked(s.id));
    const remainingStamps = STAMPS.filter(s => !isStampUnlocked(s.id));

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

    const handleGpsClick = (stamp: Stamp) => {
        onGpsCheckin(stamp);
    };

    return (
        <div className="space-y-4">
            {/* ─── Progress Bar ─── */}
            <div className="bg-white rounded-2xl p-4 border-2 border-brand-black shadow-[4px_4px_0px_black]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-600">收集進度</span>
                    <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-bold text-brand-black">{unlockedCount}</span>
                        <span className="text-sm text-gray-400">/</span>
                        <span className="font-mono text-lg font-bold text-gray-400">{totalStamps}</span>
                    </div>
                </div>
                <div className="relative h-3 w-full bg-gray-200 rounded-full overflow-hidden border border-brand-black">
                    <div
                        className="h-full bg-gradient-to-r from-brand-lime to-brand-lime/80 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${(unlockedCount / totalStamps) * 100}%` }}
                    />
                    {/* Milestone dots */}
                    {[3, 5, 7].map(m => (
                        <div
                            key={m}
                            className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${unlockedCount >= m ? 'bg-brand-black' : 'bg-gray-400'}`}
                            style={{ left: `${(m / totalStamps) * 100}%` }}
                        />
                    ))}
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                    {[3, 5, 7, totalStamps].map(m => (
                        <span key={m}
                            className={`text-[10px] font-bold ${unlockedCount >= m ? 'text-brand-lime-dark' : 'text-gray-400'}`}
                        >
                            {m === totalStamps ? '🎉' : m}
                        </span>
                    ))}
                </div>
            </div>

            {/* ─── Next Action (Hero Card) ─── */}
            {!allComplete && nextStamp && (
                <div className="bg-gradient-to-br from-white to-brand-lime/5 rounded-2xl p-5 border-2 border-brand-black shadow-[4px_4px_0px_black] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-brand-lime/10 rounded-bl-full" />

                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        🎯 下一步行動
                    </p>

                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-lime/20 border-2 border-brand-black flex items-center justify-center text-2xl flex-shrink-0 shadow-[2px_2px_0px_black]">
                            {nextStamp.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-brand-black mb-0.5">{nextStamp.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{nextStamp.guideHint}</p>

                            {/* GPS Stamp Button */}
                            {nextStamp.unlockMethod === 'gps' && (
                                <button
                                    onClick={() => handleGpsClick(nextStamp)}
                                    disabled={isCheckingLocation}
                                    className="w-full py-3.5 bg-gradient-to-r from-brand-lime to-brand-lime/80 text-brand-black rounded-xl font-bold text-base border-2 border-brand-black shadow-[3px_3px_0px_black] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCheckingLocation ? (
                                        <><Loader2 size={18} className="animate-spin" /> 定位中...</>
                                    ) : (
                                        <><Navigation size={18} /> {nextStamp.guideCta}</>
                                    )}
                                </button>
                            )}

                            {/* External Stamp Buttons */}
                            {nextStamp.unlockMethod === 'external' && (
                                externalPending === nextStamp.id ? (
                                    <button
                                        onClick={() => handleExternalComplete(nextStamp.id)}
                                        className="w-full py-3.5 bg-brand-black text-white rounded-xl font-bold text-base border-2 border-brand-black shadow-[3px_3px_0px_rgba(212,255,0,0.5)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 animate-pulse"
                                    >
                                        <CheckCircle size={18} /> 我完成了！
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleExternalGo(nextStamp)}
                                        className="w-full py-3.5 bg-gradient-to-r from-brand-lime to-brand-lime/80 text-brand-black rounded-xl font-bold text-base border-2 border-brand-black shadow-[3px_3px_0px_black] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={18} /> {nextStamp.guideCta}
                                    </button>
                                )
                            )}

                            {/* QR Stamp Info */}
                            {nextStamp.unlockMethod === 'qr' && (
                                <div className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm text-center border-2 border-gray-300">
                                    {nextStamp.id === 'quiz_completed'
                                        ? '完成上方甜點測驗即可自動獲得 ✨'
                                        : '掃描店內 QR Code 即可解鎖 📱'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* All Complete Celebration */}
            {allComplete && (
                <div className="bg-gradient-to-br from-brand-lime/20 to-brand-lime/5 rounded-2xl p-6 border-2 border-brand-lime shadow-[4px_4px_0px_rgba(212,255,0,0.5)] text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-brand-black mb-1">全部收集完成！</h3>
                    <p className="text-sm text-gray-600">你是月島守護者，到櫃台領取全收集獎勵吧！</p>
                </div>
            )}

            {/* ─── Upcoming Stamps (preview) ─── */}
            {remainingStamps.length > 1 && (
                <div className="bg-white/60 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-2">即將到來</p>
                    <div className="space-y-2">
                        {remainingStamps.slice(1, 4).map(stamp => (
                            <div key={stamp.id} className="flex items-center gap-3 opacity-60">
                                <span className="text-lg">{stamp.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-gray-600">{stamp.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{stamp.description}</span>
                                </div>
                            </div>
                        ))}
                        {remainingStamps.length > 4 && (
                            <p className="text-xs text-gray-400 text-center">還有 {remainingStamps.length - 4} 個等你探索...</p>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Collected Stamps (collapsible) ─── */}
            {collectedStamps.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-brand-lime/30 overflow-hidden">
                    <button
                        onClick={() => setShowCollected(!showCollected)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand-lime/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brand-black">已收集 {collectedStamps.length} 個</span>
                            <div className="flex -space-x-1">
                                {collectedStamps.slice(0, 5).map(s => (
                                    <span key={s.id} className="text-sm">{s.emoji}</span>
                                ))}
                            </div>
                        </div>
                        {showCollected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showCollected && (
                        <div className="px-4 pb-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                            {collectedStamps.map(stamp => (
                                <div
                                    key={stamp.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-brand-lime/10"
                                >
                                    <span className="text-lg">{stamp.emoji}</span>
                                    <div>
                                        <p className="text-xs font-bold text-brand-black">{stamp.name}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                            <CheckCircle size={10} className="text-brand-lime-dark" /> 已收集
                                        </p>
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
