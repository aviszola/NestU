-- ============================================================
-- Migration: 009_payment_proof_private_storage
-- Date: 2026-08-01
-- Purpose: Private storage for payment proofs (bukti transfer)
--   1. Add payment_proof_path column (path ke object di storage,
--      bukan public URL)
--   2. Create bucket 'bukti-transfer' as PRIVATE
--   3. RLS storage policies:
--      - SELECT/download: student pemilik booking, owner kos terkait, admin
--      - INSERT/upload: student pemilik booking (saat booking approved)
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. BOOKINGS — payment_proof_path (path storage, bukan URL publik)
-- ---------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;

COMMENT ON COLUMN bookings.payment_proof_path IS 'Path object di storage bucket bukti-transfer (privat). Akses via signed URL saja.';

-- ---------------------------------------------------
-- 2. CREATE PRIVATE BUCKET
-- ---------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-transfer', 'bukti-transfer', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- ---------------------------------------------------
-- 3. RLS STORAGE POLICIES
-- ---------------------------------------------------

-- Helper: apakah user adalah student pemilik booking untuk path tertentu
-- Path format: proof/{bookingId}/{uuid}.{ext}
CREATE OR REPLACE FUNCTION public.is_booking_student(path TEXT, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_booking_id TEXT;
BEGIN
  -- Ambil segment kedua dari path: proof/{bookingId}/...
  v_booking_id := split_part(path, '/', 2);
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE id::text = v_booking_id AND student_id = uid
  );
END;
$$;

-- Helper: apakah user adalah owner kos untuk booking di path
CREATE OR REPLACE FUNCTION public.is_booking_owner(path TEXT, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_booking_id TEXT;
BEGIN
  v_booking_id := split_part(path, '/', 2);
  RETURN EXISTS (
    SELECT 1 FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN kos k ON k.id = r.kos_id
    WHERE b.id::text = v_booking_id AND k.owner_id = uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_booking_student(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_booking_owner(TEXT, UUID) TO authenticated;

-- 3a. SELECT (download) — student pemilik, owner kos, admin
DROP POLICY IF EXISTS "proof_select_student" ON storage.objects;
CREATE POLICY "proof_select_student" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'bukti-transfer'
    AND public.is_booking_student(name, auth.uid())
  );

DROP POLICY IF EXISTS "proof_select_owner" ON storage.objects;
CREATE POLICY "proof_select_owner" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'bukti-transfer'
    AND public.is_booking_owner(name, auth.uid())
  );

DROP POLICY IF EXISTS "proof_select_admin" ON storage.objects;
CREATE POLICY "proof_select_admin" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bukti-transfer' AND public.is_admin());

-- 3b. INSERT (upload) — hanya student pemilik booking yang approved
DROP POLICY IF EXISTS "proof_insert_student" ON storage.objects;
CREATE POLICY "proof_insert_student" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'bukti-transfer'
    AND public.is_booking_student(name, auth.uid())
  );

-- 3c. UPDATE/DELETE — student pemilik (ganti bukti), owner (hapus saat hapus kos)
DROP POLICY IF EXISTS "proof_update_owner_self" ON storage.objects;
CREATE POLICY "proof_update_owner_self" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'bukti-transfer'
    AND (
      public.is_booking_student(name, auth.uid())
      OR public.is_booking_owner(name, auth.uid())
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "proof_delete_owner_self" ON storage.objects;
CREATE POLICY "proof_delete_owner_self" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'bukti-transfer'
    AND (
      public.is_booking_student(name, auth.uid())
      OR public.is_booking_owner(name, auth.uid())
      OR public.is_admin()
    )
  );

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT id, name, public FROM storage.buckets WHERE id = 'bukti-transfer';
