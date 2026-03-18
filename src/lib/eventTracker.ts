/**
 * eventTracker.ts — Supabase user_events 寫入工具
 * fire-and-forget，失敗只 log，不影響主流程
 */
import { supabase } from './supabase';

type EventType =
  | 'stamp_earned'
  | 'reward_redeemed'
  | 'passport_visited'
  | 'quiz_completed'
  | 'gacha_played'
  | 'map_checkin'
  | 'order_placed';

export function trackUserEvent(
  eventType: EventType,
  metadata: Record<string, unknown> = {}
): void {
  if (!supabase) return;

  supabase
    .rpc('insert_user_event', {
      p_event_type: eventType,
      p_site: 'passport',
      p_metadata: metadata,
    })
    .then(({ error }) => {
      if (error) console.warn('[eventTracker] insert failed:', error.message);
    });
}
