-- ============================================================
-- Migration: 034_active_booked_rooms.sql
-- Date: 2026-09-10
-- Purpose: Izinkan pengecekan ketersediaan kamar (booking aktif)
--          secara publik dan aman tanpa mengekspos data pribadi siswa.
--          Fungsi SECURITY DEFINER hanya mengembalikan list room_id
--          yang sedang memiliki status booking 'pending' atau 'approved'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_booked_room_ids(p_room_ids UUID[])
RETURNS TABLE (room_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT b.room_id
  FROM public.bookings b
  WHERE b.room_id = ANY(p_room_ids)
    AND b.status IN ('pending', 'approved');
$$;

GRANT EXECUTE ON FUNCTION public.get_active_booked_room_ids(UUID[]) TO anon, authenticated;

-- Verify
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_active_booked_room_ids';
