-- ============================================================
-- Migration: 016_secure_midtrans_webhook (v2)
-- Date: 2026-08-18
-- Revisi: v1 revoke akses anon + grant hanya service_role.
--         Ternyata webhook route pakai anon key (createClient
--         di lib/supabase/server.ts), jadi grant service_role
--         SAJA bikin webhook gagal call function.
--         Revisi: function tetap GRANT anon/authenticated,
--         tapi dilindungi shared-secret guard DI DALAM function.
--
-- Fix:
--   1. Function lama handle_midtrans_webhook (tanpa secret)
--      di-DROP — celah anon bypass signature.
--   2. Function baru handle_midtrans_webhook_secure + param
--      p_webhook_secret — constant-time compare dengan
--      app_config.midtrans_webhook_secret. Tanpa secret benar
--      → RAISE EXCEPTION, TIDAK update apa pun.
--   3. GRANT anon/authenticated ke function BARU (webhook
--      route butuh). Proteksi = secret, bukan grant.
--   4. Idempotency guard: paid_at IS NOT NULL + lunas → no-op.
--   5. Revoke CREATE on schema anon/authenticated.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. DROP function lama (tanpa secret) — celah bypass signature.
--    REVOKE saja tidak cukup (verified: masih callable).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.handle_midtrans_webhook(TEXT, TEXT, TEXT, TEXT);

-- ------------------------------------------------------------
-- 2. Function baru + p_webhook_secret guard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_midtrans_webhook_secure(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_midtrans_status TEXT,
  p_payment_status TEXT,
  p_webhook_secret TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
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

-- ------------------------------------------------------------
-- 3. GRANT: anon + authenticated (webhook route pakai anon key).
--    Proteksi function = shared secret, bukan grant.
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook_secure(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- ------------------------------------------------------------
-- 4. app_config table + secret placeholder
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_config (key, value)
VALUES ('midtrans_webhook_secret', 'CHANGE_ME_WEBHOOK_SECRET')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Defense in depth: revoke CREATE on public schema
-- ------------------------------------------------------------
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

COMMIT;

-- Verify
SELECT p.proname, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'handle_midtrans_webhook%'
ORDER BY p.proname;
