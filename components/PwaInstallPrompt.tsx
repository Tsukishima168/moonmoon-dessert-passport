import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Plus, RefreshCw, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

type InstallMode = 'native' | 'ios' | 'desktopSafari';

const DISMISS_KEY = 'kiwimu_passport_pwa_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

const safeStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures in private browsing modes.
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures in private browsing modes.
    }
  },
};

const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

const getInstallEnvironment = () => {
  if (typeof window === 'undefined') {
    return { isIos: false, isDesktopSafari: false };
  }

  const userAgent = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/i.test(userAgent);

  return {
    isIos,
    isDesktopSafari: !isIos && isSafari,
  };
};

const wasRecentlyDismissed = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const dismissedAt = Number(safeStorage.get(DISMISS_KEY) || 0);
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
};

const PwaInstallPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Passport service worker registration failed:', error);
    },
  });

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMode, setInstallMode] = useState<InstallMode | null>(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay);
  const [isOffline, setIsOffline] = useState(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ));
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (isStandaloneDisplay() || wasRecentlyDismissed()) {
        return;
      }

      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallMode('native');
      setIsInstallVisible(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallVisible(false);
      setInstallPrompt(null);
      safeStorage.remove(DISMISS_KEY);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const manualInstallTimer = window.setTimeout(() => {
      if (isStandaloneDisplay() || wasRecentlyDismissed()) {
        return;
      }

      const environment = getInstallEnvironment();
      if (environment.isIos) {
        setInstallMode('ios');
        setIsInstallVisible(true);
      } else if (environment.isDesktopSafari) {
        setInstallMode('desktopSafari');
        setIsInstallVisible(true);
      }
    }, 1600);

    return () => {
      window.clearTimeout(manualInstallTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) {
      return;
    }

    setShowOfflineReady(true);
    const timer = window.setTimeout(() => {
      setShowOfflineReady(false);
      setOfflineReady(false);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  const dismissInstallPrompt = () => {
    safeStorage.set(DISMISS_KEY, String(Date.now()));
    setIsInstallVisible(false);
  };

  const installApp = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstallVisible(false);
      setInstallPrompt(null);
    }
  };

  if (isOffline) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border-2 border-brand-black bg-brand-black px-4 py-3 text-white shadow-[4px_4px_0px_#D4FF00]" role="status" aria-live="polite">
          <WifiOff className="h-4 w-4 shrink-0 text-brand-lime" />
          <p className="flex-1 text-xs font-black uppercase tracking-[0.16em]">離線模式</p>
        </div>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[28px] border-2 border-brand-black bg-white/95 p-2 pl-4 shadow-[5px_5px_0px_black] backdrop-blur-md" role="status" aria-live="polite">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-black bg-brand-lime">
            <RefreshCw className="h-5 w-5 text-brand-black" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-brand-black">Passport 有新版本</p>
            <p className="truncate text-[11px] font-bold text-brand-black/45">更新後繼續使用會員中心</p>
          </div>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-brand-black bg-brand-black px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-brand-lime" />
            更新
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-black/45 transition-colors hover:bg-brand-gray hover:text-brand-black"
            aria-label="稍後更新"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showOfflineReady) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border-2 border-brand-black bg-white px-4 py-3 text-brand-black shadow-[4px_4px_0px_black]" role="status" aria-live="polite">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="flex-1 text-xs font-black uppercase tracking-[0.16em]">已可離線開啟</p>
        </div>
      </div>
    );
  }

  if (!isInstallVisible || !installMode || isStandalone) {
    return null;
  }

  const isNativeInstall = installMode === 'native';
  const title = isNativeInstall
    ? '安裝 Passport'
    : installMode === 'ios'
      ? '加入 iPhone 主畫面'
      : '加入 Mac Dock';
  const caption = isNativeInstall
    ? '網頁與手機都可獨立開啟'
    : installMode === 'ios'
      ? '點分享，再選加入主畫面'
      : 'Safari 分享選單可加入 Dock';

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[28px] border-2 border-brand-black bg-white/95 p-2 pl-4 shadow-[5px_5px_0px_black] backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-black bg-brand-lime">
          {isNativeInstall ? (
            <Smartphone className="h-5 w-5 text-brand-black" />
          ) : (
            <Share className="h-5 w-5 text-brand-black" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-brand-black">{title}</p>
          <p className="truncate text-[11px] font-bold text-brand-black/45">{caption}</p>
        </div>
        {isNativeInstall ? (
          <button
            type="button"
            onClick={() => void installApp()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-brand-black bg-brand-black px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5"
          >
            <Download className="h-3.5 w-3.5 text-brand-lime" />
            安裝
          </button>
        ) : (
          <div className="hidden h-10 items-center gap-1.5 rounded-full border border-brand-black/10 bg-brand-gray px-3 text-[11px] font-black text-brand-black sm:inline-flex">
            <Plus className="h-3.5 w-3.5" />
            主畫面
          </div>
        )}
        <button
          type="button"
          onClick={dismissInstallPrompt}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-black/45 transition-colors hover:bg-brand-gray hover:text-brand-black"
          aria-label="關閉安裝提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
