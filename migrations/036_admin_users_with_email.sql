  -- ============================================================
  -- Migration: 036_admin_users_with_email.sql
  -- Date: 2026-09-11
  -- Purpose: Perbaiki /admin/users yang error karena profiles tidak
  --          punya kolom email (email tersimpan di auth.users, bukan
  --          profiles). Buat function SECURITY DEFINER admin-only yang
  --          JOIN profiles + auth.users, supaya admin bisa lihat email
  --          user dengan aman (validasi is_admin() DILOAD function,
  --          jangan cuma andalkan RLS halaman).
  -- ============================================================

  -- ------------------------------------------------------------
  -- 1. FUNCTION: get_users_with_email()
  --    SECURITY DEFINER (bypass RLS) supaya bisa lihat auth.users.
  --    Validasi eksplisit caller adalah admin — tolak akses kalau bukan.
  -- ------------------------------------------------------------
  CREATE OR REPLACE FUNCTION public.get_users_with_email()
  RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    school_name TEXT,
    phone TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  STABLE
  AS $$
  BEGIN
    -- validasi WAJIB: hanya admin bisa lihat email semua user
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'access denied: hanya admin yang bisa lihat list user dengan email';
    END IF;

    RETURN QUERY
      SELECT p.id,
            u.email::TEXT,
            p.full_name::TEXT,
            p.role::TEXT,
            p.is_active,
            p.created_at,
            p.school_name::TEXT,
            p.phone::TEXT
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      ORDER BY p.created_at DESC;
  END;
  $$;

  GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

  -- Verify
  SELECT p.proname, p.prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_users_with_email';