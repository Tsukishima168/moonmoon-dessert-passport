/**
 * LINE LIFF SDK 的延後載入入口（SDK 約 34 KB gzip，不進首屏）。
 * 全站只能從這裡載入 SDK：任何地方靜態 `import ... from '@line/liff'` 都會讓它回到首屏，
 * vite.config.ts 的 guard-liff-lazy-loading 會在 build 時擋下。
 */
export type LiffSdk = typeof import('@line/liff').default;

let sdk: LiffSdk | null = null;
let pending: Promise<LiffSdk> | null = null;

/** 已載入完成的 SDK；還沒載入時回 null（不會觸發載入）。 */
export const getLoadedLiff = (): LiffSdk | null => sdk;

/** 載入 SDK（只會發一次請求；失敗時清掉快取，下次可重試）。 */
export const loadLiff = (): Promise<LiffSdk> => {
    if (sdk) return Promise.resolve(sdk);
    if (!pending) {
        pending = import('@line/liff')
            .then((mod) => {
                sdk = mod.default;
                return sdk;
            })
            .catch((err) => {
                pending = null;
                throw err;
            });
    }
    return pending;
};
