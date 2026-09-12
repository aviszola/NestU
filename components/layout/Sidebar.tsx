"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/ui/Logo";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

export type ActivePage = "dashboard" | "analytics" | "search" | "favorites" | "bookings" | "rental" | "profile" | "properties" | "settings" | "reports" | "transactions";

interface SidebarProps {
  activePage: ActivePage;
  userRole?: "admin" | "siswa" | "pemilik";
  userName?: string;
}

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  page: ActivePage;
}

interface BottomItem {
  label: string;
  icon: string;
  href: string;
}

const adminMenu: MenuItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/admin", page: "dashboard" },
  { label: "Analytics", icon: "monitoring", href: "/admin/analytics", page: "analytics" },
  { label: "Verifikasi Kos", icon: "apartment", href: "/admin/kos", page: "properties" },
  { label: "Bookings", icon: "receipt_long", href: "/admin/bookings", page: "bookings" },
  { label: "Transaksi", icon: "payments", href: "/admin/transactions", page: "transactions" },
];

const studentMenu: MenuItem[] = [
  { label: "Cari", icon: "search", href: "/dashboard", page: "search" },
  { label: "Favorit", icon: "favorite", href: "/favorites", page: "favorites" },
  { label: "Booking", icon: "receipt_long", href: "/bookings", page: "bookings" },
  { label: "Kamar Saya", icon: "home_work", href: "/rental", page: "rental" },
];

const ownerMenu: MenuItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/owner", page: "dashboard" },
  { label: "Kelola Properti", icon: "apartment", href: "/owner/kos", page: "properties" },
  { label: "Booking Masuk", icon: "receipt_long", href: "/owner/bookings", page: "bookings" },
  { label: "Laporan", icon: "report_problem", href: "/owner/reports", page: "reports" },
];

const ownerBottomItems: BottomItem[] = [
  { label: "Pengaturan", icon: "settings", href: "/owner/settings" },
  { label: "Keluar", icon: "logout", href: "/logout" },
];

const bottomItems: BottomItem[] = [
  { label: "Pengaturan", icon: "settings", href: "/settings" },
  { label: "Keluar", icon: "logout", href: "/logout" },
];

export default function Sidebar({ activePage, userRole = "siswa", userName }: SidebarProps) {
  const topMenu = userRole === "admin" ? adminMenu : userRole === "pemilik" ? ownerMenu : studentMenu;
  const bottom = userRole === "pemilik" ? ownerBottomItems : bottomItems;

  // Badge jumlah laporan status 'baru' utk owner — pola refund badge AdminShell
  const [newReportCount, setNewReportCount] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);
  useEffect(() => {
    if (userRole !== "pemilik") return;
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const sup = createClient();
        const { count } = await sup
          .from("maintenance_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "baru");
        if (!cancelled) setNewReportCount(count ?? 0);
      } catch {
        // ignore — badge opsional
      }
    })();
    return () => { cancelled = true; };
  }, [userRole]);

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-surface-container-low border-r border-outline-variant z-30">
      {/* Logo + User Name */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant">
        <Logo variant="icon" className="h-8 w-auto text-primary" />
        <div>
          <span className="text-base font-bold text-primary">Nest</span>
          <span className="text-base font-bold text-secondary">U</span>
          {userName && (
            <p className="text-[10px] text-outline mt-0.5">{userName}</p>
          )}
        </div>
      </div>

      {/* Top navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {topMenu.map((item) => {
          const isActive = item.page === activePage;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-bold shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {item.page === "reports" && newReportCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-error text-white text-[11px] font-bold">
                  {newReportCount > 9 ? "9+" : newReportCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom menu (Settings, Logout) */}
      <div className="px-3 py-4 space-y-1 border-t border-outline-variant">
        {bottom.map((item) =>
          item.label === "Keluar" ? (
            <button
              key={item.label}
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-left"
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        )}
      </div>

      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </aside>
  );
}
