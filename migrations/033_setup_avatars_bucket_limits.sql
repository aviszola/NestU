-- ============================================================
-- Migration: 033_setup_avatars_bucket_limits.sql
-- Date: 2026-08-20
-- Purpose: Enforce file_size_limit (2MB) & allowed_mime_types
--          pada bucket 'avatars' di level Supabase Storage.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
