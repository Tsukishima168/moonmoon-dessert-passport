import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PassportState } from '../../types';

// Initialize Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Types
export interface PassportUser {
  id: string;
  line_user_id: string;
  display_name: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PassportStamp {
  id: string;
  user_id: string;
  stamp_id: string;
  source_project: string; // 'passport' | 'mbti' | 'gacha' | 'map' | 'booking'
  unlocked_at: string;
  claim_data?: Record<string, any>;
  created_at: string;
}

// ============================================
// 1. Initialize/Sync User
// ============================================
export async function initPassportUser(
  lineUserId: string,
  displayName: string,
  pictureUrl?: string
): Promise<PassportUser> {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('passport_users')
      .upsert({
        line_user_id: lineUserId,
        display_name: displayName,
        profile_picture_url: pictureUrl || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'line_user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to init passport user:', error);
    throw error;
  }
}

// ============================================
// 2. Get Passport Progress
// ============================================
export interface PassportProgress {
  stamps: PassportStamp[];
  achievements: string[];
  rewards: string[];
}

export async function getPassportProgress(userId: string): Promise<PassportProgress> {
  const client = getSupabaseClient();

  try {
    // Get stamps, achievements, rewards in parallel
    const [stampsRes, achievementsRes, rewardsRes] = await Promise.all([
      client
        .from('passport_stamps')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false }),

      client
        .from('passport_achievements')
        .select('achievement_id')
        .eq('user_id', userId),

      client
        .from('passport_rewards')
        .select('reward_id')
        .eq('user_id', userId)
    ]);

    if (stampsRes.error) throw stampsRes.error;
    if (achievementsRes.error) throw achievementsRes.error;
    if (rewardsRes.error) throw rewardsRes.error;

    return {
      stamps: stampsRes.data || [],
      achievements: (achievementsRes.data || []).map(a => a.achievement_id),
      rewards: (rewardsRes.data || []).map(r => r.reward_id)
    };
  } catch (error) {
    console.error('Failed to get passport progress:', error);
    throw error;
  }
}

