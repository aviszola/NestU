# Database Migration Instructions

## Migration 002: Add Booking Columns

### ⚠️ CRITICAL - HARUS DIJALANKAN SEBELUM TEST BOOKING

Booking system **TIDAK AKAN BERFUNGSI** sebelum migration ini dijalankan.

### Langkah-langkah:

#### 1. Buka Supabase Dashboard
- Login ke [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Pilih project "Student Living Ecosystem"
- Klik menu **SQL Editor** di sidebar kiri

#### 2. Jalankan Migration
- Klik **New Query**
- Copy-paste **SELURUH ISI** file `002_add_booking_columns.sql`
- Klik **Run** atau tekan `Ctrl+Enter`

#### 3. Verifikasi Hasil
Seharusnya muncul output seperti ini:

```
column_name          | data_type              | is_nullable | column_default
---------------------|------------------------|-------------|----------------
id                   | uuid                   | NO          | ...
student_id           | uuid                   | NO          | ...
room_id              | uuid                   | NO          | ...
status               | text                   | YES         | 'pending'::text
notes                | text                   | YES         | NULL
move_in_date         | date                   | YES         | NULL
created_at           | timestamp with time... | YES         | now()
updated_at           | timestamp with time... | YES         | now()
duration_months      | integer                | YES         | 1
total_amount         | bigint                 | YES         | 0
base_monthly_price   | bigint                 | YES         | 0
rejection_reason     | text                   | YES         | NULL
decided_by           | uuid                   | YES         | NULL
decided_at           | timestamp with time... | YES         | NULL
```

**PENTING:** Cek bahwa `duration_months`, `total_amount`, `base_monthly_price` **ADA** dalam list.

#### 4. Test Query Manual
Jalankan query berikut untuk test insert:

```sql
-- Test insert dengan kolom baru
INSERT INTO bookings (
  student_id, 
  room_id, 
  move_in_date, 
  duration_months, 
  total_amount, 
  base_monthly_price,
  notes,
  status
) VALUES (
  'test-uuid',  -- ganti dengan user.id yang valid
  'test-uuid',  -- ganti dengan room_id yang valid
  '2024-02-01',
  3,
  2430000,
  800000,
  'Test booking',
  'pending'
);

-- Jika berhasil, hapus data test:
DELETE FROM bookings WHERE notes = 'Test booking';
```

Jika error → screenshot error dan kirim ke developer.

#### 5. Cek RLS (Row Level Security)
```sql
-- Cek RLS policies untuk bookings
SELECT * FROM pg_policies WHERE tablename = 'bookings';
```

**Expected:** Harus ada policy untuk INSERT yang mengizinkan user insert booking miliknya sendiri.

Jika tidak ada, jalankan:

```sql
-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own bookings
CREATE POLICY "Users can insert their own bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
USING (auth.uid() = student_id);

-- Policy: Owners can view bookings for their properties
CREATE POLICY "Owners can view bookings for their properties"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN kos k ON r.kos_id = k.id
    WHERE r.id = bookings.room_id
    AND k.owner_id = auth.uid()
  )
);

-- Policy: Owners can update booking status for their properties
CREATE POLICY "Owners can update bookings for their properties"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN kos k ON r.kos_id = k.id
    WHERE r.id = bookings.room_id
    AND k.owner_id = auth.uid()
  )
);

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

### Troubleshooting

#### Error: "column already exists"
**Solusi:** Kolom sudah ada, skip error ini. Lanjut ke verifikasi.

#### Error: "permission denied"
**Solusi:** Pastikan Anda login sebagai owner project di Supabase dashboard.

#### Error: "relation bookings does not exist"
**Solusi:** Tabel bookings belum dibuat. Buat tabel dulu atau contact developer.

### Rollback (Jika Perlu)
```sql
BEGIN;
ALTER TABLE bookings DROP COLUMN IF EXISTS duration_months;
ALTER TABLE bookings DROP COLUMN IF EXISTS total_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS base_monthly_price;
ALTER TABLE bookings DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE bookings DROP COLUMN IF EXISTS decided_by;
ALTER TABLE bookings DROP COLUMN IF EXISTS decided_at;
COMMIT;
```

**⚠️ WARNING:** Rollback akan menghapus data di kolom tersebut!

### Status
- [ ] Migration dijalankan
- [ ] Verifikasi kolom ada
- [ ] Test insert manual sukses
- [ ] RLS policy sudah benar
- [ ] Ready for testing booking
