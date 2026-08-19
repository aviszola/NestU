-- ============================================================
-- Migration: 025_enforce_completed_requires_lunas.sql
-- Date: 2026-08-19
-- Purpose: Enforce server-side (level DB): booking TIDAK boleh
--   ditandai 'completed' kalau payment_status != 'lunas'.
--   Guard UI (owner bookings) + guard JS (updateBookingStatus)
--   bisa dilewati dengan panggil Supabase langsung — trigger ini
--   adalah lapisan terakhir yang tak bisa dilewati.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_completed_requires_lunas()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND OLD.status <> 'completed'
     AND COALESCE(NEW.payment_status, '') <> 'lunas'
  THEN
    RAISE EXCEPTION 'Booking belum lunas, tidak bisa ditandai selesai.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_completed_requires_lunas ON bookings;
CREATE TRIGGER trg_enforce_completed_requires_lunas
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_completed_requires_lunas();

COMMIT;
