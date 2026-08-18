"use client";

import Link from "next/link";
import Image from "next/image";
import NotifBell from "@/components/layout/NotifBell";

interface TabItem {
  label: string;
  href: string;
  active?: boolean;
}

interface TopNavProps {
  userAvatar?: string;
  userName?: string;
  userRole?: "admin" | "siswa" | "pemilik";
  onMenuClick?: () => void;
  tabs?: TabItem[];
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export default function TopNav({
  userAvatar = "/images/avatar-placeholder.svg",
  userName,
  userRole = "siswa",
  onMenuClick,
  tabs,
  showBackButton = false,
  onBackClick,
  showSearch = false,
  searchPlaceholder = "Cari...",
  searchValue = "",
  onSearchChange,
}: TopNavProps) {
  const title =
    userRole === "admin"
      ? "Dashboard NestU"
      : userRole === "pemilik"
        ? "Owner Dashboard"
        : "NestU";
  const subtitle =
    userRole === "admin" ? "Welcome back, Admin" : undefined;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-3 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
      {/* Left: Back button + Hamburger + Title */}
      <div className="flex items-center gap-4">
        {/* Back button */}
        {showBackButton && (
          <button
            type="button"
            onClick={onBackClick}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div>
          <h1 className="text-lg font-semibold text-on-surface">{title}</h1>
          {subtitle && (
            <p className="text-xs text-outline mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center: Tabs or Search */}
      {showSearch ? (
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-outline">search</span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>
      ) : (
      <div className="hidden md:flex items-center gap-6">
        {tabs &&
          tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`text-sm font-medium transition-colors ${
                tab.active
                  ? "text-on-surface border-b-2 border-on-surface"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              {tab.label}
            </Link>
          ))}
      </div>
      )}

      {/* Right: Help + Notifications + Avatar */}
      <div className="flex items-center gap-3">
        {/* Help */}
        <button
          type="button"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          aria-label="Help"
        >
          <span className="material-symbols-outlined">help</span>
        </button>

        {/* Notifications */}
        <NotifBell />

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-surface-container overflow-hidden relative" style={{ position: "relative" }}>
          <Image
            src={userAvatar}
            alt={userName || "Avatar"}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>
      </div>
    </header>
  );
}
