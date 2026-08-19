-- ============================================================
-- Migration: 029_maintenance_reports.sql
-- Date: 2026-08-19
-- Purpose: Fitur laporan masalah (maintenance report) — siswa
--   melapor ke pemilik kos.
--   1. Tabel maintenance_reports (id, booking_id, student_id,
--      kos_id, owner_id, category, priority, description,
--      photo_url NOT NULL, status, owner_response, timestamps)
--   2. RLS: SELECT siswa (own) + INSERT siswa (booking lunas
--      miliknya) + SELECT owner (kos milik) + UPDATE owner
--      (kos milik, hanya status/owner_response)
--      → belajar dari bug favorites (026): TIDAK boleh ada
--        policy INSERT/UPDATE yang tertinggal.
--   3. Trigger konsistensi: kolom redundant (student_id/kos_id/
--      owner_id) SELALU diambil dari booking — client tidak
--      bisa memanipulasi. Owner hanya boleh ubah status +
--      owner_response. resolved_at otomatis saat 'selesai'.
--   4. Notifikasi: laporan baru → owner; status berubah → siswa.
--   5. Storage bucket 'maintenance-photos' (public, 5MB, image
--      only) + RLS storage (upload: student pemilik booking
--      lunas; akses: student/owner/admin).
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kos_id        UUID NOT NULL REFERENCES kos(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('listrik_elektronik','air_plumbing','kebersihan','keamanan','fasilitas_rusak','lainnya')),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','normal')),
  description   TEXT NOT NULL,
  photo_url     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru','diproses','selesai')),
  owner_response TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_maint_reports_booking ON maintenance_reports(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maint_reports_owner_status ON maintenance_reports(owner_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_maint_reports_student ON maintenance_reports(student_id, created_at DESC);

COMMENT ON TABLE public.maintenance_reports IS
  'Laporan masalah dari siswa ke pemilik kos. Kolom student_id/kos_id/owner_id redundant dari booking utk RLS & query cepat — dijamin konsisten oleh trigger.';
COMMENT ON COLUMN public.maintenance_reports.photo_url IS
  'URL publik foto laporan di bucket maintenance-photos (wajib).';
COMMENT ON COLUMN public.maintenance_reports.owner_response IS
  'Balasan/penjelasan pemilik (opsional, disarankan saat status selesai).';

-- ---------------------------------------------------
-- 2. TRIGGER KONSISTENSI + updated_at + resolved_at
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_maintenance_reports_consistency()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_student UUID;
  v_kos     UUID;
  v_owner   UUID;
BEGIN
  -- Ambil kebenaran dari booking: student/kos/owner TIDAK bisa
  -- dimanipulasi client (redundant columns selalu sinkron).
  SELECT b.student_id, r.kos_id, k.owner_id
    INTO v_student, v_kos, v_owner
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN kos  k ON k.id = r.kos_id
    WHERE b.id = NEW.booking_id;

  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Booking tidak ditemukan.';
  END IF;
  IF TG_OP = 'INSERT' AND NOT public.is_admin() AND v_student <> auth.uid() THEN
    RAISE EXCEPTION 'Laporan hanya bisa dibuat untuk booking milik sendiri.';
  END IF;

  NEW.student_id := v_student;
  NEW.kos_id     := v_kos;
  NEW.owner_id   := v_owner;
  NEW.updated_at := now();

  IF NEW.status = 'selesai' AND OLD.status IS DISTINCT FROM 'selesai' THEN
    NEW.resolved_at := now();
  ELSIF NEW.status <> 'selesai' THEN
    NEW.resolved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_reports_consistency ON maintenance_reports;
CREATE TRIGGER trg_maintenance_reports_consistency
  BEFORE INSERT OR UPDATE ON maintenance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_maintenance_reports_consistency();

-- Owner hanya boleh ubah status + owner_response
CREATE OR REPLACE FUNCTION public.enforce_maintenance_owner_update()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = OLD.owner_id AND NOT public.is_admin() THEN
    IF NEW.booking_id   IS DISTINCT FROM OLD.booking_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.kos_id     IS DISTINCT FROM OLD.kos_id
       OR NEW.owner_id   IS DISTINCT FROM OLD.owner_id
       OR NEW.category   IS DISTINCT FROM OLD.category
       OR NEW.priority   IS DISTINCT FROM OLD.priority
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.photo_url  IS DISTINCT FROM OLD.photo_url
    THEN
      RAISE EXCEPTION 'Owner hanya boleh mengubah status dan owner_response laporan.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_owner_update ON maintenance_reports;
CREATE TRIGGER trg_maintenance_owner_update
  BEFORE UPDATE ON maintenance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_maintenance_owner_update();

-- ---------------------------------------------------
-- 3. NOTIFIKASI
-- ---------------------------------------------------
-- 3a. Laporan baru → owner
CREATE OR REPLACE FUNCTION public.notify_maintenance_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

  PERFORM public.notify_user(
    NEW.owner_id,
    'Laporan masalah baru',
    'Ada laporan masalah baru dari ' || COALESCE(v_student_name, 'siswa') ||
      ' — ' ||
      CASE NEW.category
        WHEN 'listrik_elektronik' THEN 'Listrik / Elektronik'
        WHEN 'air_plumbing'       THEN 'Air / Plumbing'
        WHEN 'kebersihan'         THEN 'Kebersihan'
        WHEN 'keamanan'           THEN 'Keamanan'
        WHEN 'fasilitas_rusak'    THEN 'Fasilitas Rusak'
        ELSE 'Lainnya'
      END ||
      CASE WHEN NEW.priority = 'urgent' THEN ' (URGENT)' ELSE '' END,
    '/owner/reports'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_maintenance_created ON maintenance_reports;
CREATE TRIGGER trg_notify_maintenance_created
  AFTER INSERT ON maintenance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_maintenance_created();

-- 3b. Status berubah → siswa (sertakan owner_response)
CREATE OR REPLACE FUNCTION public.notify_maintenance_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_label TEXT;
  v_status_label   TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_category_label := CASE NEW.category
      WHEN 'listrik_elektronik' THEN 'Listrik / Elektronik'
      WHEN 'air_plumbing'       THEN 'Air / Plumbing'
      WHEN 'kebersihan'         THEN 'Kebersihan'
      WHEN 'keamanan'           THEN 'Keamanan'
      WHEN 'fasilitas_rusak'    THEN 'Fasilitas Rusak'
      ELSE 'Lainnya'
    END;
    v_status_label := CASE NEW.status
      WHEN 'baru' THEN 'Baru'
      WHEN 'diproses' THEN 'Diproses'
      ELSE 'Selesai'
    END;

    PERFORM public.notify_user(
      NEW.student_id,
      'Laporan Anda diperbarui',
      'Laporan ' || v_category_label || ' diperbarui: ' || v_status_label ||
        CASE WHEN NEW.owner_response IS NOT NULL THEN ' — ' || NEW.owner_response ELSE '' END,
      '/rental/' || NEW.booking_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_maintenance_status ON maintenance_reports;
CREATE TRIGGER trg_notify_maintenance_status
  AFTER UPDATE OF status ON maintenance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_maintenance_status();

-- ---------------------------------------------------
-- 4. RLS — TIDAK BOLEH ADA POLICY YANG TERTINGGAL
--    (pelajaran dari favorites 026: INSERT/DELETE hilang)
-- ---------------------------------------------------
ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;

-- Siswa: lihat laporan miliknya sendiri
DROP POLICY IF EXISTS "maintenance_select_own_student" ON maintenance_reports;
CREATE POLICY "maintenance_select_own_student" ON maintenance_reports
  FOR SELECT
  USING (student_id = auth.uid());

-- Siswa: buat laporan HANYA untuk booking miliknya yang LUNAS
-- (validasi booking_id + payment_status live dari tabel bookings)
DROP POLICY IF EXISTS "maintenance_insert_student" ON maintenance_reports;
CREATE POLICY "maintenance_insert_student" ON maintenance_reports
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND b.student_id = auth.uid()
        AND b.payment_status = 'lunas'
        AND b.status IN ('approved', 'completed')
    )
  );

-- Pemilik: lihat laporan untuk kos miliknya
DROP POLICY IF EXISTS "maintenance_select_owner" ON maintenance_reports;
CREATE POLICY "maintenance_select_owner" ON maintenance_reports
  FOR SELECT
  USING (owner_id = auth.uid());

-- Pemilik: update status + owner_response (scope kolom via trigger)
DROP POLICY IF EXISTS "maintenance_update_owner" ON maintenance_reports;
CREATE POLICY "maintenance_update_owner" ON maintenance_reports
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Admin: dapatkan akses penuh (debug/cleanup)
DROP POLICY IF EXISTS "maintenance_select_admin" ON maintenance_reports;
CREATE POLICY "maintenance_select_admin" ON maintenance_reports
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "maintenance_insert_admin" ON maintenance_reports;
CREATE POLICY "maintenance_insert_admin" ON maintenance_reports
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "maintenance_delete_admin" ON maintenance_reports;
CREATE POLICY "maintenance_delete_admin" ON maintenance_reports
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------
-- 5. STORAGE — bucket maintenance-photos
--    Public (konsisten pola kos-foto; foto laporan tampil
--    di halaman siswa & owner). Limit: 5MB, image only
--    (enforced server-side oleh storage via bucket config).
-- ---------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-photos', 'maintenance-photos', TRUE,
  5242880, -- 5 MB (bytes, pasca migration 0014)
  ARRAY['image/*']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: apakah user adalah student pemilik booking (path: reports/{bookingId}/...)
CREATE OR REPLACE FUNCTION public.is_maintenance_student(path TEXT, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_booking_id TEXT;
BEGIN
  v_booking_id := split_part(path, '/', 2);
  RETURN EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id::text = v_booking_id
      AND b.student_id = uid
      AND b.payment_status = 'lunas'
      AND b.status IN ('approved', 'completed')
  );
END;
$$;

-- Helper: apakah user adalah owner kos untuk booking di path
CREATE OR REPLACE FUNCTION public.is_maintenance_owner(path TEXT, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_booking_id TEXT;
BEGIN
  v_booking_id := split_part(path, '/', 2);
  RETURN EXISTS (
    SELECT 1 FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN kos k ON k.id = r.kos_id
    WHERE b.id::text = v_booking_id AND k.owner_id = uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_maintenance_student(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_owner(TEXT, UUID) TO authenticated;

-- SELECT (download/lihat) — student pemilik, owner kos, admin
DROP POLICY IF EXISTS "maint_photo_select_student" ON storage.objects;
CREATE POLICY "maint_photo_select_student" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'maintenance-photos' AND public.is_maintenance_student(name, auth.uid()));

DROP POLICY IF EXISTS "maint_photo_select_owner" ON storage.objects;
CREATE POLICY "maint_photo_select_owner" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'maintenance-photos' AND public.is_maintenance_owner(name, auth.uid()));

DROP POLICY IF EXISTS "maint_photo_select_admin" ON storage.objects;
CREATE POLICY "maint_photo_select_admin" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'maintenance-photos' AND public.is_admin());

-- INSERT (upload) — student pemilik booking lunas
DROP POLICY IF EXISTS "maint_photo_insert_student" ON storage.objects;
CREATE POLICY "maint_photo_insert_student" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND public.is_maintenance_student(name, auth.uid())
  );

-- UPDATE/DELETE — student pemilik (ganti foto), owner (cleanup), admin
DROP POLICY IF EXISTS "maint_photo_update_self" ON storage.objects;
CREATE POLICY "maint_photo_update_self" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'maintenance-photos'
    AND (
      public.is_maintenance_student(name, auth.uid())
      OR public.is_maintenance_owner(name, auth.uid())
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "maint_photo_delete_self" ON storage.objects;
CREATE POLICY "maint_photo_delete_self" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'maintenance-photos'
    AND (
      public.is_maintenance_student(name, auth.uid())
      OR public.is_maintenance_owner(name, auth.uid())
      OR public.is_admin()
    )
  );

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'maintenance_reports'
ORDER BY ordinal_position;

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'maintenance_reports'
ORDER BY cmd, policyname;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'maintenance-photos';
