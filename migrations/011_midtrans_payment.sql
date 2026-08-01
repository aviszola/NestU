-- ============================================================
-- Migration: 011_midtrans_payment
-- Date: 2026-08-01
-- Purpose: Midtrans Snap integration — kolom payment tambahan
--   1. payment_method (midtrans | manual) — metode utama vs fallback
--   2. midtrans_order_id — order_id unik per transaksi Snap
--   3. midtrans_transaction_id — transaction_id dari Midtrans
--   4. midtrans_status — status mentah dari webhook Midtrans
--   5. payment_expired_at — kapan transaksi expired (dari Midtrans)
-- ============================================================

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual'
    CHECK (payment_method IN ('midtrans', 'manual'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS midtrans_status TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_expired_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.payment_method IS 'Metode pembayaran: midtrans (utama) atau manual (fallback)';
COMMENT ON COLUMN bookings.midtrans_order_id IS 'Order ID unik dari Midtrans Snap (format: booking-{bookingId}-{timestamp})';
COMMENT ON COLUMN bookings.midtrans_status IS 'Status mentah dari webhook Midtrans (settlement, pending, expire, cancel, deny, capture)';
COMMENT ON COLUMN bookings.payment_expired_at IS 'Waktu kadaluarsa transaksi dari Midtrans';

CREATE INDEX IF NOT EXISTS idx_bookings_midtrans_order ON bookings(midtrans_order_id);

COMMIT;

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('payment_method', 'midtrans_order_id', 'midtrans_transaction_id', 'midtrans_status', 'payment_expired_at')
ORDER BY ordinal_position;
