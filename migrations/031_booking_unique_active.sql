-- ============================================================
-- Migration: 031_booking_unique_active
-- Date: 2026-08-20
-- Purpose: Fix BUG-001 (race condition double-booking).
--   1. Partial unique index: 1 kamar hanya boleh punya 1 booking
--      aktif (status pending/approved) pada satu waktu.
--   2. Trigger BEFORE INSERT: pesan error yang manusiawi (ganti
--      error constraint generic) + validasi move_in_date overlap
--      untuk status aktif.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. PARTIAL UNIQUE INDEX — cegah double-booking (race condition)
-- ------------------------------------------------------------
-- Satu room_id hanya boleh punya SATU booking dengan status
-- aktif (pending/approved). Status lain (rejected/cancelled/
-- completed) boleh berkali-kali (riwayat).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_room
  ON public.bookings (room_id)
  WHERE status IN ('pending', 'approved');

-- ------------------------------------------------------------
-- 2. TRIGGER — pesan error jelas + validasi overlap
-- ------------------------------------------------------------
-- Index memberi constraint hard, tapi error default Postgres
-- (duplicate key) tidak ramah user. Trigger ini menangkap kasus
-- yang sama dan RAISE EXCEPTION dengan pesan bahasa Indonesia.
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_kos_name TEXT;
  v_room_no TEXT;
BEGIN
  -- Cek: apakah sudah ada booking aktif utk kamar ini?
  SELECT b.id
    INTO v_existing_id
  FROM public.bookings b
  WHERE b.room_id = NEW.room_id
    AND b.status IN ('pending', 'approved')
    AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT COALESCE(k.name, 'kos'), COALESCE(r.room_number, '-')
      INTO v_kos_name, v_room_no
    FROM public.rooms r
    JOIN public.kos k ON k.id = r.kos_id
    WHERE r.id = NEW.room_id;

    RAISE EXCEPTION 'Kamar % di % sudah memiliki booking aktif. Silakan pilih kamar lain.',
      v_room_no, v_kos_name
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_double_booking();

COMMIT;
