import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { STAMPS } from '../constants';
import { unlockStamp, isStampUnlocked } from '../passportUtils';
import { Button } from './Button';

// MindAR CDN loaded in index.html
declare global {
    interface Window {
        MINDAR: any;
    }
}

interface ARScannerProps {
    onClose: () => void;
    onStampUnlocked: (stampId: string, newAchievements: string[]) => void;
}

type ScanState = 'loading' | 'scanning' | 'success' | 'error' | 'permission_denied';

const ARScanner: React.FC<ARScannerProps> = ({ onClose, onStampUnlocked }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mindarRef = useRef<any>(null);
    const [scanState, setScanState] = useState<ScanState>('loading');
    const [unlockedStampName, setUnlockedStampName] = useState<string>('');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Get all AR stamps with their target indices
    const arStamps = STAMPS.filter(s => s.unlockMethod === 'ar' && s.arTargetIndex !== undefined);

    const stopAR = useCallback(() => {
        try {
            if (mindarRef.current) {
                mindarRef.current.stop();
                mindarRef.current = null;
            }
        } catch (e) {
            console.error('Error stopping MindAR:', e);
        }
    }, []);

    const handleTargetFound = useCallback((targetIndex: number) => {
        const stamp = arStamps.find(s => s.arTargetIndex === targetIndex);
        if (!stamp) return;

        // Check if already unlocked
        if (isStampUnlocked(stamp.id)) {
            setUnlockedStampName(`${stamp.name}（已蓋章）`);
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 3000);
            return;
        }

        // Unlock the stamp
        const newAchievements = unlockStamp(stamp.id);
        setUnlockedStampName(stamp.name);
        setScanState('success');
        setShowSuccessAnimation(true);

        // Vibrate for haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
        }

        // Notify parent
        onStampUnlocked(stamp.id, newAchievements);

        // Stop AR after success
        setTimeout(() => {
            stopAR();
        }, 500);
    }, [arStamps, onStampUnlocked, stopAR]);

    useEffect(() => {
        let mounted = true;

        const initAR = async () => {
            // Check if MindAR is available
            if (!window.MINDAR || !window.MINDAR.IMAGE) {
                // Try loading via dynamic import
                try {
                    await loadMindARScript();
                    if (!window.MINDAR || !window.MINDAR.IMAGE) {
                        throw new Error('MindAR not loaded');
                    }
                } catch {
                    if (mounted) {
                        setErrorMessage('AR 模組載入失敗，請重新整理頁面。');
                        setScanState('error');
                    }
                    return;
                }
            }

            try {
                // Check camera permissions first
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                stream.getTracks().forEach(t => t.stop());

                if (!mounted || !videoRef.current) return;

                const mindarThree = new window.MINDAR.IMAGE.MindARThree({
                    container: containerRef.current,
                    imageTargetSrc: '/targets.mind',
                    maxTrack: 3,
                    uiLoading: 'no',
                    uiScanning: 'no',
                    uiError: 'no',
                });

                mindarRef.current = mindarThree;

                // Setup target handlers for each AR stamp
                arStamps.forEach(stamp => {
                    if (stamp.arTargetIndex === undefined) return;
                    const anchor = mindarThree.addAnchor(stamp.arTargetIndex);
                    anchor.onTargetFound = () => {
                        handleTargetFound(stamp.arTargetIndex!);
                    };
                });

                await mindarThree.start();

                if (mounted) {
                    setScanState('scanning');
                }
            } catch (err: any) {
                if (mounted) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setScanState('permission_denied');
                    } else {
                        console.error('AR init error:', err);
                        setErrorMessage(err.message || '相機啟動失敗');
                        setScanState('error');
                    }
                }
            }
        };

        initAR();

        return () => {
            mounted = false;
            stopAR();
        };
    }, [arStamps, handleTargetFound, stopAR]);

    const handleRetry = () => {
        setScanState('loading');
        setErrorMessage('');
        // Re-trigger by remounting
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                    <Camera className="text-white w-5 h-5" />
                    <span className="text-white font-bold text-sm tracking-wider">AR 探索模式</span>
                </div>
                <button
                    onClick={() => { stopAR(); onClose(); }}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                    aria-label="關閉 AR"
                >
                    <X className="text-white w-5 h-5" />
                </button>
            </div>

            {/* Camera view */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Scanning overlay */}
                {scanState === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Scan frame corners */}
                        <div className="w-64 h-64 relative">
                            <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-[#CDFF00] rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-[#CDFF00] rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-[#CDFF00] rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-[#CDFF00] rounded-br-lg" />

                            {/* Scanning line animation */}
                            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#CDFF00] to-transparent animate-scan-line" />
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {scanState === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                        <div className="w-16 h-16 border-4 border-[#CDFF00]/30 border-t-[#CDFF00] rounded-full animate-spin mb-4" />
                        <p className="text-white/80 text-sm font-medium">啟動 AR 相機中...</p>
                    </div>
                )}

                {/* Permission denied */}
                {scanState === 'permission_denied' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8">
                        <AlertCircle className="text-red-400 w-16 h-16 mb-4" />
                        <h3 className="text-white text-xl font-bold mb-2">無法存取相機</h3>
                        <p className="text-white/60 text-sm text-center mb-6 max-w-xs">
                            請在瀏覽器設定中允許相機權限，才能使用 AR 探索功能。
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleRetry}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/30 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                重試
                            </Button>
                            <Button
                                onClick={() => { stopAR(); onClose(); }}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/30 text-white"
                            >
                                返回
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {scanState === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8">
                        <AlertCircle className="text-yellow-400 w-16 h-16 mb-4" />
                        <h3 className="text-white text-xl font-bold mb-2">啟動失敗</h3>
                        <p className="text-white/60 text-sm text-center mb-6 max-w-xs">
                            {errorMessage || 'AR 功能暫時無法使用，請稍後再試。'}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleRetry}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/30 text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                重試
                            </Button>
                            <Button
                                onClick={() => { stopAR(); onClose(); }}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/30 text-white"
                            >
                                返回
                            </Button>
                        </div>
                    </div>
                )}

                {/* Success animation */}
                {showSuccessAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in z-30">
                        <div className="bg-white rounded-3xl p-8 max-w-xs w-full mx-4 shadow-2xl text-center animate-scale-in border-4 border-[#CDFF00]">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <div className="absolute inset-0 bg-[#CDFF00] rounded-full animate-ping opacity-30" />
                                <div className="relative w-20 h-20 bg-[#CDFF00] rounded-full flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-black" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 發現成功！</h3>
                            <p className="text-lg font-bold text-[#CDFF00] bg-black rounded-full px-4 py-2 inline-block mb-4">
                                {unlockedStampName}
                            </p>
                            <p className="text-gray-500 text-sm mb-6">
                                印章已蓋入你的護照中
                            </p>
                            <Button
                                onClick={() => { stopAR(); onClose(); }}
                                variant="black"
                                fullWidth
                                size="lg"
                                className="rounded-xl"
                            >
                                查看護照
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom instruction bar */}
            {scanState === 'scanning' && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-center">
                        <p className="text-white font-bold text-sm mb-1">
                            將相機對準店內的特定物件
                        </p>
                        <p className="text-white/50 text-xs">
                            菜單封面 · 桌號牌 · Kiwimu 公仔
                        </p>
                    </div>

                    {/* AR stamp progress */}
                    <div className="flex justify-center gap-3 mt-4">
                        {arStamps.filter(s => !s.isSecret).map(stamp => (
                            <div
                                key={stamp.id}
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${isStampUnlocked(stamp.id)
                                        ? 'bg-[#CDFF00] border-[#CDFF00] text-black'
                                        : 'bg-white/10 border-white/30 text-white/50'
                                    }`}
                            >
                                {isStampUnlocked(stamp.id) ? '✓' : '?'}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper to dynamically load MindAR script
function loadMindARScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="mind-ar"]')) {
            // Script tag already exists, wait a bit for it to load
            setTimeout(resolve, 1000);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MindAR'));
        document.head.appendChild(script);
    });
}

export default ARScanner;
