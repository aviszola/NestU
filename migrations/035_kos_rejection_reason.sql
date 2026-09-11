-- ============================================================
-- Migration: 035_kos_rejection_reason.sql
-- Date: 2026-09-11
-- Purpose: Menambah kolom rejection_reason di tabel kos, supaya
--          admin bisa beri alasan penolakan (wajib) yang jelas ke
--          pemilik kos. Ikuti pola reject booking (wajib alasan).
--          Update trigger notify_kos_status supaya pesan ke owner
--          sertakan alasan penolakan (pola sama dgn notify_booking_status).
-- ============================================================

-- 1. Kolom rejection_reason di tabel kos
ALTER TABLE public.kos
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.kos.rejection_reason
  IS 'Alasan penolakan verifikasi (dari admin ke pemilik kos). NULL jika belum ditolak atau belum ada alasan.';

-- 2. Update trigger notifikasi — sertakan alasan penolakan ke owner
--    (pola sama dgn notify_booking_status untuk reject booking).
DROP TRIGGER IF EXISTS trg_notify_kos_status ON kos;

CREATE OR REPLACE FUNCTION public.notify_kos_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status <> OLD.verification_status THEN
    IF NEW.verification_status = 'verified' THEN
      PERFORM public.notify_user(
        NEW.owner_id,
        'Kos disetujui',
        'Kos "' || NEW.name || '" telah disetujui dan kini tampil di pencarian.',
        '/owner/kos'
      );
    ELSIF NEW.verification_status = 'rejected' THEN
      PERFORM public.notify_user(
        NEW.owner_id,
        'Kos ditolak',
        'Kos "' || NEW.name || '" ditolak verifikasi' ||
          CASE WHEN NEW.rejection_reason IS NOT NULL THEN ': ' || NEW.rejection_reason ELSE '.' END,
        '/owner/kos'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_kos_status
  AFTER UPDATE OF verification_status ON kos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_kos_status();

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'kos' AND column_name = 'rejection_reason';