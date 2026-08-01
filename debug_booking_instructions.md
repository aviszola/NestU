# INSTRUKSI DEBUGGING ERROR BOOKING

## Langkah 1: Dapatkan Error Detail Lengkap
Setelah melakukan perubahan, coba submit booking lagi dan cek **Console Browser** untuk melihat error detail:

1. Buka **Developer Tools** (F12)
2. Buka tab **Console**
3. Coba submit booking
4. Lihat error yang muncul, akan ada format seperti:
   ```
   Error detail dari submitBooking: {code: "42501", message: "...", details: "...", hint: "..."}
   Full error object: { ... }
   ```

## Langkah 2: Analisis Kemungkinan Error

### Kemungkinan 1: Kolom Database Tidak Ada (Paling Mungkin)
**Gejala**: Error code seperti `42703` (undefined column) atau `42601` (syntax error)
**Solusi**: Jalankan migration SQL di Supabase:
```sql
-- Jalankan di SQL Editor Supabase
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_monthly_price BIGINT DEFAULT 0;
```

### Kemungkinan 2: RLS Policy Blocking Insert
**Gejala**: Error code `42501` (permission denied)
**Solusi**: Cek dan buat RLS policy:
```sql
-- 1. Aktifkan RLS jika belum
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 2. Cek policy yang ada
SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- 3. Buat policy untuk INSERT jika belum ada
CREATE POLICY "Users can insert their own bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = student_id);
```

### Kemungkinan 3: Tipe Data Tidak Cocok
**Gejala**: Error code `22P02` (invalid input syntax)
**Solusi**: Pastikan tipe data sesuai:
- `duration_months`: INTEGER
- `total_amount`: BIGINT atau NUMERIC  
- `base_monthly_price`: BIGINT atau NUMERIC

## Langkah 3: Backup Plan - Temporary Fix

Jika tidak bisa mengakses Supabase langsung, kita bisa **temporarily remove the new columns** dari insert query:

1. Edit `lib/supabase/actions.ts` - ubah query INSERT:
```typescript
const { error } = await supabase.from("bookings").insert({
  student_id: user.id,
  room_id: roomId,
  move_in_date: startDate,
  // HAPUS SEMENTARA: duration_months, total_amount, base_monthly_price
  // duration_months: duration,
  // total_amount: finalTotal,
  // base_monthly_price: basePrice,
  notes: notes || null,
  status: "pending",
});
```

2. Setelah migration selesai, kembalikan kolom-kolom tersebut.

## Langkah 4: Verifikasi Setelah Fix

Setelah memperbaiki error, cek:
1. Booking berhasil disubmit tanpa error
2. Data muncul di tabel `bookings` dengan kolom baru
3. `total_amount` dihitung dengan benar: `harga × jumlah_bulan + biaya`

## Migration SQL Lengkap (Jalankan di Supabase SQL Editor)

```sql
-- Migration: Add booking calculation columns
BEGIN;

-- 1. Tambahkan kolom baru
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_monthly_price BIGINT DEFAULT 0;

-- 2. Update deskripsi kolom
COMMENT ON COLUMN bookings.duration_months IS 'Jumlah bulan booking (durasi sewa)';
COMMENT ON COLUMN bookings.total_amount IS 'Total harga booking (harga bulanan × durasi + biaya)';
COMMENT ON COLUMN bookings.base_monthly_price IS 'Harga dasar per bulan dari room saat booking dibuat';

-- 3. Pastikan RLS aktif
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 4. Buat policy INSERT jika belum ada (optional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Users can insert their own bookings'
  ) THEN
    CREATE POLICY "Users can insert their own bookings"
    ON bookings FOR INSERT
    WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

COMMIT;

-- 5. Verifikasi
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
```