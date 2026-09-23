/**
 * CheckinCard.tsx — 每日簽到入口卡片（輕量）
 * 
 * 放置位置：PassportScreen journey tab 最頂部（或 MemberHub 頂部）
 * 點擊後開啟 CheckinModal（完整日曆）
 */

import React from 'react';
import { Calendar, Flame, ChevronRight, CheckCircle } from 'lucide-react';

interface CheckinCardProps {
    onOpen: () => void;
    canCheckin: boolean;
    streak: number;
    requiresLogin?: boolean;
    disabled?: boolean;
    disabledMessage?: string;
}

const CheckinCard: React.FC<CheckinCardProps> = ({
    onOpen,
    canCheckin,
    streak,
    requiresLogin = false,
    disabled = false,
    disabledMessage = '正式簽到暫時無法確認',
}) => {
    return (
        <button
            onClick={onOpen}
            disabled={disabled}
            className={`
                w-full rounded-2xl p-4 border-2 border-brand-black shadow-[4px_4px_0px_black]
                flex items-center justify-between
                transition-all active:translate-y-0.5 active:shadow-[2px_2px_0px_black]
                disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none
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
                        {requiresLogin
                            ? '登入後由伺服器確認簽到資格'
                            : disabled
                            ? disabledMessage
                            : canCheckin
                            ? '打開護照，領今日積分'
                            : '今日已完成，明天再來'
                        }
                    </p>
                </div>
            </div>

            {/* Right: CTA / Status */}
            <div className="flex items-center gap-1.5">
                {requiresLogin ? (
                    <span className="text-xs font-bold text-brand-black bg-white/70 rounded-lg px-2.5 py-1 border border-brand-black/10">
                        登入簽到
                    </span>
                ) : disabled ? (
                    <span className="text-xs font-bold text-gray-400">
                        尚未開放
                    </span>
                ) : canCheckin ? (
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
