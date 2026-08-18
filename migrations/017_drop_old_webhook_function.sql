-- ============================================================
-- Migration: 017_drop_old_webhook_function (v2)
-- Date: 2026-08-18
-- Revisi: v1 hanya DROP function lama + revoke.
--         v2: DROP old function (sudah di-handle 016 v2) —
--         file ini kini jadi fallback + verifikasi saja.
-- ============================================================

BEGIN;

-- Pastikan function lama (tanpa secret) TIDAK ada
DROP FUNCTION IF EXISTS public.handle_midtrans_webhook(TEXT, TEXT, TEXT, TEXT);

-- Defense in depth
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

COMMIT;

-- Verify: hanya function secure yang tersisa
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'handle_midtrans_webhook%'
ORDER BY p.proname;
