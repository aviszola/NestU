# OAUTH SETUP — Google & Facebook Login

Checklist manual untuk mengaktifkan OAuth. AI agent **tidak bisa** mengerjakan
langkah ini — butuh akun & verifikasi di platform eksternal.

## Status Sekarang
- Tombol Google/Facebook di `/login` **disembunyikan** (flag `NEXT_PUBLIC_ENABLE_OAUTH` belum `true`).
- Route `/auth/callback` sudah ada dan siap dipakai.
- Email/password login tetap berfungsi normal.

---

## 1. Google Cloud Console

1. Buka https://console.cloud.google.com → buat project (atau pakai yang ada).
2. **APIs & Services → OAuth consent screen**: isi nama aplikasi, support email.
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Type: **Web application**
   - Authorized redirect URI tambahkan:
     `https://fwdbfikwckhvpbmenydq.supabase.co/auth/v1/callback`
4. Catat **Client ID** dan **Client Secret**.

## 2. Facebook for Developers

1. Buka https://developers.facebook.com → buat app (type: **Business/Consumer**).
2. **Products → Facebook Login → Settings**:
   - Valid OAuth redirect URI tambahkan:
     `https://fwdbfikwckhvpbmenydq.supabase.co/auth/v1/callback`
3. Catat **App ID** dan **App Secret**.
4. (Opsional) App dalam mode **Development** — user yang belum ditambahkan sebagai
   tester tidak bisa login. Mode Live butuh verifikasi Facebook.

> [!NOTE]
> Base URL di atas dari `NEXT_PUBLIC_SUPABASE_URL` di `.env.local`. Kalau
> Supabase project pindah, sesuaikan kedua URI di atas.

## 3. Supabase Dashboard

1. Buka https://supabase.com/dashboard → project `fwdbfikwckhvpbmenydq`.
2. **Authentication → Providers**:
   - **Google**: toggle ON, isi Client ID + Client Secret dari langkah 1.
   - **Facebook**: toggle ON, isi App ID + App Secret dari langkah 2.
3. **Authentication → URL Configuration → Redirect URLs** tambahkan:
   `https://<SITE_URL>/auth/callback` (ganti `<SITE_URL>` dengan URL production Vercel).

## 4. Environment Variable

Setelah semua langkah di atas selesai dan terverifikasi:

```bash
# .env.local (development)
NEXT_PUBLIC_ENABLE_OAUTH=true
```

Lalu di Vercel: **Project → Settings → Environment Variables** tambahkan
`NEXT_PUBLIC_ENABLE_OAUTH=true`, lalu **redeploy**.

## 5. Verifikasi

1. Buka `/login` → tombol "Login dengan Google"/"Facebook" muncul.
2. Klik Google → login → redirect balik ke `/auth/callback` → session tersimpan → masuk.
3. Cek error callback: `/auth/callback?error=...` → halaman `/login` menampilkan
   pesan error (bukan crash).
