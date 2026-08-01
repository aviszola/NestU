-- Migration untuk menambahkan kolom baru ke tabel bookings
-- Kolom yang diperlukan untuk perhitungan booking yang sudah diperbaiki

-- 1. Tambahkan kolom duration_months (jumlah bulan booking)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;

-- 2. Tambahkan kolom total_amount (total harga setelah perhitungan + biaya)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0;

-- 3. Tambahkan kolom base_monthly_price (harga dasar per bulan dari room)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS base_monthly_price BIGINT DEFAULT 0;

-- 4. Update description untuk dokumentasi
COMMENT ON COLUMN bookings.duration_months IS 'Jumlah bulan booking (durasi sewa)';
COMMENT ON COLUMN bookings.total_amount IS 'Total harga booking (harga bulanan × durasi + biaya)';
COMMENT ON COLUMN bookings.base_monthly_price IS 'Harga dasar per bulan dari room saat booking dibuat';

-- 5. Optional: Update data existing jika ada (default value sudah di-handle oleh DEFAULT)
--    Tidak perlu update karena DEFAULT sudah memberikan nilai awal

-- 6. Verifikasi kolom sudah ditambahkan
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
-- ORDER BY ordinal_position;


-- 7. Cek RLS (Row Level Security) untuk tabel bookings
-- Untuk mengecek RLS policy yang ada:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'bookings';

-- 8. Contoh policy untuk INSERT jika belum ada:
-- CREATE POLICY "Users can insert their own bookings"
-- ON bookings FOR INSERT
-- WITH CHECK (auth.uid() = student_id);

-- 9. Pastikan RLS diaktifkan untuk tabel bookings:
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;