-- ============================================================
-- Migration: 008_payment_manual_mvp
-- Date: 2026-08-01
-- Purpose: Manual transfer payment MVP
--   1. Add payment columns to bookings table
--   2. Create bank_accounts table (per kos, rekening tujuan transfer)
--   3. Owner/admin dapat konfirmasi pembayaran manual
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. BOOKINGS — payment columns
-- ---------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'belum_bayar'
    CHECK (payment_status IN ('belum_bayar', 'menunggu_konfirmasi', 'lunas', 'expired'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_note TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.payment_status IS 'Status pembayaran: belum_bayar → menunggu_konfirmasi (student upload bukti) → lunas (owner/admin konfirmasi)';

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- ---------------------------------------------------
-- 2. BANK_ACCOUNTS — rekening tujuan transfer per kos
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kos_id UUID NOT NULL REFERENCES kos(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_kos ON bank_accounts(kos_id);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Siapa pun bisa lihat rekening kos (untuk instruksi transfer)
CREATE POLICY "bank_accounts_select_public" ON bank_accounts
  FOR SELECT USING (true);

-- Owner kelola rekening kos miliknya
CREATE POLICY "bank_accounts_insert_owner" ON bank_accounts
  FOR INSERT WITH CHECK (
    kos_id IN (SELECT id FROM kos WHERE owner_id = auth.uid())
  );

CREATE POLICY "bank_accounts_update_owner" ON bank_accounts
  FOR UPDATE USING (
    kos_id IN (SELECT id FROM kos WHERE owner_id = auth.uid())
  );

CREATE POLICY "bank_accounts_delete_owner" ON bank_accounts
  FOR DELETE USING (
    kos_id IN (SELECT id FROM kos WHERE owner_id = auth.uid())
  );

-- ---------------------------------------------------
-- 3. PAYMENT CONFIRM — helper untuk owner/admin
--    Konfirmasi pembayaran: booking.status = approved,
--    booking.payment_status = lunas
-- ---------------------------------------------------
-- Update policy bookings: owner bisa update payment fields
-- (policy bookings_update_owner sudah ada di migration 005,
--  meliputi seluruh kolom bookings termasuk payment)

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('payment_status', 'payment_proof_url', 'payment_note', 'paid_at')
ORDER BY ordinal_position;
