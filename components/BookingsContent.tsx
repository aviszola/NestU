"use client";

import { useState } from "react";
import Link from "next/link";

type FilterTab = "all" | "active" | "history";

interface Booking {
  id: string;
  status: string;
  created_at: string;
  move_in_date?: string;
  notes?: string;
  rooms?: {
    room_number?: string;
    price_per_month?: number;
    kos?: {
      name?: string;
      foto?: string[];
    };
  };
}

interface Props {
  bookings: Booking[];
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Bookings" },
  { key: "active", label: "Active" },
  { key: "history", label: "History" },
];

const statusCfg: Record<
  string,
  { label: string; dot?: boolean; icon?: string; style: string }
> = {
  pending: {
    label: "Menunggu",
    dot: true,
    style:
      "bg-on-tertiary-container/10 text-on-tertiary-container",
  },
  approved: {
    label: "Disetujui",
    icon: "verified",
    style: "bg-secondary/10 text-secondary border border-secondary/20",
  },
  completed: {
    label: "Selesai",
    icon: "task_alt",
    style: "bg-primary-container text-on-primary-container",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: "cancel",
    style: "bg-error-container text-error",
  },
};

function formatBookingId(id: string): string {
  return `#SL-${id.slice(-4).toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BookingsContent({ bookings }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "active")
      return b.status === "pending" || b.status === "approved";
    return b.status === "completed" || b.status === "cancelled";
  });

  return (
    <>
      {/* Page Header */}
      <div className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Booking History
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Review your past stays and manage your upcoming reservations.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-stack-md border-b border-outline-variant">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-stack-sm border-b-2 font-label-md text-label-md transition-colors ${
                isActive
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline">
            calendar_month
          </span>
          <p className="mt-3 text-on-surface-variant font-body-md text-body-md">
            {bookings.length === 0
              ? "Belum ada booking."
              : "Tidak ada booking dengan filter ini."}
          </p>
          <Link
            href="/kos"
            className="mt-4 inline-block px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all"
          >
            Cari Kos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {filtered.map((b) => {
            const cfg = statusCfg[b.status] ?? statusCfg.pending;
            const isPast =
              b.status === "completed" || b.status === "cancelled";
            const imgSrc =
              b.rooms?.kos?.foto?.[0] ?? "/images/property-placeholder.jpg";

            return (
              <div
                key={b.id}
                className={`rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col bg-white/80 backdrop-blur-[12px] border border-outline-variant/50 group ${
                  isPast
                    ? "grayscale-[0.3] opacity-90 hover:grayscale-0 hover:opacity-100"
                    : ""
                }`}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={b.rooms?.kos?.name ?? "Property"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/property-placeholder.jpg";
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md ${cfg.style}`}
                    >
                      {cfg.dot && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                      {cfg.icon && (
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {cfg.icon}
                        </span>
                      )}
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-stack-md flex flex-col flex-grow">
                  <h3 className="font-title-lg text-title-lg text-primary mb-1">
                    {b.rooms?.kos?.name ?? "Kos"}
                  </h3>
                  <div className="flex items-center gap-2 text-on-surface-variant mb-stack-sm">
                    <span className="material-symbols-outlined text-sm">
                      bed
                    </span>
                    <span className="font-body-sm text-body-sm">
                      {b.rooms?.room_number ?? "Standard Room"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-stack-md bg-surface-container-low p-3 rounded-lg">
                    <div>
                      <p className="font-label-md text-[10px] uppercase text-outline mb-1">
                        Check-in
                      </p>
                      <p className="font-body-md text-body-md font-semibold">
                        {b.move_in_date
                          ? formatDate(b.move_in_date)
                          : formatDate(b.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="font-label-md text-[10px] uppercase text-outline mb-1">
                        Booking ID
                      </p>
                      <p className="font-body-md text-body-md font-semibold">
                        {formatBookingId(b.id)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-primary">
                      Rp{" "}
                      {(b.rooms?.price_per_month ?? 0).toLocaleString(
                        "id-ID"
                      )}
                      <span className="text-body-sm font-normal text-on-surface-variant">
                        {" "}
                        / mo
                      </span>
                    </span>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="bg-primary text-white px-4 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      Details
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward_ios
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help CTA */}
      <section className="mt-stack-lg p-stack-lg rounded-2xl bg-primary relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        <div className="relative z-10 flex-1">
          <h2 className="font-headline-lg text-headline-lg text-white mb-4">
            Need help with your booking?
          </h2>
          <p className="font-body-lg text-body-lg text-white/80 max-w-xl">
            Our support team is available 24/7 to assist with payment
            issues, property disputes, or move-in logistics. We&apos;re
            here to ensure your student living experience is seamless.
          </p>
        </div>
        <div className="relative z-10">
          <Link
            href="/support"
            className="inline-block bg-white text-primary px-8 py-4 rounded-xl font-bold font-title-lg text-title-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </>
  );
}
