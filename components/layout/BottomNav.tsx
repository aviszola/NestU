import Link from "next/link";

interface BottomNavProps {
  activePage: "search" | "favorites" | "bookings" | "profile";
  userRole?: "admin" | "siswa" | "pemilik";
}

interface Tab {
  label: string;
  icon: string;
  href: string;
  page: "search" | "favorites" | "bookings" | "profile";
}

// Satu-satunya bottom nav NestU — label Bahasa Indonesia konsisten di semua halaman
const studentTabs: Tab[] = [
  { label: "Cari", icon: "search", href: "/kos", page: "search" },
  { label: "Favorit", icon: "favorite", href: "/favorites", page: "favorites" },
  { label: "Booking", icon: "receipt_long", href: "/bookings", page: "bookings" },
  { label: "Profil", icon: "person", href: "/profile", page: "profile" },
];

export default function BottomNav({ activePage, userRole = "siswa" }: BottomNavProps) {
  // Role selain siswa tidak pakai bottom nav mobile publik
  if (userRole !== "siswa") return null;
  const tabs = studentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface rounded-t-xl shadow-lg border-t border-outline-variant z-40 safe-area-bottom">
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.page === activePage;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] min-w-[68px] rounded-full px-3 transition-all ${
                isActive
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:text-on-surface"
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
