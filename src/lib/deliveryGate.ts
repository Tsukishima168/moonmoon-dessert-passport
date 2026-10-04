/**
 * 「事件送出前先別離開頁面」的小閘門。
 *
 * 問題：Passport 是五站唯一的 `sign_up`／`login` 來源，但登入完成後頁面會立刻離開——
 * SSO popup 120ms 後 window.close()，或 window.location.href 直接導回來源站；
 * 而 index.html 要等 500ms 才載入 gtag，事件在 gtag 就緒前頁面就沒了（資料庫週增 5 位會員、
 * GA4 sign_up 為 0）。
 *
 * 作法：analytics.ts 把「正在送、還沒收到 gtag event_callback」的事件註冊成 pending delivery；
 * 要關視窗／導頁的地方改呼叫 runAfterPendingDelivery(fn)——沒有 pending 就（下一個 tick）直接執行，
 * 有的話等它完成，最久 DELIVERY_MAX_WAIT_MS（1500ms），逾時照樣執行，不會卡住使用者。
 *
 * 純邏輯、零 import，讓 regression 腳本能轉譯後實跑。
 */

export const DELIVERY_MAX_WAIT_MS = 1500;

const noop = () => {};
const inFlight = new Set<Promise<void>>();

/** 註冊一個進行中的送出。傳入的 promise 成功或失敗都算「完成」（不會讓呼叫端 unhandled rejection）。 */
export function registerPendingDelivery(delivery: Promise<unknown>): void {
  const tracked: Promise<void> = delivery.then(noop, noop).then(() => {
    inFlight.delete(tracked);
  });
  inFlight.add(tracked);
}

/**
 * 等進行中的送出完成（或逾時）後才執行 run，且只執行一次。
 *
 * 一律延後一個 macrotask 再檢查：supabase-js 在 OAuth callback 會先讓 getSession() 解析
 * （我們的 handleSignedInUser 因此先跑），再用 setTimeout(0) 發 SIGNED_IN 事件（trackAuthConversion
 * 此時才註冊）。多等一個 tick，才能確保「導頁決策」發生在「事件註冊」之後。
 */
export function runAfterPendingDelivery(run: () => void, maxWaitMs: number = DELIVERY_MAX_WAIT_MS): void {
  setTimeout(() => {
    if (inFlight.size === 0) {
      run();
      return;
    }

    let ran = false;
    const go = () => {
      if (ran) return;
      ran = true;
      clearTimeout(failsafe);
      run();
    };
    const failsafe = setTimeout(go, maxWaitMs);
    Promise.all(Array.from(inFlight)).then(go, go);
  }, 0);
}
