-- ============================================================
-- PATCH 029-fix: admin bypass di trg_maintenance_reports_consistency
-- Jalankan SEKALI di Supabase SQL Editor (setelah migration 029).
-- Fungsi + trigger idempotent (CREATE OR REPLACE / DROP...CREATE).
-- ============================================================

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
  -- Auth check HANYA berlaku saat INSERT (siswa membuat laporan).
  -- Admin bypass (utk test/cleanup). Saat UPDATE (owner update status),
  -- v_student = siswa ≠ auth.uid() — jangan block, kolom redundant
  -- cukup disinkronkan ulang dari booking.
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

-- Verify
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'enforce_maintenance_reports_consistency';

-- ============================================================
-- PATCH 2: maintenance_insert_admin policy
-- ============================================================
DROP POLICY IF EXISTS "maintenance_insert_admin" ON maintenance_reports;
CREATE POLICY "maintenance_insert_admin" ON maintenance_reports
  FOR INSERT
  WITH CHECK (public.is_admin());
