-- ============================================================
-- Migration: 013_fix_trigger_midtrans_fields
-- Date: 2026-08-01
-- Purpose: Trigger enforce_student_payment_only (migration 010)
--          hanya mengizinkan student mengubah payment_proof_path,
--          payment_note, payment_status. TAPI create-transaction
--          route menyimpan payment_method + midtrans_order_id +
--          midtrans_status → trigger RAISE EXCEPTION → update
--          diam-diam GAGAL → order_id tak tersimpan → webhook
--          Midtrans tak bisa match → status tak pernah berubah
--          → booking bisa dibayar berulang.
--
-- FIX: tambah kolom midtrans_* + payment_method + payment_expired_at
--      ke daftar kolom yang boleh diubah student.
--      paid_at TETAP diblokir (hanya webhook/owner yang set).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_student_payment_only()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya jalankan saat user adalah student (bukan admin/owner)
  IF auth.uid() = OLD.student_id
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM rooms r JOIN kos k ON k.id = r.kos_id
       WHERE r.id = OLD.room_id AND k.owner_id = auth.uid()
     )
  THEN
    -- Kolom yang BOLEH diubah student: payment fields (manual + midtrans)
    IF NEW.payment_proof_path IS DISTINCT FROM OLD.payment_proof_path
       OR NEW.payment_note IS DISTINCT FROM OLD.payment_note
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.midtrans_order_id IS DISTINCT FROM OLD.midtrans_order_id
       OR NEW.midtrans_transaction_id IS DISTINCT FROM OLD.midtrans_transaction_id
       OR NEW.midtrans_status IS DISTINCT FROM OLD.midtrans_status
       OR NEW.payment_expired_at IS DISTINCT FROM OLD.payment_expired_at
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
        RAISE EXCEPTION 'Student hanya boleh mengubah kolom payment (payment_proof_path, payment_note, payment_status, payment_method, midtrans_*)';
      END IF;
    ELSE
      RAISE EXCEPTION 'Student tidak boleh mengubah booking ini';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- Verify
SELECT proname FROM pg_proc WHERE proname = 'enforce_student_payment_only';
