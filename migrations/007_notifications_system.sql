-- ============================================================
-- Migration: 007_notifications_system
-- Date: 2026-08-01
-- Purpose: 
--   1. Create notifications table (in-app persistent notifications)
--   2. Trigger-based auto-notification on key events:
--      - booking baru masuk (ke owner)
--      - booking di-approve/reject (ke student)
--      - kos baru perlu verifikasi (ke admin)
--      - kos disetujui/ditolak (ke owner)
-- ============================================================

BEGIN;

-- ---------------------------------------------------
-- 1. NOTIFICATIONS TABLE
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ---------------------------------------------------
-- 2. RLS POLICIES
-- ---------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User membaca notifikasi sendiri
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- User menandai notifikasi sendiri sebagai dibaca
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Admin baca semua (opsional, untuk debugging)
CREATE POLICY "notifications_select_admin" ON notifications
  FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------
-- 3. HELPER: notify_user()
--    Dipanggil dari trigger/application untuk insert notifikasi.
--    SECURITY DEFINER supaya bisa insert atas nama user lain.
-- ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, link)
  VALUES (p_user_id, p_title, p_message, p_link);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------

-- 4a. BOOKING BARU → notif ke owner kos
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id UUID;
  v_kos_name TEXT;
  v_room_no TEXT;
BEGIN
  SELECT k.owner_id, k.name, r.room_number
    INTO v_owner_id, v_kos_name, v_room_no
    FROM rooms r
    JOIN kos k ON k.id = r.kos_id
    WHERE r.id = NEW.room_id;

  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.student_id THEN
    PERFORM public.notify_user(
      v_owner_id,
      'Booking baru masuk',
      'Ada booking baru untuk ' || v_kos_name || ' (Kamar ' || v_room_no || ').',
      '/owner/bookings'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_created ON bookings;
CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_created();

-- 4b. BOOKING DI-APPROVE/REJECT → notif ke student
CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    PERFORM public.notify_user(
      NEW.student_id,
      'Booking disetujui',
      'Booking kamar Anda telah disetujui. Silakan lanjut ke pembayaran.',
      '/bookings'
    );
  ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    PERFORM public.notify_user(
      NEW.student_id,
      'Booking ditolak',
      'Booking kamar Anda ditolak' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL THEN ': ' || NEW.rejection_reason ELSE '.' END,
      '/bookings'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_status ON bookings;
CREATE TRIGGER trg_notify_booking_status
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status();

-- 4c. KOS BARU → notif ke semua admin
CREATE OR REPLACE FUNCTION public.notify_kos_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, link)
  SELECT id, 'Kos baru perlu verifikasi',
         'Kos "' || NEW.name || '" menunggu verifikasi.',
         '/admin/kos'
  FROM profiles WHERE role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_kos_created ON kos;
CREATE TRIGGER trg_notify_kos_created
  AFTER INSERT ON kos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_kos_created();

-- 4d. KOS DI-SETUJUI/DITOLAK → notif ke owner
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
        'Kos "' || NEW.name || '" ditolak verifikasi. Silakan periksa dan ajukan ulang.',
        '/owner/kos'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_kos_status ON kos;
CREATE TRIGGER trg_notify_kos_status
  AFTER UPDATE OF verification_status ON kos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_kos_status();

COMMIT;

-- ---------------------------------------------------
-- Verify
-- ---------------------------------------------------
SELECT table_name FROM information_schema.tables WHERE table_name = 'notifications';
