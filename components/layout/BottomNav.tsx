import Link from "next/link";

interface BottomNavProps {
  activePage: "dashboard" | "search" | "favorites" | "bookings" | "profile" | "properties";
  userRole?: "admin" | "siswa" | "pemilik";
}

interface Tab {
  label: string;
  icon: string;
  href: string;
  page: "dashboard" | "search" | "favorites" | "bookings" | "profile" | "properties";
}

const adminTabs: Tab[] = [
  { label: "Dashboard", icon: "dashboard", href: "/admin", page: "dashboard" },
  { label: "Favorites", icon: "favorite", href: "/admin/favorites", page: "favorites" },
  { label: "Bookings", icon: "receipt_long", href: "/admin/bookings", page: "bookings" },
  { label: "Profile", icon: "person", href: "/admin/profile", page: "profile" },
];

const studentTabs: Tab[] = [
  { label: "Search", icon: "search", href: "/student/search", page: "search" },
  { label: "Favorites", icon: "favorite", href: "/student/favorites", page: "favorites" },
  { label: "Bookings", icon: "receipt_long", href: "/student/bookings", page: "bookings" },
  { label: "Profile", icon: "person", href: "/student/profile", page: "profile" },
];

const ownerTabs: Tab[] = [
  { label: "Dashboard", icon: "dashboard", href: "/owner", page: "dashboard" },
  { label: "Kelola", icon: "home_work", href: "/owner/properties", page: "properties" },
  { label: "Favorit", icon: "favorite", href: "/owner/favorites", page: "favorites" },
  { label: "Profil", icon: "person", href: "/owner/profile", page: "profile" },
];

export default function BottomNav({ activePage, userRole = "siswa" }: BottomNavProps) {
  const tabs = userRole === "admin" ? adminTabs : userRole === "pemilik" ? ownerTabs : studentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface rounded-t-xl shadow-lg border-t border-outline-variant z-40 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = tab.page === activePage;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                isActive
                  ? "bg-primary-container text-on-primary-container rounded-full px-4 py-1"
                  : "text-on-surface-variant hover:text-on-surface px-3 py-1.5"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
