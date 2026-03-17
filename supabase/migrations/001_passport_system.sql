-- ============================================
-- Kiwimu Passport System — Supabase Migration
-- passport.kiwimu.com
-- 執行順序：直接在 Supabase SQL Editor 整份貼上執行
-- ============================================

-- ────────────────────────────────────────────
-- 0. Cleanup（冪等：允許重複執行）
-- ────────────────────────────────────────────

DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS passports CASCADE;
DROP TYPE IF EXISTS reward_type CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP TYPE IF EXISTS passport_status CASCADE;
DROP TYPE IF EXISTS contact_type CASCADE;

-- ────────────────────────────────────────────
-- 1. ENUM Types
-- ────────────────────────────────────────────

CREATE TYPE contact_type AS ENUM ('line', 'ig');
CREATE TYPE passport_status AS ENUM ('active', 'suspended');
CREATE TYPE invitation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE reward_type AS ENUM ('pudding', 'discount_50', 'discount_100', 'priority_reservation');

-- ────────────────────────────────────────────
-- 2. passports（護照主表）
-- ────────────────────────────────────────────

CREATE TABLE passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_number INT NOT NULL UNIQUE CHECK (passport_number BETWEEN 1 AND 100),
  holder_name TEXT NOT NULL,
  holder_contact TEXT NOT NULL,
  contact_type contact_type NOT NULL,
  status passport_status NOT NULL DEFAULT 'active',
  invite_slots_total INT NOT NULL DEFAULT 3,
  invite_slots_used INT NOT NULL DEFAULT 0 CHECK (invite_slots_used >= 0 AND invite_slots_used <= invite_slots_total),
  pudding_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  -- 綁定 Supabase Auth（nullable，未來綁定用）
  -- 不加 FK constraint，避免 SQL Editor 權限問題
  user_id UUID
);

-- Index for user_id lookup (RLS 會用到)
CREATE INDEX idx_passports_user_id ON passports(user_id);

-- ────────────────────────────────────────────
-- 3. invitations（邀請流程表）
-- ────────────────────────────────────────────

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  invitee_contact TEXT NOT NULL,
  invitee_contact_type contact_type NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  auto_approved_reason TEXT CHECK (
    auto_approved_reason IS NULL
    OR auto_approved_reason IN ('line_subscriber', 'public_ig', 'trusted_referral', 'manual')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX idx_invitations_passport ON invitations(from_passport_id);

-- ────────────────────────────────────────────
-- 4. redemptions（兌換紀錄表）
-- ────────────────────────────────────────────

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  reward_type reward_type NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX idx_redemptions_passport ON redemptions(passport_id);

-- ────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────

ALTER TABLE passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- passports: 持有人只能看自己的護照
CREATE POLICY "passport_select_own" ON passports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "passport_update_own" ON passports
  FOR UPDATE USING (auth.uid() = user_id);

-- invitations: 持有人只能看自己發出的邀請
CREATE POLICY "invitation_select_own" ON invitations
  FOR SELECT USING (
    from_passport_id IN (
      SELECT id FROM passports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "invitation_insert_own" ON invitations
  FOR INSERT WITH CHECK (
    from_passport_id IN (
      SELECT id FROM passports WHERE user_id = auth.uid()
    )
  );

-- redemptions: 持有人只能看自己的兌換紀錄
CREATE POLICY "redemption_select_own" ON redemptions
  FOR SELECT USING (
    passport_id IN (
      SELECT id FROM passports WHERE user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────
-- 6. Function: 更新 invite_slots_used
--    當 invitations 中 approved 數量變動時，
--    同步更新對應 passport 的 invite_slots_used
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_invite_slots()
RETURNS TRIGGER AS $$
DECLARE
  approved_count INT;
  target_passport_id UUID;
BEGIN
  -- 取得被影響的 passport_id
  target_passport_id := COALESCE(NEW.from_passport_id, OLD.from_passport_id);

  -- 計算該護照的 approved 邀請數
  SELECT COUNT(*) INTO approved_count
  FROM invitations
  WHERE from_passport_id = target_passport_id
    AND status = 'approved';

  -- 更新 invite_slots_used
  UPDATE passports
  SET invite_slots_used = approved_count
  WHERE id = target_passport_id;

  -- 當 approved 數量達到 3 且尚未領取布丁 → 標記可領取
  -- （這裡不自動設為 true，而是保留讓前端/店員手動確認）
  -- 如果需要自動觸發，取消下方註解：
  -- IF approved_count >= 3 THEN
  --   UPDATE passports
  --   SET pudding_claimed = TRUE
  --   WHERE id = target_passport_id AND pudding_claimed = FALSE;
  -- END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: 邀請狀態變更時自動更新
CREATE TRIGGER trg_update_invite_slots
AFTER INSERT OR UPDATE OF status OR DELETE
ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_invite_slots();

-- ────────────────────────────────────────────
-- 7. Helper Function: 檢查護照是否已集滿邀請
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_pudding_eligible(p_passport_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  slots_used INT;
  already_claimed BOOLEAN;
BEGIN
  SELECT invite_slots_used, pudding_claimed
  INTO slots_used, already_claimed
  FROM passports
  WHERE id = p_passport_id;

  RETURN (slots_used >= 3 AND NOT already_claimed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 8. Seed: 第一筆資料 — Passport #001
-- ────────────────────────────────────────────

INSERT INTO passports (passport_number, holder_name, holder_contact, contact_type, status)
VALUES (1, 'Penso', 'penso', 'ig', 'active');

-- ============================================
-- 驗證查詢（執行完 migration 後跑這些確認）
-- ============================================

-- 確認 #001 建立成功
-- SELECT * FROM passports WHERE passport_number = 1;

-- 確認三張表都存在
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('passports', 'invitations', 'redemptions');

-- 確認 RLS 已啟用
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('passports', 'invitations', 'redemptions');
