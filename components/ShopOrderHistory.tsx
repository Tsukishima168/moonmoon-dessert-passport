import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Package2, ReceiptText, RefreshCw } from 'lucide-react';
import { LINKS } from '../constants';
import { getUserShopOrders, type ShopOrderRecord } from '../src/api/orders';

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  ready: '可取貨',
  completed: '完成',
  cancelled: '已取消',
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-sky-100 text-sky-700 border-sky-200',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: '現金',
  transfer: '轉帳',
  line_pay: 'LINE Pay',
};

interface ShopOrderHistoryProps {
  userId: string | null;
  onLogin: () => Promise<void> | void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', { hour12: false });
}

function buildItemsSummary(order: ShopOrderRecord) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return '未帶入品項';
  }

  return order.items
    .slice(0, 2)
    .map((item) => `${item.name}${item.variant_name ? `（${item.variant_name}）` : ''} ×${item.quantity}`)
    .join(' / ');
}

const ShopOrderHistory: React.FC<ShopOrderHistoryProps> = ({ userId, onLogin }) => {
  const [orders, setOrders] = useState<ShopOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const readyCount = orders.filter((order) => order.status === 'ready').length;
    const paidCount = orders.filter((order) => order.status === 'paid').length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.final_price ?? order.total_price ?? 0),
      0
    );

    return { readyCount, paidCount, totalSpent };
  }, [orders]);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const nextOrders = await getUserShopOrders(userId);
        if (!cancelled) {
          setOrders(nextOrders);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : '讀取訂單紀錄失敗');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleOpenShop = () => {
    const outboundUrl = new URL(LINKS.NAVIGATION);
    outboundUrl.pathname = '/menu';
    outboundUrl.searchParams.set('from', 'passport');
    window.open(outboundUrl.toString(), '_blank');
  };

  return (
    <section className="mb-6 rounded-3xl border-2 border-brand-black bg-white shadow-[4px_4px_0px_black] overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b-2 border-brand-black bg-brand-lime px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/70">Shop Sync</p>
          <h3 className="text-sm font-black text-brand-black uppercase">你的甜點訂單紀錄</h3>
        </div>
        {userId && (
          <button
            onClick={() => {
              setOrders([]);
              setError(null);
              setLoading(true);
              getUserShopOrders(userId)
                .then((nextOrders) => setOrders(nextOrders))
                .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : '讀取訂單紀錄失敗'))
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-1 rounded-full border border-brand-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            更新
          </button>
        )}
      </div>

      {!userId ? (
        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-dashed border-brand-black/30 bg-brand-gray/20 p-4">
            <p className="text-sm font-black text-brand-black">登入後就能同步你的 shop 訂單</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-gray-600">
              這裡會顯示你在 `shop.kiwimu.com` 的甜點訂單、取貨時間與狀態。若你先前未登入就下單，紀錄可能不會自動綁進來。
            </p>
          </div>
          <button
            onClick={() => void onLogin()}
            className="w-full rounded-2xl border-2 border-brand-black bg-brand-black px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_rgba(212,255,0,0.6)] transition-all hover:bg-gray-800"
          >
            先登入查看訂單
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm font-bold text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          正在同步你的 shop 訂單...
        </div>
      ) : error ? (
        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">目前還沒順利讀到訂單紀錄</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-red-600">{error}</p>
          </div>
          <button
            onClick={handleOpenShop}
            className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
          >
            前往甜點選單
            <ExternalLink size={13} />
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-5 text-center">
            <Package2 size={22} className="mx-auto text-brand-black/60" />
            <p className="mt-3 text-sm font-black text-brand-black">還沒有同步到你的甜點訂單</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-gray-500">
              下次在 shop 登入同一個帳號下單後，這裡就會自動累積你的消費足跡。
            </p>
          </div>
          <button
            onClick={handleOpenShop}
            className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-brand-lime px-4 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-white"
          >
            去逛甜點選單
            <ExternalLink size={13} />
          </button>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-brand-black/10 bg-brand-gray/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">累積訂單</p>
              <p className="mt-2 text-lg font-black text-brand-black">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-brand-black/10 bg-brand-gray/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">待取貨</p>
              <p className="mt-2 text-lg font-black text-brand-black">{stats.readyCount + stats.paidCount}</p>
            </div>
            <div className="rounded-2xl border border-brand-black/10 bg-brand-gray/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">累積金額</p>
              <p className="mt-2 text-lg font-black text-brand-black">${stats.totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            {orders.map((order) => {
              const price = Number(order.final_price ?? order.total_price ?? 0);
              return (
                <article
                  key={order.order_id}
                  className="rounded-2xl border-2 border-brand-black bg-white p-4 shadow-[3px_3px_0px_black]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-black/40">
                        {order.order_id}
                      </p>
                      <h4 className="mt-1 text-sm font-black text-brand-black">{buildItemsSummary(order)}</h4>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                        ORDER_STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                      <p className="font-bold uppercase tracking-wider text-gray-400">建立時間</p>
                      <p className="mt-1 font-semibold text-brand-black/80">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                      <p className="font-bold uppercase tracking-wider text-gray-400">取貨時間</p>
                      <p className="mt-1 font-semibold text-brand-black/80">{formatDateTime(order.pickup_time)}</p>
                    </div>
                    <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                      <p className="font-bold uppercase tracking-wider text-gray-400">付款方式</p>
                      <p className="mt-1 font-semibold text-brand-black/80">
                        {PAYMENT_METHOD_LABEL[order.payment_method || ''] || '未設定'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                      <p className="font-bold uppercase tracking-wider text-gray-400">訂單金額</p>
                      <p className="mt-1 font-semibold text-brand-black/80">${price.toLocaleString()}</p>
                    </div>
                  </div>

                  {order.payment_method === 'line_pay' && (
                    <div className="mt-3 rounded-xl border border-brand-black/10 bg-brand-lime/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-black/50">
                        Line Pay 交易號
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] font-semibold text-brand-black/80">
                        {order.linepay_transaction_id || '尚未回填'}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <button
            onClick={handleOpenShop}
            className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
          >
            <ReceiptText size={13} />
            前往甜點選單再下一單
          </button>
        </div>
      )}
    </section>
  );
};

export default ShopOrderHistory;
