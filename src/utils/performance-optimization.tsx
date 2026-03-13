// ================================================================
// 性能優化 - 代碼實施示例
// 文件：src/utils/performance-optimization.ts
// ================================================================

/**
 * 優化方案集合 - 可直接複製到項目中
 * 包含：LIFF 優化、GA4 優化、圖片優化等
 */

// ================================================================
// 1️⃣  LIFF 非阻塞初始化優化
// ================================================================

export async function initLiffWithTimeout(liffId: string, timeoutMs: number = 5000) {
  try {
    // 使用 Promise.race 設置超時
    const liffInit = Promise.race([
      liff.init({ liffId }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LIFF initialization timeout')), timeoutMs)
      )
    ]);

    await liffInit;
    console.log('[LIFF] 初始化成功');
    return true;
  } catch (err) {
    console.warn('[LIFF] 初始化失敗，使用 fallback:', err);
    return false;
  }
}

// 改進的 LiffContext Provider
export function createOptimizedLiffProvider() {
  return class LiffProvider extends React.Component {
    state = {
      liffReady: false,
      isLoggedIn: false,
      profile: null,
    };

    componentDidMount() {
      const liffId = import.meta.env.VITE_LIFF_ID;
      
      // 非阻塞初始化：不等 LIFF，先渲染 UI
      if (liffId) {
        // 後台初始化，不阻塞主線程
        this.initLiffInBackground(liffId);
      }

      // 立即標記 LIFF 就緒，UI 可以渲染
      this.setState({ liffReady: true });
    }

    private async initLiffInBackground(liffId: string) {
      try {
        // 1. 檢查 localStorage 快取
        const cachedProfile = localStorage.getItem('liff_profile_cache');
        if (cachedProfile) {
          this.setState({
            isLoggedIn: true,
            profile: JSON.parse(cachedProfile),
          });
        }

        // 2. 超時初始化（5秒）
        await initLiffWithTimeout(liffId, 5000);

        // 3. 如果登入，獲取最新 profile
        if (liff.isLoggedIn()) {
          const profile = await Promise.race([
            liff.getProfile(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('getProfile timeout')), 3000)
            )
          ]);

          const profileData = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          };

          // 快取到 localStorage
          localStorage.setItem('liff_profile_cache', JSON.stringify(profileData));

          this.setState({
            isLoggedIn: true,
            profile: profileData,
          });
        }
      } catch (err) {
        console.error('LIFF background init failed:', err);
        // Fallback：繼續使用 cached 數據或離線模式
      }
    }

    render() {
      const { liffReady, isLoggedIn, profile } = this.state;

      return (
        <LiffContext.Provider value={{ liffReady, isLoggedIn, profile }}>
          {this.props.children}
        </LiffContext.Provider>
      );
    }
  };
}

// ================================================================
// 2️⃣  GA4 非同步追蹤優化
// ================================================================

class AnalyticsQueue {
  private queue: Array<{ eventName: string; params: any }> = [];
  private isProcessing = false;

  /**
   * 添加事件到隊列
   */
  push(eventName: string, params?: Record<string, any>) {
    this.queue.push({ eventName, params: params || {} });
    this.processBatch();
  }

  /**
   * 使用 requestIdleCallback 分批處理
   */
  private processBatch() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    if ('requestIdleCallback' in window) {
      // 推薦：在瀏覽器空閒時發送
      requestIdleCallback(
        () => this.sendBatch(),
        { timeout: 2000 }  // 最多等 2 秒
      );
    } else {
      // Fallback：setTimeout
      setTimeout(() => this.sendBatch(), 0);
    }
  }

  private sendBatch() {
    const batch = this.queue.splice(0, 5);  // 一次 5 個

    batch.forEach(({ eventName, params }) => {
      try {
        if (window.gtag) {
          window.gtag('event', eventName, params);
        }
      } catch (err) {
        console.error('GA4 tracking error:', err);
      }
    });

    this.isProcessing = false;

    // 如果還有事件，繼續處理
    if (this.queue.length > 0) {
      this.processBatch();
    }
  }
}

export const analyticsQueue = new AnalyticsQueue();

/**
 * 使用方式：
 * 改成 analyticsQueue.push('button_click', { button_name: 'unlock_stamp' })
 * 不再直接調用 window.gtag，改為隊列+非同步
 */

// ================================================================
// 3️⃣  Stamp Count 事件驅動優化
// ================================================================

/**
 * 自訂事件：當印章解鎖時
 */
export function emitStampUnlockedEvent(stampId: string) {
  const event = new CustomEvent('stamp-unlocked', { 
    detail: { stampId } 
  });
  document.dispatchEvent(event);
}

