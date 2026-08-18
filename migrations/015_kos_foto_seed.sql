-- Migration: Add foto column + seed photos for demo kos
-- Date: 2026-08-18
-- Description: Tambah kolom foto (text[]) pada tabel kos untuk menyimpan URL foto.
-- Upload foto owner juga butuh kolom ini (bug tersembunyi: update di new/page.tsx gagal).
-- Sekaligus isi foto demo (Unsplash) untuk 5 kos publik supaya katalog hidup.

BEGIN;

ALTER TABLE kos
  ADD COLUMN IF NOT EXISTS foto TEXT[] DEFAULT '{}';

-- Seed foto demo (Unsplash — rumah/kos Indonesia)
UPDATE kos SET foto = ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'] WHERE id = 'b30d4663-bcf2-440f-87c2-b22b4bf67380'; -- Sughoi Kos
UPDATE kos SET foto = ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'] WHERE id = '6bbc7b2d-894c-4f3f-9af6-fa1f8d74f026'; -- Kost Harmoni
UPDATE kos SET foto = ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'] WHERE id = '77160ee3-9bdf-43e1-a7a0-74b0e7426cd3'; -- CozyKos
UPDATE kos SET foto = ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80'] WHERE id = '71b7ac38-dbe7-496e-8882-5d17a63ddacc'; -- Kost BW
UPDATE kos SET foto = ARRAY['https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800&q=80'] WHERE id = '4dd94805-a730-4b81-8736-7fd77987d83d'; -- Kost Sejahtera

COMMIT;
