-- Migration: Add missing columns to bookings table
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add updated_at (for row update tracking)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Add duration_months (booking duration)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1 CHECK (duration_months > 0);

-- 3. Add total_amount (total price including fees)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0 CHECK (total_amount >= 0);

-- 4. Add base_monthly_price (snapshot of room price at booking time)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS base_monthly_price BIGINT DEFAULT 0 CHECK (base_monthly_price >= 0);

-- 5. Add column comments
COMMENT ON COLUMN bookings.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN bookings.duration_months IS 'Jumlah bulan booking (durasi sewa)';
COMMENT ON COLUMN bookings.total_amount IS 'Total harga booking = (harga bulanan × durasi) + biaya layanan + biaya admin';
COMMENT ON COLUMN bookings.base_monthly_price IS 'Harga dasar per bulan dari room saat booking dibuat (snapshot)';

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_duration_months ON bookings(duration_months);

COMMIT;

-- 7. Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