/**
 * Hook：監聽印章變化，不用輪詢
 */
export function useStampCount() {
  const [stampCount, setStampCount] = React.useState(() => 
    getUnlockedStampCount()
  );

  React.useEffect(() => {
    // 監聽自訂事件
    const handleStampUnlocked = () => {
      setStampCount(getUnlockedStampCount());
    };

    // 也監聽 localStorage 變化（跨窗口同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('stamp')) {
        setStampCount(getUnlockedStampCount());
      }
    };

    document.addEventListener('stamp-unlocked', handleStampUnlocked);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('stamp-unlocked', handleStampUnlocked);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return stampCount;
}

// ================================================================
// 4️⃣  React.memo 優化
// ================================================================

/**
 * 避免不必要的重新渲染
 */
interface ButtonProps {
  variant?: 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const OptimizedButton = React.memo(
  ({ variant, size, onClick, children, className }: ButtonProps) => {
    return (
      <button
        onClick={onClick}
        className={`button button-${variant} button-${size} ${className || ''}`}
      >
        {children}
      </button>
    );
  },
  // 自訂比較函數：只比較關鍵 props
  (prevProps, nextProps) => {
    return (
      prevProps.variant === nextProps.variant &&
      prevProps.size === nextProps.size &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.className === nextProps.className &&
      prevProps.children === nextProps.children
    );
  }
);

OptimizedButton.displayName = 'OptimizedButton';

// ================================================================
// 5️⃣  圖片優化 - SVG Logo
// ================================================================

/**
 * 改用 SVG 而不是 Cloudinary 圖片
 * 將 logo 改為內嵌 SVG，節省 HTTP 請求 + CDN 延遲
 */
export const LOGO_SVG = `
<svg viewBox="0 0 300 40" xmlns="http://www.w3.org/2000/svg">
  <text x="10" y="30" font-size="28" font-weight="bold" font-family="Arial">
    月島甜點
  </text>
  <!-- 或用 data URL -->
</svg>
`;

// 在 React 中使用
export const OptimizedLogo = React.memo(() => (
  <div
    className="logo"
    dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    style={{
      width: 120,
      height: 16,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
    }}
  />
));

// ================================================================
// 6️⃣  代碼分割 - Lazy Load 屏幕（目標檔案未建立，暫時移除）
// ================================================================

// ================================================================
// 7️⃣  Web Worker - 後台處理
// ================================================================

/**
 * 如果要用 Web Worker 進一步優化 GA4
 * 創建文件：src/workers/analytics.worker.ts
 */
export const createAnalyticsWorker = () => {
  if (typeof Worker === 'undefined') return null;

  const workerCode = `
    self.onmessage = (event) => {
      const { eventName, params } = event.data;
      
      // 在 Worker 線程中調用 gtag，不影響主線程
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, params);
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  return new Worker(workerUrl);
};

// ================================================================
// 8️⃣  Cloudinary URL 最佳化
// ================================================================

export const OPTIMIZED_CLOUDINARY_URLS = {
  // 舊做法
  LOGO_OLD: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_300/v1768743629/Dessert-Chinese_u8uoxt.png',

  // 新做法：最佳化參數
  LOGO_NEW: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_auto:best,w_200,dpr_2/Dessert-Chinese.png',
  // 參數說明：
  // f_auto - 自動選擇格式（WebP > AVIF > PNG）
  // q_auto:best - 自動最佳質量
  // w_200 - 寬度（根據實際顯示調整）
  // dpr_2 - 高 DPI 設備適配

  LANDING: 'https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_auto:best,w_800,dpr_2/landing-illustration.jpg',
};

// ================================================================
// 使用總結
// ================================================================

/**
 * 集成所有優化：
 * 
 * 1. App.tsx 中替換：
 *    - import { useStampCount } from '@/utils/performance-optimization'
 *    - const stampCount = useStampCount()  // 代替原本的 useState + setInterval
 * 
 * 2. LiffContext.tsx 中替換：
 *    - 使用 initLiffWithTimeout 和 createOptimizedLiffProvider
 * 
 * 3. analytics.ts 中替換：
 *    - 使用 analyticsQueue.push() 代替 window.gtag
 * 
 * 4. App.tsx 中替換圖片：
 *    - 使用 OPTIMIZED_CLOUDINARY_URLS.LOGO_NEW
 *    - 或改用 SVG (LOGO_SVG)
 * 
 * 5. App.tsx 中拆分屏幕：
 *    - 使用 LazyLandingScreen, LazyPassportScreen
 * 
 * 6. 所有組件改用 React.memo：
 *    - export const Header = React.memo(...)
 * 
 * 預期效果：-1.8秒首屏 + 60-70% 改善
 */
