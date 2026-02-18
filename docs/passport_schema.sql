-- ============================================
-- Passport Supabase Schema Migration
-- ============================================
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create Tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS passport_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Stamps table (集章)
CREATE TABLE IF NOT EXISTS passport_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  stamp_id TEXT NOT NULL,
  source_project TEXT NOT NULL,  -- 'passport', 'mbti', 'gacha', 'map', 'booking'
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  claim_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, stamp_id)
);

-- Achievements table (成就)
CREATE TABLE IF NOT EXISTS passport_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Rewards table (獎勵)
CREATE TABLE IF NOT EXISTS passport_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, reward_id)
);

-- Migration log table
CREATE TABLE IF NOT EXISTS passport_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  action TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 2. Create Indexes
-- ============================================

CREATE INDEX idx_passport_users_line_user_id ON passport_users(line_user_id);
CREATE INDEX idx_passport_stamps_user_id ON passport_stamps(user_id);
CREATE INDEX idx_passport_stamps_stamp_id ON passport_stamps(stamp_id);
CREATE INDEX idx_passport_achievements_user_id ON passport_achievements(user_id);
CREATE INDEX idx_passport_rewards_user_id ON passport_rewards(user_id);

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE passport_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_migration_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies
-- ============================================

-- For public read access (you can restrict later)
CREATE POLICY "Enable read access for anon" ON passport_users
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for anon" ON passport_stamps
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for anon" ON passport_achievements
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for anon" ON passport_rewards
  FOR SELECT USING (true);

-- For inserts (passport app only)
CREATE POLICY "Enable insert for upsert" ON passport_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for stamps" ON passport_stamps
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for achievements" ON passport_achievements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for rewards" ON passport_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for migration log" ON passport_migration_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 5. Sample Data (for testing)
-- ============================================

-- INSERT INTO passport_users (line_user_id, display_name)
-- VALUES ('U1234567890', 'Test User')
-- ON CONFLICT (line_user_id) DO NOTHING;
