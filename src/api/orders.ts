import { supabase } from '../lib/supabase';

export interface ShopOrderItem {
  id?: string;
  name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

export interface ShopOrderRecord {
  order_id: string;
  status: string;
  pickup_time: string;
  created_at: string;
  final_price?: number | null;
  total_price?: number | null;
  payment_method?: string | null;
  linepay_transaction_id?: string | null;
  items: ShopOrderItem[];
}

export async function getUserShopOrders(userId: string): Promise<ShopOrderRecord[]> {
  if (!supabase) {
    throw new Error('Supabase 未設定，無法讀取訂單紀錄');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, status, pickup_time, created_at, final_price, total_price, payment_method, linepay_transaction_id, items')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data || []) as ShopOrderRecord[];
}
