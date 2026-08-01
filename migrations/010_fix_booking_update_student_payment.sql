-- ============================================================
-- Migration: 010_fix_booking_update_student_payment
-- Date: 2026-08-01
-- Purpose: Student harus bisa meng-update payment fields
--          (payment_proof_path, payment_note, payment_status)
--          pada booking miliknya sendiri — untuk submit bukti
--          transfer. Sebelumnya hanya owner yang bisa update.
--
-- SECURITY: Policy ini dibatasi kolom payment_* saja (via
--           pg_column_is_updatable tidak cukup, gunakan trigger
--           atau kolom check). UPDATE status tetap owner/admin only.
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. POLICY: student update booking sendiri
--    Hanya kolom payment_* yang boleh diubah
-- ---------------------------------------------------
DROP POLICY IF EXISTS "bookings_update_student_payment" ON bookings;
CREATE POLICY "bookings_update_student_payment" ON bookings
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ---------------------------------------------------
-- 2. TRIGGER: blokir perubahan kolom non-payment oleh student
--    (status, room_id, student_id, dll hanya owner/admin)
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_student_payment_only()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya jalankan saat user adalah student (bukan admin/owner)
  -- Owner punya policy sendiri, admin bypass.
  IF auth.uid() = OLD.student_id
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM rooms r JOIN kos k ON k.id = r.kos_id
       WHERE r.id = OLD.room_id AND k.owner_id = auth.uid()
     )
  THEN
    -- Kolom yang BOLEH diubah student: payment_proof_path, payment_note, payment_status
    IF NEW.payment_proof_path IS DISTINCT FROM OLD.payment_proof_path
       OR NEW.payment_note IS DISTINCT FROM OLD.payment_note
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    THEN
      -- Pastikan TIDAK ada kolom lain yang berubah
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.room_id IS DISTINCT FROM OLD.room_id
         OR NEW.student_id IS DISTINCT FROM OLD.student_id
         OR NEW.move_in_date IS DISTINCT FROM OLD.move_in_date
         OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
         OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
         OR NEW.base_monthly_price IS DISTINCT FROM OLD.base_monthly_price
         OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
         OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
         OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
         OR NEW.notes IS DISTINCT FROM OLD.notes
         OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
      THEN
        RAISE EXCEPTION 'Student hanya boleh mengubah kolom payment (payment_proof_path, payment_note, payment_status)';
      END IF;
    ELSE
      RAISE EXCEPTION 'Student tidak boleh mengubah booking ini';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_payment_only ON bookings;
CREATE TRIGGER trg_student_payment_only
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_student_payment_only();

-- ---------------------------------------------------
-- 3. BOOKINGS — student update payment fields
--    (idempotent: DROP dulu supaya bisa di-run ulang)
-- ---------------------------------------------------
DROP POLICY IF EXISTS "bookings_update_student_payment" ON bookings;
CREATE POLICY "bookings_update_student_payment" ON bookings
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ---------------------------------------------------
-- 4. KOS — admin insert/delete (idempotent)
-- ---------------------------------------------------
DROP POLICY IF EXISTS "kos_insert_admin" ON kos;
CREATE POLICY "kos_insert_admin" ON kos
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "kos_delete_admin" ON kos;
CREATE POLICY "kos_delete_admin" ON kos
  FOR DELETE USING (public.is_admin());

-- ---------------------------------------------------
-- 5. KOS — owner insert (BUGFIX: /owner/kos/new gagal!)
-- ---------------------------------------------------
DROP POLICY IF EXISTS "kos_insert_owner" ON kos;
CREATE POLICY "kos_insert_owner" ON kos
  FOR INSERT WITH CHECK (owner_id = auth.uid());

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;
