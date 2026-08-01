-- Migration: Add missing columns to bookings table
-- Date: 2024-01-XX
-- Description: Menambahkan kolom untuk perhitungan booking dan approval workflow

BEGIN;

-- 1. Add duration_months (jumlah bulan booking)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1 CHECK (duration_months > 0);

-- 2. Add total_amount (total harga setelah perhitungan + biaya)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0 CHECK (total_amount >= 0);

-- 3. Add base_monthly_price (harga dasar per bulan dari room saat booking dibuat)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS base_monthly_price BIGINT DEFAULT 0 CHECK (base_monthly_price >= 0);

-- 4. Add rejection_reason (alasan reject booking)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 5. Add decided_by (UUID admin/owner yang approve/reject)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES auth.users(id);

-- 6. Add decided_at (timestamp approve/reject)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

-- 7. Add column comments untuk dokumentasi
COMMENT ON COLUMN bookings.duration_months IS 'Jumlah bulan booking (durasi sewa)';
COMMENT ON COLUMN bookings.total_amount IS 'Total harga booking = (harga bulanan × durasi) + biaya layanan + biaya admin';
COMMENT ON COLUMN bookings.base_monthly_price IS 'Harga dasar per bulan dari room saat booking dibuat (snapshot)';
COMMENT ON COLUMN bookings.rejection_reason IS 'Alasan penolakan booking (optional, diisi oleh owner/admin)';
COMMENT ON COLUMN bookings.decided_by IS 'UUID user (owner/admin) yang melakukan approve/reject';
COMMENT ON COLUMN bookings.decided_at IS 'Timestamp saat booking di-approve/reject';

-- 8. Create index untuk performa query
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_decided_by ON bookings(decided_by);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

COMMIT;

-- 9. Verify migration
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
