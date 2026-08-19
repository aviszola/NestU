-- ============================================================
-- Migration: 023_bookings_update_admin.sql
-- Date: 2026-08-19
-- Purpose: Admin TIDAK bisa update bookings (cuma SELECT via
--   bookings_select_admin). markRefundProcessed (refund manual)
--   butuh admin update refund_status → update gagal diam-diam
--   (RLS blokir, error null, rows=0).
--
-- Fix: tambah policy UPDATE untuk admin (is_admin()).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "bookings_update_admin" ON bookings;
CREATE POLICY "bookings_update_admin" ON bookings
  FOR UPDATE
  USING (public.is_admin());

COMMIT;
