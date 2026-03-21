-- ============================================
-- Kiwimu Passport — Profile Center MVP fields
-- 2026-03-20
-- 用途：為 shared public.profiles 補齊 Passport 會員中心 MVP 欄位
-- 執行方式：貼到 Supabase SQL Editor 執行
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_mbti_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_footprint_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS favorite_character_id TEXT,
  ADD COLUMN IF NOT EXISTS passport_title_id TEXT;

COMMENT ON COLUMN public.profiles.is_mbti_public IS 'Passport 會員中心：是否公開 MBTI / 靈魂甜點';
COMMENT ON COLUMN public.profiles.is_footprint_public IS 'Passport 會員中心：是否公開月島足跡';
COMMENT ON COLUMN public.profiles.favorite_character_id IS 'Passport 會員中心：最喜歡的 Kiwimu 角色 ID';
COMMENT ON COLUMN public.profiles.passport_title_id IS 'Passport 會員中心：系統發放的護照稱號 ID';

UPDATE public.profiles
SET passport_title_id = 'locked'
WHERE passport_title_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN passport_title_id SET DEFAULT 'locked';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_favorite_character_id_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_favorite_character_id_check
      CHECK (
        favorite_character_id IS NULL
        OR favorite_character_id IN (
          'kiwimu',
          'bascat',
          'sugrana',
          'caramoon',
          'eggle',
          'gully',
          'saltme',
          'sugarwe'
        )
      );
  END IF;
END
$$;

-- 驗證查詢
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'profiles'
--   AND column_name IN (
--     'is_mbti_public',
--     'is_footprint_public',
--     'favorite_character_id',
--     'passport_title_id'
--   );
