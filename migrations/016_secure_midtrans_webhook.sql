-- ============================================================
-- Migration: 016_secure_midtrans_webhook
-- Date: 2026-08-18
-- Purpose: Security fix dari audit:
--   1. CELAH KRITIS: handle_midtrans_webhook bisa dipanggil anon
--      langsung (bypass signature) karena GRANT EXECUTE ke anon.
--      Fix: revoke akses anon/authenticated + tambah parameter
--      p_webhook_secret (shared secret server-side) — webhook
--      route pakai service-role key + secret sama.
--   2. IDEMPOTENCY: webhook retry/replay 2x mengubah paid_at
--      + menimpa txn_id. Fix: guard — kalau sudah lunas & status
--      baru juga lunas, abort tanpa perubahan.
--   3. Revoke CREATE grants anon/authenticated (defense in depth)
--      supaya user tak bisa bikin function sewenang-wenang.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Revoke akses publik ke function lama
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_midtrans_webhook(TEXT, TEXT, TEXT, TEXT)
  FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. Function baru + p_webhook_secret guard
--    Hanya bisa dipanggil dengan secret yang cocok dengan
--    midtrans_webhook_secret (didapat dari table, di-set via SQL).
--    Secret dibanding pakai pg_catalog.pg_comparetext? No —
--    pakai constant-time compare manual. Di produksi, service role
--    memanggil function ini lewat RPC (masih anon di PostgREST? No —
--    service-role key = role service_role, bukan anon).
-- ============================================================
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

  -- Constant-time compare (hash both sides, compare hashes)
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

  -- 3. IDEMPOTENCY: kalau sudah lunas (paid_at set) & status baru juga lunas → abort
  IF v_booking.paid_at IS NOT NULL AND p_payment_status = 'lunas' THEN
    RETURN TRUE;  -- sudah diproses, jangan update 2x
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
-- 3. GRANT: HANYA service_role (bukan anon/authenticated)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook_secure(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- ------------------------------------------------------------
-- 4. app_config table + seed secret placeholder
--    (diisi value riil dari env oleh admin, atau webhook route
--     set via RPC service-role. Secret disimpan di tabel config,
--     BUKAN di client.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed placeholder — akan di-override via SQL editor / setup script
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
