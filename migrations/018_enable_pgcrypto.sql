-- ============================================================
-- Migration: 018_enable_pgcrypto
-- Date: 2026-08-18
-- Purpose: (a) Enable extension pgcrypto — function
--          handle_midtrans_webhook_secure pakai digest()
--          untuk constant-time compare secret, error
--          "function digest(text, unknown) does not exist"
--          karena extension belum ada.
--          (b) Grant EXECUTE anon/authenticated — webhook
--          route pakai anon key (bukan service role), jadi
--          function harus tetap callable. Keamanan dijaga
--          oleh shared-secret guard DI DALAM function,
--          bukan oleh grant.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT EXECUTE ON FUNCTION public.handle_midtrans_webhook_secure(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

COMMIT;

-- Verify
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
