"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";

export type ActivePage = "dashboard" | "search" | "favorites" | "bookings" | "profile" | "properties";

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
  { label: "Verifikasi Kos", icon: "apartment", href: "/admin/kos", page: "properties" },
  { label: "Bookings", icon: "receipt_long", href: "/admin/bookings", page: "bookings" },
];

const studentMenu: MenuItem[] = [
  { label: "Search", icon: "search", href: "/kos", page: "search" },
  { label: "Favorites", icon: "favorite", href: "/favorites", page: "favorites" },
  { label: "My Bookings", icon: "receipt_long", href: "/bookings", page: "bookings" },
  { label: "Profile", icon: "person", href: "/profile", page: "profile" },
];

const ownerMenu: MenuItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/owner", page: "dashboard" },
  { label: "Kelola Properti", icon: "apartment", href: "/owner/kos", page: "properties" },
  { label: "Booking Masuk", icon: "receipt_long", href: "/owner/bookings", page: "bookings" },
  { label: "Profile", icon: "person", href: "/owner/profile", page: "profile" },
];

const ownerBottomItems: BottomItem[] = [
  { label: "Settings", icon: "settings", href: "/owner/settings" },
  { label: "Logout", icon: "logout", href: "/logout" },
];

const bottomItems: BottomItem[] = [
  { label: "Settings", icon: "settings", href: "/settings" },
  { label: "Logout", icon: "logout", href: "/logout" },
];

export default function Sidebar({ activePage, userRole = "siswa", userName }: SidebarProps) {
  const topMenu = userRole === "admin" ? adminMenu : userRole === "pemilik" ? ownerMenu : studentMenu;
  const bottom = userRole === "pemilik" ? ownerBottomItems : bottomItems;

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-surface-container-low border-r border-outline-variant z-30">
      {/* Logo + User Name */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant">
        <Logo variant="icon" className="h-7 w-auto text-primary" />
        <div>
          <span className="text-base font-bold text-primary">Nets</span>
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
            </Link>
          );
        })}
      </nav>

      {/* Bottom menu (Settings, Logout) */}
      <div className="px-3 py-4 space-y-1 border-t border-outline-variant">
        {bottom.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
