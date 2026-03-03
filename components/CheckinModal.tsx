/**
 * CheckinModal.tsx — 每日簽到日曆 Modal
 * 
 * 功能：
 * - 本月日曆視覺化（綠點/印章標記已簽到日期）
 * - 連簽天數統計
 * - 里程碑提示（7 / 30 / 100 天）
 * - 簽到成功后的動畫效果
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Flame, Trophy, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { getPassportState, canCheckinToday, performDailyCheckin } from '../passportUtils';
import { addPoints } from '../src/api/points';
import { useLiff } from '../src/contexts/LiffContext';

interface CheckinModalProps {
    onClose: () => void;
    onCheckinComplete?: (points: number) => void;
}

interface CalendarDay {
    day: number;
    isCheckedIn: boolean;
    isToday: boolean;
    isCurrentMonth: boolean;
}

function getMonthCalendar(): CalendarDay[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    // Get check-in dates from pointsHistory
    const state = getPassportState();
    const checkinDates = new Set<string>();
    (state.pointsHistory || [])
        .filter(tx => tx.type === 'daily_checkin')
        .forEach(tx => {
            const d = new Date(tx.timestamp);
            if (d.getFullYear() === year && d.getMonth() === month) {
                checkinDates.add(d.getDate().toString());
            }
        });

    // Also check lastCheckinAt for today
    if (state.lastCheckinAt) {
        const lastDate = new Date(state.lastCheckinAt);
        if (lastDate.getFullYear() === year && lastDate.getMonth() === month) {
            checkinDates.add(lastDate.getDate().toString());
        }
    }

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendar: CalendarDay[] = [];

    // Padding before first day
    for (let i = 0; i < firstDay; i++) {
        calendar.push({ day: 0, isCheckedIn: false, isToday: false, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        calendar.push({
            day: d,
            isCheckedIn: checkinDates.has(d.toString()),
            isToday: d === today,
            isCurrentMonth: true,
        });
    }

    return calendar;
}

function getStreak(): number {
    const state = getPassportState();
    if (!state.pointsHistory) return 0;

    const now = new Date();
    let streak = 0;
    let checkDate = new Date(now);

    const checkedDayStrings = new Set(
        state.pointsHistory
            .filter(tx => tx.type === 'daily_checkin')
            .map(tx => {
                const d = new Date(tx.timestamp);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
    );

    // Also add lastCheckinAt
    if (state.lastCheckinAt) {
        const d = new Date(state.lastCheckinAt);
        checkedDayStrings.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }

    for (let i = 0; i < 365; i++) {
        const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (checkedDayStrings.has(key)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

const MILESTONES = [
    { days: 7, label: '週冠軍', emoji: '🥇' },
    { days: 14, label: '半月達人', emoji: '🌟' },
    { days: 30, label: '月島守護者', emoji: '🏆' },
    { days: 100, label: '傳說月靈', emoji: '👑' },
];

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const CheckinModal: React.FC<CheckinModalProps> = ({ onClose, onCheckinComplete }) => {
    const { profile } = useLiff();
    const [canCheckin, setCanCheckin] = useState(canCheckinToday());
    const [checking, setChecking] = useState(false);
    const [justCheckedIn, setJustCheckedIn] = useState(false);
    const [pointsAwarded, setPointsAwarded] = useState(0);
    const [calendar, setCalendar] = useState<CalendarDay[]>(getMonthCalendar());
    const [streak, setStreak] = useState(getStreak());
    const [showConfetti, setShowConfetti] = useState(false);

    const now = new Date();
    const monthLabel = MONTH_NAMES[now.getMonth()];
    const nextMilestone = MILESTONES.find(m => m.days > streak);
    const daysToNextMilestone = nextMilestone ? nextMilestone.days - streak : 0;

    const handleCheckin = useCallback(async () => {
        if (!canCheckin || checking) return;
        setChecking(true);

        try {
            const points = performDailyCheckin();

            // Sync to Supabase if logged in
            if (profile?.userId && points > 0) {
                await addPoints(profile.userId, points, '每日簽到獎勵').catch(err =>
                    console.warn('[CheckinModal] Supabase sync failed:', err)
                );
            }

            // Update UI
            setJustCheckedIn(true);
            setCanCheckin(false);
            setPointsAwarded(points || 10);
            setCalendar(getMonthCalendar());
            setStreak(getStreak());
            setShowConfetti(true);
            onCheckinComplete?.(points || 10);

            // Hide confetti after animation
            setTimeout(() => setShowConfetti(false), 2500);
        } catch (err) {
            console.error('[CheckinModal] Checkin failed:', err);
        } finally {
            setChecking(false);
        }
    }, [canCheckin, checking, profile, onCheckinComplete]);

    // Listen for external checkin events (e.g. from BadgeJourney)
    useEffect(() => {
        const handler = () => {
            setCanCheckin(false);
            setCalendar(getMonthCalendar());
            setStreak(getStreak());
        };
        document.addEventListener('daily-checkin', handler);
        return () => document.removeEventListener('daily-checkin', handler);
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Confetti shimmer */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-[10000] flex items-center justify-center">
                    <div className="text-6xl animate-bounce">🎉</div>
                </div>
            )}

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="bg-brand-black text-white px-5 pt-5 pb-4 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={14} />
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar size={18} className="text-brand-lime" />
                        <span className="text-xs font-bold tracking-widest text-brand-lime uppercase">Daily Check-in</span>
                    </div>
                    <h2 className="text-xl font-bold">{now.getFullYear()} {monthLabel}</h2>

                    {/* Streak counter */}
                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-sm font-bold">{streak} 天連簽</span>
                        </div>
                        {nextMilestone && (
                            <span className="text-xs text-white/60">
                                距離 {nextMilestone.emoji} {nextMilestone.label} 還剩 {daysToNextMilestone} 天
                            </span>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="px-4 pt-4 pb-2">
                    {/* Day labels */}
                    <div className="grid grid-cols-7 mb-1">
                        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {calendar.map((cell, idx) => (
                            <div key={idx} className="flex items-center justify-center aspect-square">
                                {cell.isCurrentMonth ? (
                                    <div className={`
                                        relative w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all
                                        ${cell.isToday
                                            ? 'ring-2 ring-brand-black ring-offset-1'
                                            : ''}
                                        ${cell.isCheckedIn
                                            ? 'bg-brand-lime text-brand-black shadow-sm'
                                            : cell.isToday
                                                ? 'bg-brand-black/5 text-brand-black'
                                                : 'text-gray-400'
                                        }
                                    `}>
                                        {cell.isCheckedIn ? (
                                            <CheckCircle size={16} className="text-brand-black" />
                                        ) : (
                                            cell.day
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-8 h-8" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Milestones Row */}
                <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
                    {MILESTONES.map(m => (
                        <div
                            key={m.days}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                                ${streak >= m.days
                                    ? 'bg-brand-lime border-brand-black text-brand-black'
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                                }`}
                        >
                            <span>{m.emoji}</span>
                            <span>{m.days}天</span>
                            {streak >= m.days && <CheckCircle size={10} />}
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="px-4 pb-5">
                    {justCheckedIn ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-brand-lime rounded-2xl border-2 border-brand-black shadow-[3px_3px_0px_black]">
                            <Sparkles size={18} className="text-brand-black" />
                            <span className="font-bold text-brand-black">+{pointsAwarded}P 領取成功！</span>
                            <span className="text-sm text-brand-black/60">明天再來～</span>
                        </div>
                    ) : canCheckin ? (
                        <button
                            onClick={handleCheckin}
                            disabled={checking}
                            className="w-full py-3.5 bg-brand-black text-white rounded-2xl font-bold text-sm border-2 border-brand-black shadow-[4px_4px_0px_rgba(212,255,0,0.6)] hover:shadow-[2px_2px_0px_rgba(212,255,0,0.6)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            {checking ? (
                                <span className="animate-spin text-brand-lime">⊙</span>
                            ) : (
                                <>
                                    <Calendar size={16} className="text-brand-lime" />
                                    今日簽到，領取積分 🪙
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="text-center py-3 text-sm text-gray-400 font-medium">
                            ✅ 今日已簽到，明天見！
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-brand-lime border border-brand-black/20" />
                            <span>已簽到</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded ring-1 ring-brand-black bg-white" />
                            <span>今日</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckinModal;
