"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import NotifBell from "@/components/layout/NotifBell";
import Footer from "@/components/layout/Footer";

interface AdminShellProps {
  children: React.ReactNode;
  activePage: "dashboard" | "verification" | "bookings" | "users";
}

export default function AdminShell({ children, activePage }: AdminShellProps) {
  const router = useRouter();

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

  const [authed, setAuthed] = useState(false);
  if (!authed) return null;

  const menu = [
    { label: "Dashboard", icon: "dashboard", href: "/admin", page: "dashboard" as const },
    { label: "Verifikasi Kos", icon: "verified_user", href: "/admin/kos", page: "verification" as const },
    { label: "Bookings", icon: "receipt_long", href: "/admin/bookings", page: "bookings" as const },
    { label: "Kelola User", icon: "group", href: "/admin/users", page: "users" as const },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-stack-sm bg-surface shadow-sm">
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col h-[calc(100vh-64px)] w-64 sticky top-16 p-stack-md border-r border-outline-variant bg-surface-container-low">
          <div className="mb-stack-lg px-2">
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
          <nav className="flex-1 space-y-2">
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
                </Link>
              );
            })}
          </nav>
          <div className="pt-stack-md border-t border-outline-variant space-y-2">
            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-md text-label-md">Settings</span>
            </Link>
            <Link href="/logout" className="flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/20 rounded-lg transition-all">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-label-md text-label-md">Logout</span>
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
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

      <Footer />
    </div>
  );
}
