-- ============================================================
-- Migration: 030_admin_status_override (FIXED — enum booking_status)
-- Date: 2026-08-20
-- Purpose: Batasi admin ubah status booking → hanya via RPC
--   admin_override_booking_status (override darurat + audit trail).
--   NOTE: kolom bookings.status berjenis ENUM public.booking_status,
--   jadi p_new_status di-cast ::booking_status.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. TABEL ADMIN_ACTION_LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id),
  action_type TEXT NOT NULL DEFAULT 'status_override',
  old_value   TEXT,
  new_value   TEXT,
  reason      TEXT NOT NULL CHECK (char_length(trim(reason)) >= 20),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_action_log IS
  'Riwayat override darurat admin (misal ubah status booking tanpa lewat owner). Wajib alasan >= 20 karakter.';

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_action_log_select_admin" ON public.admin_action_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_action_log_insert_admin" ON public.admin_action_log
  FOR INSERT WITH CHECK (public.is_admin());

-- DELETE hanya admin — utk housekeeping/data test cleanup.
-- Log tetap immutable utk non-admin; admin superuser tepercaya.
CREATE POLICY "admin_action_log_delete_admin" ON public.admin_action_log
  FOR DELETE USING (public.is_admin());

GRANT SELECT, INSERT, DELETE ON public.admin_action_log TO authenticated;

-- ------------------------------------------------------------
-- 2. RPC: ADMIN OVERRIDE STATUS BOOKING (cast ke enum)
-- ------------------------------------------------------------
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

  -- Validasi + cast status target ke enum
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

-- ------------------------------------------------------------
-- 3. TRIGGER: BLOKIR ADMIN UPDATE STATUS LANGSUNG
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_admin_direct_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin()
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    IF current_setting('app.admin_override', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Admin tidak bisa mengubah status booking langsung. Gunakan RPC admin_override_booking_status() dengan alasan (override darurat).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_admin_direct_status_update ON public.bookings;
CREATE TRIGGER trg_block_admin_direct_status_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.block_admin_direct_status_update();

COMMIT;
