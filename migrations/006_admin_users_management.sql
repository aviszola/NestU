-- ============================================================
-- Migration: 006_admin_users_management
-- Date: 2026-08-01
-- Purpose: 
--   1. Add is_active column to profiles (suspend/activate accounts)
--   2. Add admin UPDATE policy for profiles (change role, suspend)
--   3. Add admin DELETE policy for notifications (cleanup)
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. PROFILES — add is_active column (default true)
-- ---------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.is_active IS 'Status akun: TRUE = aktif, FALSE = suspend';

-- Index untuk filter cepat admin
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ---------------------------------------------------
-- 2. PROFILES — admin UPDATE policy (ubah role, suspend)
-- ---------------------------------------------------
-- Admin dapat mengubah role dan is_active user lain.
-- User tetap bisa update profil sendiri (policy existing profiles_update_own).
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (public.is_admin());

-- ---------------------------------------------------
-- 3. PROFILES — admin SELECT dengan kolom lengkap
--    (policy profiles_select_admin sudah ada di migration 004)
-- ---------------------------------------------------

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
