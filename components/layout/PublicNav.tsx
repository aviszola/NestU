import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo variant="full" className="h-10 w-auto text-primary" />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/kos" className="flex flex-col items-center text-xs font-medium text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">search</span>
            Search
          </Link>
          <Link href="/favorites" className="flex flex-col items-center text-xs font-medium text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">favorite</span>
            Favorites
          </Link>
          <Link href="/bookings" className="flex flex-col items-center text-xs font-medium text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
            My Bookings
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-xs font-medium text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">person</span>
            Profile
          </Link>
        </nav>
        <button className="md:hidden p-1" aria-label="Menu">
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>
      </div>
    </header>
  );
}