// ============================================
// 3. Unlock Stamp
// ============================================
export async function unlockStamp(
  userId: string,
  stampId: string,
  sourceProject: string,
  claimData?: Record<string, any>
): Promise<{ stamp: PassportStamp; newAchievements: string[] }> {
  const client = getSupabaseClient();

  try {
    // Insert stamp (will be rejected by DB if duplicate)
    const { data: stampData, error: stampError } = await client
      .from('passport_stamps')
      .insert({
        user_id: userId,
        stamp_id: stampId,
        source_project: sourceProject,
        claim_data: claimData || {},
        unlocked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (stampError && stampError.code !== '23505') {
      // 23505 = unique violation (already exists)
      throw stampError;
    }

    const stamp = stampData || {
      id: '',
      user_id: userId,
      stamp_id: stampId,
      source_project: sourceProject,
      unlocked_at: new Date().toISOString(),
      claim_data: claimData,
      created_at: new Date().toISOString()
    };

    // Check for new achievements (call checkAchievements logic)
    const newAchievements = await checkAchievementsForUser(client, userId);

    // Log migration
    await client.from('passport_migration_log').insert({
      user_id: userId,
      action: 'stamp_claimed',
      details: { stamp_id: stampId, source_project: sourceProject }
    }).then(({ error }) => {
      if (error) console.warn('Failed to log:', error);
    });

    return { stamp, newAchievements };
  } catch (error) {
    console.error('Failed to unlock stamp:', error);
    throw error;
  }
}

// ============================================
// 4. Helper: Check Achievements
// ============================================
async function checkAchievementsForUser(client: SupabaseClient, userId: string): Promise<string[]> {
  try {
    // Get current stamps count
    const { data: stamps, error: stampsError } = await client
      .from('passport_stamps')
      .select('stamp_id')
      .eq('user_id', userId);

    if (stampsError) throw stampsError;

    const stampIds = stamps?.map(s => s.stamp_id) || [];

    // This is simplified - in production, import ACHIEVEMENTS from constants
    // and check conditions
    // For now, return empty list - will be enhanced

    return [];
  } catch (error) {
    console.error('Failed to check achievements:', error);
    return [];
  }
}

// ============================================
// 5. Redeem Reward
// ============================================
export async function redeemReward(userId: string, rewardId: string): Promise<boolean> {
  const client = getSupabaseClient();

  try {
    const { error: redeemError } = await client
      .from('passport_rewards')
      .insert({
        user_id: userId,
        reward_id: rewardId,
        redeemed_at: new Date().toISOString()
      });

    if (redeemError && redeemError.code !== '23505') {
      throw redeemError;
    }

    return true;
  } catch (error) {
    console.error('Failed to redeem reward:', error);
    return false;
  }
}

// ============================================
// 6. Migrate from LocalStorage
// ============================================
export async function migrateFromLocalStorage(
  userId: string,
  localState: PassportState
): Promise<boolean> {
  const client = getSupabaseClient();
  const deviceId = userId; // 使用 userId 兼作 deviceId，確保不同裝置登入後綁定同一人

  try {
    // 1. Migrate Stamps -> quest_completions (quest_type: seasonal)
    if (localState.unlockedStamps?.length > 0) {
      const stampPromises = localState.unlockedStamps.map(stampId =>
        client.from('quest_completions').insert({
          device_id: deviceId,
          user_id: userId,
          quest_id: stampId,
          quest_type: 'seasonal',
          quest_name: `Stamp: ${stampId}`,
          completed_at: new Date().toISOString()
        }).then(({ error }) => {
          if (error && error.code !== '23505') throw error; // ignore unique constraint
        })
      );
      await Promise.all(stampPromises);
    }

    // 2. Migrate Achievements -> quest_completions (quest_type: seasonal)
    if (localState.unlockedAchievements?.length > 0) {
      const achievementPromises = localState.unlockedAchievements.map(achievementId =>
        client.from('quest_completions').insert({
          device_id: deviceId,
          user_id: userId,
          quest_id: achievementId,
          quest_type: 'seasonal',
          quest_name: `Achievement: ${achievementId}`,
          completed_at: new Date().toISOString()
        }).then(({ error }) => {
          if (error && error.code !== '23505') throw error;
        })
      );
      await Promise.all(achievementPromises);
    }

    // 3. Migrate Points History -> point_transactions
    if (localState.pointsHistory?.length > 0) {
      const pointsPromises = localState.pointsHistory.map(history => {
        // Map history type to point_transactions action enum
        let action = 'daily_checkin';
        if (history.type.includes('gacha')) action = 'gacha_earn';
        if (history.type.includes('mbti')) action = 'mbti';
        if (history.type.includes('share')) action = 'share';
        if (history.type.includes('redeem')) action = 'redeem';

        return client.from('point_transactions').insert({
          device_id: deviceId,
          user_id: userId,
          points: history.amount,
          action: action,
          description: history.description || 'LocalStorage 遷移點數',
          source: 'passport',
          created_at: new Date(history.timestamp || Date.now()).toISOString()
        });
      });
      await Promise.all(pointsPromises);
    } else if (localState.points && localState.points > 0) {
      // Fallback如果沒有 history 但有點數餘額
      await client.from('point_transactions').insert({
        device_id: deviceId,
        user_id: userId,
        points: localState.points,
        action: 'daily_checkin',
        description: '從本地裝置轉移未同步之總點數',
        source: 'passport'
      });
    }

    // 4. Migrate lastCheckinAt -> daily_checkins
    if (localState.lastCheckinAt) {
      // Create a daily checkin for the specific date
      const checkinDate = new Date(localState.lastCheckinAt).toISOString().split('T')[0];
      await client.from('daily_checkins').insert({
        device_id: deviceId,
        user_id: userId,
        checked_in_at: checkinDate,
        streak_count: 1,
        points_earned: 1,
        created_at: new Date(localState.lastCheckinAt).toISOString()
      }).then(({ error }) => {
        if (error && error.code !== '23505') throw error;
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
    return false;
  }
}

// ============================================
// 7. Claim Stamp from Cross-Project Event
// ============================================
export type EventType = 'mbti_completed' | 'gacha_unlocked' | 'mission_complete' | 'order_success';

export async function claimStampFromEvent(
  userId: string,
  eventType: EventType,
  eventData: Record<string, any>
): Promise<{ stampId: string; newAchievements: string[] }> {
  // Map event types to stamp IDs and source projects
  const eventMap: Record<EventType, { stampId: string; source: string }> = {
    mbti_completed: { stampId: 'stamp_mbti_completed', source: 'mbti' },
    gacha_unlocked: { stampId: 'stamp_gacha_unlocked', source: 'gacha' },
    mission_complete: { stampId: 'stamp_mission_complete', source: 'map' },
    order_success: { stampId: 'stamp_order_success', source: 'booking' }
  };

  const mapping = eventMap[eventType];
  if (!mapping) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  const result = await unlockStamp(
    userId,
    mapping.stampId,
    mapping.source,
    eventData
  );

  return {
    stampId: result.stamp.stamp_id,
    newAchievements: result.newAchievements
  };
}
