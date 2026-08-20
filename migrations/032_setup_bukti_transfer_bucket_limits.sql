-- ============================================================
-- Migration: 032_setup_bukti_transfer_bucket_limits.sql
-- Date: 2026-08-20
-- Purpose: Enforce file_size_limit (5MB) & allowed_mime_types
--          pada bucket 'bukti-transfer' di level Supabase Storage.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti-transfer',
  'bukti-transfer',
  FALSE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
