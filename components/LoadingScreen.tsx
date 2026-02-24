import React from 'react';
import { BRANDING } from '../constants';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8">
            {/* Brand Logo - Center Area */}
            <div className="relative mb-8 animate-float">
                <div className="absolute -inset-4 bg-brand-lime/20 rounded-full blur-2xl animate-pulse" />
                <img
                    src={BRANDING.STANDARDIZED_CHINESE_LOGO}
                    alt="月島甜點店"
                    className="relative w-48 h-auto object-contain"
                />
            </div>

            {/* Progress Indicator */}
            <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full border border-brand-black overflow-hidden relative">
                <div className="absolute inset-0 bg-brand-lime animate-loading-bar" />
            </div>

            {/* Loading Status */}
            <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-brand-black animate-pulse">
                    Loading Island
                </p>
                <span className="text-[8px] font-bold text-gray-400">
                    Powered by Kiwimu
                </span>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-10">
                <p className="text-[60px] font-black text-brand-gray/20 select-none whitespace-nowrap">
                    MOONMOON
                </p>
            </div>
        </div>
    );
};

export default LoadingScreen;
