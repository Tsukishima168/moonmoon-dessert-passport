/**
 * CheckinCard.tsx — 每日簽到入口卡片（輕量）
 * 
 * 放置位置：PassportScreen journey tab 最頂部（或 MemberHub 頂部）
 * 點擊後開啟 CheckinModal（完整日曆）
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Flame, ChevronRight, CheckCircle } from 'lucide-react';
import { canCheckinToday, getPassportState } from '../passportUtils';

interface CheckinCardProps {
    onOpen: () => void;
}

function getStreakCount(): number {
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

const CheckinCard: React.FC<CheckinCardProps> = ({ onOpen }) => {
    const [canCheckin, setCanCheckin] = useState(canCheckinToday());
    const [streak, setStreak] = useState(getStreakCount());

    // Listen for check-in events (dispatched by performDailyCheckin)
    useEffect(() => {
        const handler = () => {
            setCanCheckin(false);
            setStreak(getStreakCount());
        };
        document.addEventListener('daily-checkin', handler);
        return () => document.removeEventListener('daily-checkin', handler);
    }, []);

    return (
        <button
            onClick={onOpen}
            className={`
                w-full rounded-2xl p-4 border-2 border-brand-black shadow-[4px_4px_0px_black]
                flex items-center justify-between
                transition-all active:translate-y-0.5 active:shadow-[2px_2px_0px_black]
                ${canCheckin
                    ? 'bg-brand-lime hover:bg-brand-lime/90'
                    : 'bg-white hover:bg-gray-50'
                }
            `}
        >
            {/* Left: Icon + Info */}
            <div className="flex items-center gap-3">
                <div className={`
                    w-10 h-10 rounded-xl border-2 border-brand-black flex items-center justify-center bg-white shadow-[2px_2px_0px_black]
                    ${canCheckin ? 'animate-bounce' : ''}
                `}>
                    {canCheckin
                        ? <Calendar size={20} className="text-brand-black" />
                        : <CheckCircle size={20} className="text-brand-lime-dark" />
                    }
                </div>

                <div className="text-left">
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-brand-black">每日簽到</h3>
                        {streak > 0 && (
                            <div className="flex items-center gap-0.5 bg-brand-black/10 rounded-full px-2 py-0.5">
                                <Flame size={10} className="text-orange-500" />
                                <span className="text-[9px] font-bold text-brand-black">{streak}連</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        {canCheckin
                            ? '打開護照，領今日積分 🪙'
                            : '今日已完成，明天再來'
                        }
                    </p>
                </div>
            </div>

            {/* Right: CTA / Status */}
            <div className="flex items-center gap-1.5">
                {canCheckin ? (
                    <span className="text-xs font-bold text-brand-black bg-white/70 rounded-lg px-2.5 py-1 border border-brand-black/10">
                        點此簽到
                    </span>
                ) : (
                    <span className="text-xs font-bold text-gray-400">
                        查看日曆
                    </span>
                )}
                <ChevronRight size={14} className="text-brand-black/40" />
            </div>
        </button>
    );
};

export default CheckinCard;
