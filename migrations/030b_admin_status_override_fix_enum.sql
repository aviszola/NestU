-- ============================================================
-- Migration: 030b_admin_status_override_fix_enum
-- Date: 2026-08-20
-- Purpose: Patch 030 — cast p_new_status ke enum booking_status.
--   Jalankan HANYA kalau 030 sudah dijalankan dan RPC lama masih
--   pakai assignment langsung (error: column "status" is of type
--   booking_status but expression is of type text).
--   Aman di-run ulang (idempotent).
-- ============================================================

BEGIN;

-- Recreate RPC dengan cast enum
CREATE OR REPLACE FUNCTION public.admin_override_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_reason TEXT
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_new_row public.bookings;
  v_owner_id UUID;
  v_kos_name TEXT;
  v_room_no TEXT;
  v_reason TEXT := trim(coalesce(p_reason, ''));
  v_status_enum public.booking_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang bisa melakukan override status booking.';
  END IF;

  IF char_length(v_reason) < 20 THEN
    RAISE EXCEPTION 'Alasan override wajib minimal 20 karakter (saat ini %).', char_length(v_reason);
  END IF;

  BEGIN
    v_status_enum := p_new_status::public.booking_status;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Status booking tidak valid: %', p_new_status;
  END;

  SELECT b.status::text, k.owner_id, COALESCE(k.name,'kos'), COALESCE(r.room_number,'-')
    INTO v_old_status, v_owner_id, v_kos_name, v_room_no
  FROM public.bookings b
  JOIN public.rooms r ON r.id = b.room_id
  JOIN public.kos k ON k.id = r.kos_id
  WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking tidak ditemukan.';
  END IF;

  PERFORM set_config('app.admin_override', 'true', TRUE);

  UPDATE public.bookings
     SET status = v_status_enum,
         decided_by = auth.uid(),
         decided_at = now(),
         updated_at = now()
   WHERE id = p_booking_id
   RETURNING * INTO v_new_row;

  INSERT INTO public.admin_action_log (admin_id, booking_id, action_type, old_value, new_value, reason)
  VALUES (auth.uid(), p_booking_id, 'status_override', v_old_status, p_new_status, v_reason);

  IF v_owner_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_owner_id,
      'Override Status Booking oleh Admin',
      'Admin mengubah status booking ' || p_booking_id::text || ' (' || v_kos_name || ' Kamar ' || v_room_no ||
      ') dari ' || v_old_status || ' → ' || p_new_status || '. Alasan: ' || v_reason,
      '/owner/bookings'
    );
  END IF;

  RETURN v_new_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_booking_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_booking_status(UUID, TEXT, TEXT) TO authenticated;

COMMIT;
