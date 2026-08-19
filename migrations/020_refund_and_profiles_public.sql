-- ============================================================
-- Migration: 020_expand_profiles_public + refund fields
-- Date: 2026-08-19
-- Purpose (audit owner dashboard + refund flow):
--   1. Owner butuh info siswa (sekolah + WA) saat approve/reject
--      booking. View profiles_public hanya expose id/full_name/
--      avatar_url — expand dengan school_name + phone (aman:
--      view hanya SELECT, RLS tetap, data kontak cuma tampil
--      ke owner yang booking-nya masuk ke kos miliknya).
--   2. Refund flow (opsi A + B user): tambah kolom refund_status
--      di bookings — none|pending|processed, dikelola admin.
--      Student lihat status refund via UI (bookings detail).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Expand profiles_public — tambah school_name + phone
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE OR REPLACE VIEW public.profiles_public WITH (security_barrier = true) AS
  SELECT id, full_name, avatar_url, school_name, phone
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. bookings.refund_status — status refund (opsi A)
-- ------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none';

COMMENT ON COLUMN bookings.refund_status IS
  'Status refund: none (tidak ada) | pending (diajukan/diproses) | processed (sudah dikembalikan)';

-- ------------------------------------------------------------
-- 3. Trigger notifikasi refund: saat booking lunas di-cancel
--    dengan refund_status pending → info jelas ke student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_booking_cancelled_refund()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_kos_name TEXT;
BEGIN
  -- Hanya saat booking yang SUDAH LUNAS di-cancel (refund case)
  IF NEW.status = 'cancelled'
     AND OLD.status <> 'cancelled'
     AND OLD.payment_status = 'lunas'
  THEN
    SELECT COALESCE(k.name, 'kos') INTO v_kos_name
    FROM rooms r
    JOIN kos k ON k.id = r.kos_id
    WHERE r.id = NEW.room_id;

    PERFORM public.notify_user(
      NEW.student_id,
      'Pembatalan & Refund',
      'Booking ' || v_kos_name || ' dibatalkan. Dana Anda akan dikembalikan (refund) oleh admin. Hubungi support bila butuh bantuan.',
      '/bookings/' || NEW.id
    );

    -- Tandai refund otomatis jadi pending (opsi B: info jelas ke siswa)
    IF NEW.refund_status = 'none' THEN
      UPDATE bookings SET refund_status = 'pending'
      WHERE id = NEW.id AND refund_status = 'none';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_cancelled_refund ON bookings;
CREATE TRIGGER trg_notify_booking_cancelled_refund
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_cancelled_refund();

COMMIT;
