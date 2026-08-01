-- ============================================================
-- Migration: 004_rls_policies
-- Date: 2026-07-30
-- Purpose: Apply RLS policies for profiles, bookings, kos, favorites
-- ============================================================

-- ---------------------------------------------------
-- STEP 0: Drop ALL existing policies on target tables
--          (to remove Supabase auto-generated defaults)
-- ---------------------------------------------------
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['profiles','bookings','kos','favorites'])
  LOOP
    FOR pol IN SELECT policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------
-- HELPER: is_admin() — SECURITY DEFINER
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
LANGUAGE sql
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ---------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------
-- Policy: users read own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy: admin reads all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (public.is_admin());

-- Policy: update own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ---------------------------------------------------
-- 1b. PROFILES_PUBLIC view for "show owner name on kos detail"
--      SECURITY DEFINER so it bypasses RLS on profiles table.
--      Hanya expose id, full_name, avatar_url.
-- ---------------------------------------------------
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE OR REPLACE VIEW public.profiles_public WITH (security_barrier = true) AS
  SELECT id, full_name, avatar_url
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ---------------------------------------------------
-- 2. BOOKINGS
-- ---------------------------------------------------
-- Policy: student sees own bookings
CREATE POLICY "bookings_select_own_student" ON bookings
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: owner sees bookings for their kos
-- bookings has room_id → rooms has kos_id → kos has owner_id
CREATE POLICY "bookings_select_owner" ON bookings
  FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE kos_id IN (
        SELECT id FROM kos WHERE owner_id = auth.uid()
      )
    )
  );

-- Policy: admin sees all bookings
CREATE POLICY "bookings_select_admin" ON bookings
  FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------
-- 3. KOS
-- ---------------------------------------------------
-- Policy: public read access (browsing, search, detail)
-- Owner management pages filter via .eq("owner_id") at app level
CREATE POLICY "kos_select_public" ON kos
  FOR SELECT
  USING (true);

-- Policy: owner update own kos
CREATE POLICY "kos_update_owner" ON kos
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Policy: owner delete own kos
CREATE POLICY "kos_delete_owner" ON kos
  FOR DELETE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------
-- 4. FAVORITES
-- ---------------------------------------------------
-- Note: favorites table has NO 'id' column.
-- PK is composite (student_id, kos_id).
-- Policy: student sees own favorites
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: admin sees all favorites
CREATE POLICY "favorites_select_admin" ON favorites
  FOR SELECT
  USING (public.is_admin());
