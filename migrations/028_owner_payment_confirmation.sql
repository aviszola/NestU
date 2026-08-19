-- ============================================================
-- Migration: 028_owner_payment_confirmation.sql
-- Date: 2026-08-19
-- Purpose: Owner payment confirmation actions (manual + fallback midtrans)
--   1. Kolom payment_confirmed_at / payment_confirmed_by di bookings
--      (siapa & kapan owner mengonfirmasi pembayaran)
--   2. Trigger notifikasi saat payment_status berubah via konfirmasi manual:
--      - lunas          → notif siswa "Pembayaran dikonfirmasi, Lunas"
--      - belum_bayar    → notif siswa "Bukti transfer ditolak: {alasan}"
--        (tolak bukti TIDAK mengubah booking.status — tetap approved)
--   3. Tambal enforce_student_payment_only (019): blokir student
--      mengubah kolom payment_confirmed_* (whitelist trigger asli
--      tidak tahu kolom baru — student bisa set seenaknya).
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. KOLOM BARU
-- ---------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN bookings.payment_confirmed_at IS 'Timestamp saat owner/admin mengonfirmasi pembayaran (atau menolak bukti)';
COMMENT ON COLUMN bookings.payment_confirmed_by IS 'UUID user (owner/admin) yang mengonfirmasi/menolak pembayaran';

-- ---------------------------------------------------
-- 2. TRIGGER NOTIFIKASI — konfirmasi/tolak pembayaran manual
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_booking_payment_confirmed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id UUID;
  v_kos_name TEXT;
  v_room_no TEXT;
BEGIN
  -- Hanya saat payment_status benar-benar berubah (bukan replay update)
  IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;

  SELECT k.owner_id, k.name, r.room_number
    INTO v_owner_id, v_kos_name, v_room_no
    FROM rooms r
    JOIN kos k ON k.id = r.kos_id
    WHERE r.id = NEW.room_id;

  IF NEW.payment_status = 'lunas' AND OLD.payment_status = 'menunggu_konfirmasi' THEN
    -- Konfirmasi bukti oleh owner → siswa
    PERFORM public.notify_user(
      NEW.student_id,
      'Pembayaran dikonfirmasi',
      'Pembayaran Anda telah dikonfirmasi. Status booking: Lunas. Siap check-in!',
      '/bookings/' || NEW.id
    );
    -- Owner (pelaku) dapat konfirmasi balik
    IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.student_id THEN
      PERFORM public.notify_user(
        v_owner_id,
        'Pembayaran diterima',
        'Pembayaran untuk ' || COALESCE(v_kos_name, 'kos') || ' (Kamar ' || COALESCE(v_room_no, '-') || ') telah dikonfirmasi Lunas.',
        '/owner/bookings'
      );
    END IF;

  ELSIF NEW.payment_status = 'belum_bayar' AND OLD.payment_status = 'menunggu_konfirmasi'
        AND NEW.status = 'approved' THEN
    -- Tolak bukti → booking TETAP approved, siswa perlu upload ulang
    PERFORM public.notify_user(
      NEW.student_id,
      'Bukti transfer ditolak',
      'Bukti transfer Anda ditolak' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL THEN ': ' || NEW.rejection_reason ELSE '.' END ||
        ' Silakan unggah ulang bukti yang benar.',
      '/bookings/' || NEW.id
    );
    -- Owner (pelaku) dapat konfirmasi balik
    IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.student_id THEN
      PERFORM public.notify_user(
        v_owner_id,
        'Bukti ditolak',
        'Bukti transfer untuk ' || COALESCE(v_kos_name, 'kos') || ' (Kamar ' || COALESCE(v_room_no, '-') || ') ditolak. Siswa akan mengunggah ulang.',
        '/owner/bookings'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_payment_confirmed ON bookings;
CREATE TRIGGER trg_notify_booking_payment_confirmed
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_payment_confirmed();

-- ---------------------------------------------------
-- 3. TAMBAL enforce_student_payment_only (019)
--    Student TIDAK boleh set payment_confirmed_at/by
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_student_payment_only()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya jalankan saat user adalah student (bukan admin/owner/webhook)
  IF auth.uid() = OLD.student_id
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM rooms r JOIN kos k ON k.id = r.kos_id
       WHERE r.id = OLD.room_id AND k.owner_id = auth.uid()
     )
  THEN
    -- ── LARANGAN UTAMA: student TIDAK boleh set terminal payment states ──
    IF (NEW.payment_status IN ('lunas', 'expired')
        AND NEW.payment_status IS DISTINCT FROM OLD.payment_status)
    THEN
      RAISE EXCEPTION 'Student tidak boleh mengubah payment_status ke terminal state (lunas/expired)';
    END IF;

    -- Kolom yang BOLEH diubah student: payment_proof + note + status transisi
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
         OR NEW.payment_confirmed_at IS DISTINCT FROM OLD.payment_confirmed_at
         OR NEW.payment_confirmed_by IS DISTINCT FROM OLD.payment_confirmed_by
      THEN
        RAISE EXCEPTION 'Student hanya boleh mengubah kolom payment (payment_proof_path, payment_note, payment_status transisi, payment_method, midtrans_*)';
      END IF;
    ELSE
      RAISE EXCEPTION 'Student tidak boleh mengubah booking ini';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('payment_confirmed_at', 'payment_confirmed_by')
ORDER BY column_name;

SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'trg_notify_booking_payment_confirmed';

SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('notify_booking_payment_confirmed', 'enforce_student_payment_only')
ORDER BY p.proname;
