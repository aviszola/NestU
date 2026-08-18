-- ============================================================
-- Migration: 019_block_student_lunas + gross_amount validation
-- Date: 2026-08-18
-- Purpose (2 fix dari audit lanjutan):
--   1. FRAUD: siswa bisa set payment_status='lunas' sendiri
--      (verified: rows=1, booking jadi lunas tanpa bayar).
--      Fix: trigger blokir student set payment_status ke
--      'lunas'/'expired' — status tersebut HANYA boleh diubah
--      oleh webhook secure / owner / admin.
--   2. DEFENSE IN DEPTH: validasi gross_amount di function
--      handle_midtrans_webhook_secure — cocokkan dengan
--      total_amount booking. Mismatch → tolak (tetap pending),
--      jangan tandai lunas.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Trigger: blokir student set payment_status ke terminal states
-- ------------------------------------------------------------
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
    -- 'lunas' & 'expired' hanya boleh diubah webhook secure / owner / admin
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

-- ------------------------------------------------------------
-- 2. Function secure: validasi gross_amount (defense in depth)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_midtrans_webhook_secure(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_midtrans_status TEXT,
  p_payment_status TEXT,
  p_webhook_secret TEXT,
  p_gross_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_owner_id UUID;
  v_kos_name TEXT;
  v_expected_secret TEXT;
BEGIN
  -- 1. Verifikasi shared secret — constant-time compare
  SELECT value INTO v_expected_secret
  FROM app_config
  WHERE key = 'midtrans_webhook_secret'
  LIMIT 1;

  IF v_expected_secret IS NULL OR v_expected_secret = '' THEN
    RAISE EXCEPTION 'Webhook secret belum dikonfigurasi';
  END IF;

  IF encode(digest(v_expected_secret, 'sha256'), 'hex') <>
     encode(digest(COALESCE(p_webhook_secret, ''), 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'Invalid webhook secret';
  END IF;

  -- 2. Cari booking by midtrans_order_id
  SELECT * INTO v_booking
  FROM bookings
  WHERE midtrans_order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking dengan order_id % tidak ditemukan', p_order_id;
  END IF;

  -- 3. IDEMPOTENCY: sudah lunas + status baru lunas → no-op
  IF v_booking.paid_at IS NOT NULL AND p_payment_status = 'lunas' THEN
    RETURN TRUE;
  END IF;

  -- 4. VALIDASI gross_amount (defense in depth) — kalau dikirim
  --    dan booking punya total_amount > 0, harus cocok (toleransi 1)
  IF p_gross_amount IS NOT NULL
     AND v_booking.total_amount IS NOT NULL
     AND v_booking.total_amount > 0
     AND ABS(p_gross_amount - v_booking.total_amount) > 1
  THEN
    RAISE EXCEPTION 'Gross amount mismatch: webhook % != booking % (order %)',
      p_gross_amount, v_booking.total_amount, p_order_id;
  END IF;

  -- Ambil owner kos terkait + nama kos (untuk notifikasi)
  SELECT k.owner_id, k.name INTO v_owner_id, v_kos_name
  FROM rooms r
  JOIN kos k ON k.id = r.kos_id
  WHERE r.id = v_booking.room_id;

  -- Update payment fields — HANYA ini
  UPDATE bookings SET
    payment_status = p_payment_status,
    payment_method = 'midtrans',
    midtrans_transaction_id = p_transaction_id,
    midtrans_status = p_midtrans_status,
    paid_at = CASE WHEN p_payment_status = 'lunas' THEN now() ELSE NULL END
  WHERE id = v_booking.id;

  -- Notifikasi (hanya saat status berubah, bukan replay)
  IF p_payment_status = 'lunas' THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      v_booking.student_id,
      'Pembayaran berhasil',
      'Pembayaran untuk ' || COALESCE(v_kos_name, 'kos') || ' telah dikonfirmasi. Siap check-in!',
      '/bookings'
    );
    IF v_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (
        v_owner_id,
        'Pembayaran diterima',
        'Pembayaran untuk ' || COALESCE(v_kos_name, 'kos') || ' telah lunas.',
        '/owner/bookings'
      );
    END IF;
  ELSIF p_payment_status = 'menunggu_konfirmasi' THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      v_booking.student_id,
      'Menunggu pembayaran',
      'Transaksi untuk ' || COALESCE(v_kos_name, 'kos') || ' menunggu pembayaran Anda.',
      '/bookings'
    );
  ELSIF p_payment_status = 'expired' THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      v_booking.student_id,
      'Pembayaran kedaluwarsa',
      'Transaksi untuk ' || COALESCE(v_kos_name, 'kos') || ' telah kedaluwarsa. Silakan coba bayar lagi.',
      '/bookings'
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant anon/authenticated (route pakai anon key; proteksi = secret guard)
GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook_secure(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC)
  TO anon, authenticated;

COMMIT;

-- Verify
SELECT p.proname, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('handle_midtrans_webhook_secure', 'enforce_student_payment_only')
ORDER BY p.proname;
