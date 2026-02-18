import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PassportState } from '../types';

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

export async function getPassportProgress(lineUserId: string): Promise<PassportProgress> {
  const client = getSupabaseClient();

  try {
    // Get user first
    const { data: userData, error: userError } = await client
      .from('passport_users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    const userId = userData.id;

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
  lineUserId: string,
  stampId: string,
  sourceProject: string,
  claimData?: Record<string, any>
): Promise<{ stamp: PassportStamp; newAchievements: string[] }> {
  const client = getSupabaseClient();

  try {
    // Get user
    const { data: userData, error: userError } = await client
      .from('passport_users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    const userId = userData.id;

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
    }).catch(err => console.warn('Failed to log:', err));

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
export async function redeemReward(lineUserId: string, rewardId: string): Promise<boolean> {
  const client = getSupabaseClient();

  try {
    const { data: userData, error: userError } = await client
      .from('passport_users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    const { error: redeemError } = await client
      .from('passport_rewards')
      .insert({
        user_id: userData.id,
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
  lineUserId: string,
  localState: PassportState
): Promise<boolean> {
  const client = getSupabaseClient();

  try {
    // Get or create user
    const user = await initPassportUser(lineUserId, '', undefined);
    const userId = user.id;

    // Migrate stamps
    const stampPromises = localState.unlockedStamps.map(stampId =>
      client.from('passport_stamps').insert({
        user_id: userId,
        stamp_id: stampId,
        source_project: 'passport', // Local stamps are from passport
        unlocked_at: new Date().toISOString(),
        claim_data: { migrated: true }
      }).catch(err => {
        if (err.code !== '23505') throw err;
      })
    );

    await Promise.all(stampPromises);

    // Migrate achievements
    const achievementPromises = localState.unlockedAchievements.map(achievementId =>
      client.from('passport_achievements').insert({
        user_id: userId,
        achievement_id: achievementId
      }).catch(err => {
        if (err.code !== '23505') throw err;
      })
    );

    await Promise.all(achievementPromises);

    // Migrate rewards
    const rewardPromises = localState.redeemedRewards.map(rewardId =>
      client.from('passport_rewards').insert({
        user_id: userId,
        reward_id: rewardId
      }).catch(err => {
        if (err.code !== '23505') throw err;
      })
    );

    await Promise.all(rewardPromises);

    // Log migration
    await client.from('passport_migration_log').insert({
      user_id: userId,
      action: 'migration_from_localstorage',
      details: {
        stamps_count: localState.unlockedStamps.length,
        achievements_count: localState.unlockedAchievements.length,
        rewards_count: localState.redeemedRewards.length
      }
    }).catch(err => console.warn('Failed to log:', err));

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
  lineUserId: string,
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
    lineUserId,
    mapping.stampId,
    mapping.source,
    eventData
  );

  return {
    stampId: result.stamp.stamp_id,
    newAchievements: result.newAchievements
  };
}
