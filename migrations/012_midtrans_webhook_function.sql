-- ============================================================
-- Migration: 012_midtrans_webhook_function
-- Date: 2026-08-01
-- Purpose: Webhook Midtrans datang TANPA session login (anon role).
--          RLS bookings blokir update oleh anon → status tak pernah
--          berubah. Fix: SECURITY DEFINER function yang update
--          payment fields berdasarkan order_id, dipanggil via RPC
--          dari API route. Function ini OTOMATIS insert notifikasi
--          ke student & owner — tanpa perlu RPC notify terpisah.
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. FUNCTION: handle_midtrans_webhook
--    SECURITY DEFINER — jalan sebagai owner tabel, bypass RLS.
--    Hanya update kolom payment_* + midtrans_* — tak bisa
--    dipakai untuk ubah status booking (hanya payment_status).
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_midtrans_webhook(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_midtrans_status TEXT,
  p_payment_status TEXT
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
BEGIN
  -- Cari booking by midtrans_order_id
  SELECT * INTO v_booking
  FROM bookings
  WHERE midtrans_order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking dengan order_id % tidak ditemukan', p_order_id;
  END IF;

  -- Ambil owner kos terkait + nama kos (untuk notifikasi)
  SELECT k.owner_id, k.name INTO v_owner_id, v_kos_name
  FROM rooms r
  JOIN kos k ON k.id = r.kos_id
  WHERE r.id = v_booking.room_id;

  -- Update payment fields — HANYA ini, tak sentuh status/kolom lain
  UPDATE bookings SET
    payment_status = p_payment_status,
    payment_method = 'midtrans',
    midtrans_transaction_id = p_transaction_id,
    midtrans_status = p_midtrans_status,
    paid_at = CASE WHEN p_payment_status = 'lunas' THEN now() ELSE NULL END
  WHERE id = v_booking.id;

  -- Notifikasi
  IF p_payment_status = 'lunas' THEN
    -- ke student
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      v_booking.student_id,
      'Pembayaran berhasil',
      'Pembayaran untuk ' || COALESCE(v_kos_name, 'kos') || ' telah dikonfirmasi. Siap check-in!',
      '/bookings'
    );
    -- ke owner
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

-- Grant: anon (webhook) + authenticated boleh panggil
GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMIT;

-- Verify
SELECT p.proname, p.prosecdef, pg_get_function_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_midtrans_webhook';
