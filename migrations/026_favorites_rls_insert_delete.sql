-- ============================================================
-- Migration: 026_favorites_rls_insert_delete.sql
-- Date: 2026-08-19
-- Purpose: Fix RLS on favorites — tabel HANYA punya policy SELECT
--   (migration 004_rls_policies), tidak ada INSERT/DELETE.
--   Akibatnya toggleFavorite (insert/delete dari FavoriteButton)
--   gagal dengan "new row violates row-level security policy".
--   Tambahkan policy INSERT + DELETE scoped ke pemiliknya sendiri.
-- ============================================================

BEGIN;

-- Policy: siswa menambah favorit MILIKNYA SENDIRI
DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Policy: siswa menghapus favoritnya sendiri (un-favorite)
DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE
  USING (auth.uid() = student_id);

COMMIT;

-- Verify
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'favorites'
ORDER BY cmd;
