"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import NotifBell from "@/components/layout/NotifBell";
import Footer from "@/components/layout/Footer";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

interface AdminShellProps {
  children: React.ReactNode;
  activePage: "dashboard" | "analytics" | "verification" | "bookings" | "users" | "refunds" | "transactions";
}

export default function AdminShell({ children, activePage }: AdminShellProps) {
  const router = useRouter();

  // Semua hooks dipanggil SEBELUM early-return `if (!authed)` agar urutan
  // panggilan React hooks konsisten di setiap render (rules-of-hooks).
  const [authed, setAuthed] = useState(false);
  const [refundCount, setRefundCount] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }
      const { data: profile } = await sup
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        const { getRoleHome } = await import("@/lib/constants/routes");
        router.replace(getRoleHome(profile?.role));
        return;
      }
      if (!cancelled) setAuthed(true);
    }
    check();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const sup = createClient();
        const { count } = await sup
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("refund_status", "pending");
        if (!cancelled) setRefundCount(count ?? 0);
      } catch {
        // ignore — badge opsional
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!authed) return null;

  const menu = [
    { label: "Dashboard", icon: "dashboard", href: "/admin", page: "dashboard" as const },
    { label: "Analytics", icon: "monitoring", href: "/admin/analytics", page: "analytics" as const },
    { label: "Verifikasi Kos", icon: "verified_user", href: "/admin/kos", page: "verification" as const },
    { label: "Bookings", icon: "receipt_long", href: "/admin/bookings", page: "bookings" as const },
    { label: "Transaksi", icon: "payments", href: "/admin/transactions", page: "transactions" as const },
    { label: "Refund", icon: "sync_alt", href: "/admin/refunds", page: "refunds" as const },
    { label: "Kelola User", icon: "group", href: "/admin/users", page: "users" as const },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar fixed full-height — flush top-left, tidak ikut scroll */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 border-r border-outline-variant bg-surface-container-low">
        <div className="pt-stack-md mb-stack-lg px-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-primary font-bold">Admin Panel</p>
              <p className="text-[10px] text-outline">Verification & Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {menu.map((item) => {
            const isActive = item.page === activePage;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
                {item.page === "refunds" && refundCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-error text-white text-[11px] font-bold">
                    {refundCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="pt-stack-md pb-stack-md border-t border-outline-variant space-y-2">
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </Link>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-error hover:bg-error-container/20 rounded-lg transition-all text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </button>
        </div>
      </aside>

      {/* Konten kanan — offset past the fixed sidebar */}
      <div className="lg:pl-64">
        {/* Top Bar (hanya area konten kanan) */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-stack-sm bg-surface shadow-sm">
          <div className="flex items-center gap-stack-md">
            <Logo variant="full" className="h-11 w-auto text-primary" />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-outline mr-2">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-body-sm w-64" placeholder="Search property or owner..." type="text" />
            </div>
            <NotifBell />
            <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">help</button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container">admin_panel_settings</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="min-h-screen">
          {children}
        </main>

        <Footer />
      </div>

      {/* Bottom Nav Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-lg rounded-t-xl">
        {menu.map((item) => {
          const isActive = item.page === activePage;
          return (
            <Link key={item.label} href={item.href}
              className={`flex flex-col items-center justify-center ${
                isActive
                  ? "bg-primary-container text-on-primary-container rounded-full px-4 py-1"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}
