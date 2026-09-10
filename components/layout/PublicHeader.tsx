import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/ui/Logo";

/**
 * Public header for SEO/static pages (/about, /developer, ...).
 *
 * Fetches the session server-side (like the homepage) so a logged-in user sees
 * their name + Dashboard button instead of a hardcoded Login/Register. Pure
 * server component — no client auth race condition; session is read from cookies.
 */
export default async function PublicHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName: string | null = null;
  let role: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = data?.role ?? null;
    fullName = data?.full_name ?? null;
  }

  const dashboardHref =
    role === "siswa"
      ? "/dashboard"
      : role === "pemilik"
        ? "/owner"
        : role === "admin"
          ? "/admin"
          : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo variant="full" className="h-12 w-auto text-primary" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/kos" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
              Cari Kos
            </Link>
            <Link href="/about" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
              Tentang Kami
            </Link>
            <Link href="/developer" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
              Tim Pengembang
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
              Bantuan
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {user && fullName ? (
              <>
                <span className="text-sm font-semibold text-on-surface-variant">{fullName}</span>
                <Link
                  href={dashboardHref || "/"}
                  className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-primary rounded-full hover:bg-primary/10 transition-all duration-200">
                  Login
                </Link>
                <Link href="/register" className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200">
                  Register
                </Link>
              </>
            )}
          </div>
          {/* Mobile menu toggle — konsisten dgn homepage */}
          <button
            id="menuToggle"
            className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}