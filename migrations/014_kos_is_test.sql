-- Migration: Hide test/E2E kos from public listings
-- Date: 2026-08-18
-- Description: Tambah kolom is_test (boolean, default false) pada tabel kos.
-- Listing test (KOS_PROOF_TEST) disembunyikan dari tampilan publik via query filter,
-- data TIDAK dihapus (tetap bisa dipakai testing internal).

BEGIN;

ALTER TABLE kos
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Tandai listing test yang sudah ada
UPDATE kos SET is_test = true
WHERE id = 'f7d9e69c-00a9-43b2-800d-b599c0a8129a'
   OR name ILIKE '%test%'
   OR name ILIKE '%e2e%'
   OR name ILIKE '%proof%';

COMMIT;
