/**
 * CheckinModal.tsx — 每日簽到日曆 Modal
 * 
 * 功能：
 * - 本月日曆視覺化（綠點/印章標記已簽到日期）
 * - 連簽天數統計
 * - 里程碑提示（7 / 30 / 100 天）
 * - 簽到成功后的動畫效果
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Flame, Trophy, Calendar, CheckCircle, Sparkles, Medal, Crown, type LucideIcon } from 'lucide-react';
import type { PassportCheckinResult } from '../src/api/economy';
import { trackEvent } from '../analytics';

interface CheckinModalProps {
    onClose: () => void;
    canCheckin: boolean;
    streak: number;
    checkedUtcDates: string[];
    onCheckin: () => Promise<PassportCheckinResult>;
    onCheckinComplete?: (result: PassportCheckinResult) => void;
}

interface CalendarDay {
    day: number;
    isCheckedIn: boolean;
    isToday: boolean;
    isCurrentMonth: boolean;
}

function getMonthCalendar(checkedUtcDates: string[]): CalendarDay[] {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const today = now.getUTCDate();
    const checkinDates = new Set(checkedUtcDates);
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const calendar: CalendarDay[] = [];

    // Padding before first day
    for (let i = 0; i < firstDay; i++) {
        calendar.push({ day: 0, isCheckedIn: false, isToday: false, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        calendar.push({
            day: d,
            isCheckedIn: checkinDates.has(
                `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            ),
            isToday: d === today,
            isCurrentMonth: true,
        });
    }

    return calendar;
}

const MILESTONES: Array<{ days: number; label: string; Icon: LucideIcon }> = [
    { days: 7, label: '週冠軍', Icon: Medal },
    { days: 14, label: '半月達人', Icon: Sparkles },
    { days: 30, label: '月島守護者', Icon: Trophy },
    { days: 100, label: '傳說月靈', Icon: Crown },
];

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const CheckinModal: React.FC<CheckinModalProps> = ({
    onClose,
    canCheckin,
    streak,
    checkedUtcDates,
    onCheckin,
    onCheckinComplete,
}) => {
    const [checking, setChecking] = useState(false);
    const [justCheckedIn, setJustCheckedIn] = useState(false);
    const [pointsAwarded, setPointsAwarded] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const calendar = useMemo(() => getMonthCalendar(checkedUtcDates), [checkedUtcDates]);

    const now = new Date();
    const monthLabel = MONTH_NAMES[now.getUTCMonth()];
    const nextMilestone = MILESTONES.find(m => m.days > streak);
    const daysToNextMilestone = nextMilestone ? nextMilestone.days - streak : 0;
    const NextMilestoneIcon = nextMilestone?.Icon;

    const handleCheckin = useCallback(async () => {
        if (!canCheckin || checking) return;
        setChecking(true);
        setErrorMessage(null);

        try {
            const result = await onCheckin();
            onCheckinComplete?.(result);

            if (!result.ok) {
                if (result.code === 'ALREADY_PROCESSED' || result.code === 'LIMIT_REACHED') {
                    setErrorMessage('今天的簽到已由伺服器確認完成。');
                } else if (result.code === 'AUTH_REQUIRED') {
                    setErrorMessage('請先登入會員帳號，再進行每日簽到。');
                } else {
                    setErrorMessage('簽到服務暫時無法確認，未變更任何正式點數。請稍後再試。');
                }
                return;
            }

            setJustCheckedIn(true);
            setPointsAwarded(result.pointsAwarded);
            setShowConfetti(true);

            trackEvent('passport_checkin', {
                location: 'daily_online',
                authority: result.source,
                points_awarded: result.pointsAwarded,
            });

            // Hide confetti after animation
            setTimeout(() => setShowConfetti(false), 2500);
        } catch (err) {
            console.error('[CheckinModal] Checkin failed:', err);
            setErrorMessage('網路連線中斷，伺服器尚未確認簽到；未變更任何正式點數。請稍後再試。');
        } finally {
            setChecking(false);
        }
    }, [canCheckin, checking, onCheckin, onCheckinComplete]);

    useEffect(() => {
        if (!canCheckin && !justCheckedIn) {
            setPointsAwarded(0);
        }
    }, [canCheckin, justCheckedIn]);

    return (
        <div
            className="fixed inset-0 z-9999 flex items-end sm:items-center justify-center"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

            {/* Confetti shimmer */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-10000 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-black/85 text-brand-lime animate-bounce shadow-2xl">
                        <Sparkles size={42} />
                    </div>
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
                    <h2 className="text-xl font-bold">{now.getUTCFullYear()} {monthLabel}</h2>

                    {/* Streak counter */}
                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-sm font-bold">{streak} 天連簽</span>
                        </div>
                        {nextMilestone && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                                {NextMilestoneIcon && <NextMilestoneIcon size={12} className="text-brand-lime" />}
                                <span>距離 {nextMilestone.label} 還剩 {daysToNextMilestone} 天</span>
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
                                            ? 'bg-brand-lime text-brand-black shadow-xs'
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
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                                ${streak >= m.days
                                    ? 'bg-brand-lime border-brand-black text-brand-black'
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                                }`}
                        >
                            <m.Icon size={12} />
                            <span>{m.days}天</span>
                            {streak >= m.days && <CheckCircle size={10} />}
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="px-4 pb-5">
                    {errorMessage && (
                        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
                            {errorMessage}
                        </div>
                    )}
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
                                    今日簽到，領取積分
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400 font-medium">
                            <CheckCircle size={16} className="text-brand-black/50" />
                            <span>今日已簽到，明天見</span>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-sm bg-brand-lime border border-brand-black/20" />
                            <span>已簽到</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-sm ring-1 ring-brand-black bg-white" />
                            <span>今日</span>
                        </div>
                    </div>
                    <p className="mt-3 text-center text-[10px] font-medium text-gray-400">
                        每日資格依伺服器 UTC 日界判定（台北時間 08:00 更新）。
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckinModal;
