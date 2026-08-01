-- ============================================================
-- Migration: 005_bookings_rooms_rls
-- Date: 2026-07-30
-- Purpose: Add UPDATE policy for bookings (owner approve/reject),
--          and full RLS policies for rooms table (was missing)
-- ============================================================

-- ---------------------------------------------------
-- 1. BOOKINGS — UPDATE policy for owner
-- ---------------------------------------------------
-- Owner dapat mengupdate status booking untuk properti mereka
-- bookings.room_id → rooms.id → rooms.kos_id → kos.owner_id
CREATE POLICY "bookings_update_owner" ON bookings
  FOR UPDATE
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE kos_id IN (
        SELECT id FROM kos WHERE owner_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------
-- 2. BOOKINGS — INSERT policy for student
-- ---------------------------------------------------
-- Student dapat membuat booking (insert) untuk diri sendiri
CREATE POLICY "bookings_insert_student" ON bookings
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- ---------------------------------------------------
-- 3. BOOKINGS — DELETE policy for admin
-- ---------------------------------------------------
-- Admin dapat menghapus booking
CREATE POLICY "bookings_delete_admin" ON bookings
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------
-- 4. ROOMS — SELECT policy (public, same as kos public read)
-- ---------------------------------------------------
-- Siapa pun bisa melihat daftar kamar
CREATE POLICY "rooms_select_public" ON rooms
  FOR SELECT
  USING (true);

-- ---------------------------------------------------
-- 5. ROOMS — INSERT policy (owner only)
-- ---------------------------------------------------
-- Owner dapat menambah kamar untuk kos milik mereka
CREATE POLICY "rooms_insert_owner" ON rooms
  FOR INSERT
  WITH CHECK (
    kos_id IN (
      SELECT id FROM kos WHERE owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------
-- 6. ROOMS — UPDATE policy (owner only)
-- ---------------------------------------------------
-- Owner dapat mengupdate kamar miliknya
CREATE POLICY "rooms_update_owner" ON rooms
  FOR UPDATE
  USING (
    kos_id IN (
      SELECT id FROM kos WHERE owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------
-- 7. ROOMS — DELETE policy (owner only)
-- ---------------------------------------------------
-- Owner dapat menghapus kamar miliknya
CREATE POLICY "rooms_delete_owner" ON rooms
  FOR DELETE
  USING (
    kos_id IN (
      SELECT id FROM kos WHERE owner_id = auth.uid()
    )
  );
