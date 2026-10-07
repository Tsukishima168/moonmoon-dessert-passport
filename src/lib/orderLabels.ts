// 訂單狀態／來源的顯示文案與樣式，ShopOrderHistory 與 PassportHomeDashboard 共用。
// 此檔刻意只用 `import type`（編譯後零 import），讓回歸測試能直接轉譯後實跑。
import type { ShopOrderRecord } from '../api/orders';

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  confirmed: '已確認',
  preparing: '製作中',
  ready: '可取貨',
  completed: '完成',
  cancelled: '已取消',
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-[#E6E8D9] text-[#304F2F] border-[#D8D7C4]',
  // confirmed／preparing 沿用 paid 色票；ready（可取貨）維持獨立的綠色，避免製作中被誤讀成可取貨。
  confirmed: 'bg-[#E6E8D9] text-[#304F2F] border-[#D8D7C4]',
  preparing: 'bg-[#E6E8D9] text-[#304F2F] border-[#D8D7C4]',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const ORDER_STATUS_STYLE_FALLBACK = 'bg-gray-100 text-gray-700 border-gray-200';

const ORDER_SOURCE_LABEL: Record<string, string> = {
  shop: '月島甜點商店',
  map: '月島地圖',
  moon_map: '月島地圖',
};

export const ORDER_STATUS_FALLBACK_LABEL = '請向門市確認';
export const ORDER_SOURCE_FALLBACK_LABEL = '月島甜點';

// 一律用 Object.hasOwn 查表：`__proto__`、`constructor` 等原型鍵不能變成顯示值。
function lookup(table: Record<string, string>, key: unknown): string | null {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : null;
}

export function getOrderStatusLabel(status: string | null | undefined): string {
  return lookup(ORDER_STATUS_LABEL, status) ?? ORDER_STATUS_FALLBACK_LABEL;
}

export function getOrderStatusStyle(status: string | null | undefined): string {
  return lookup(ORDER_STATUS_STYLE, status) ?? ORDER_STATUS_STYLE_FALLBACK;
}

// 來源以 checkout_site（訂單成立的站）為準；source_from 在 shop 端是「站間歸因」
// （passport、gacha、mbti、direct、map…），不是來源站，所以只在 checkout_site 查不到時才退而求其次。
export function getOrderSourceLabel(
  order: Pick<ShopOrderRecord, 'checkout_site' | 'source_from'>,
): string {
  return (
    lookup(ORDER_SOURCE_LABEL, order.checkout_site) ??
    lookup(ORDER_SOURCE_LABEL, order.source_from) ??
    ORDER_SOURCE_FALLBACK_LABEL
  );
}
