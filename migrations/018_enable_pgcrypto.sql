-- ============================================================
-- Migration: 018_enable_pgcrypto (v2)
-- Date: 2026-08-18
-- Revisi: v1 CREATE EXTENSION pgcrypto mungkin gagal karena
--         Supabase memerlukan extension di schema 'extensions'
--         (bukan public). Function pakai search_path = public
--         → digest() tidak ketemu. Fix:
--           1. CREATE EXTENSION di schema extensions
--           2. Function di-REPLACE dengan search_path = public, extensions
-- ============================================================

BEGIN;

-- Supabase: pgcrypto WAJIB di schema 'extensions'
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function di-replace: search_path include extensions supaya digest() ketemu
CREATE OR REPLACE FUNCTION public.handle_midtrans_webhook_secure(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_midtrans_status TEXT,
  p_payment_status TEXT,
  p_webhook_secret TEXT
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

-- Grant anon/authenticated (webhook route pakai anon key; proteksi = secret guard)
GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook_secure(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

COMMIT;

-- Verify
SELECT extname, nspname FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pgcrypto';
