-- ============================================================
-- Migration: 022_refund_processed_columns.sql
-- Date: 2026-08-19
-- Purpose: Lengkapi fitur refund manual (opsi A).
--   Tambah kolom refund_processed_at + refund_processed_by
--   untuk audit trail saat admin memproses refund.
--   (refund_status + trigger notifikasi sudah di migration 020)
-- ============================================================

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_processed_by UUID;

COMMENT ON COLUMN bookings.refund_processed_at IS
  'Timestamp saat admin menandai refund diproses';
COMMENT ON COLUMN bookings.refund_processed_by IS
  'UUID admin yang memproses refund';

COMMIT;
