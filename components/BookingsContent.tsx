"use client";

import { useState } from "react";
import Link from "next/link";
import { getBookingStatus } from "@/lib/bookingStatus";

type FilterTab = "all" | "active" | "history";

interface Booking {
  id: string;
  status: string;
  payment_status?: string;
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
  { key: "all", label: "Semua Booking" },
  { key: "active", label: "Aktif" },
  { key: "history", label: "Riwayat" },
];

function formatBookingId(id: string): string {
  return `#SL-${id.slice(-4).toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
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
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-2">
          Riwayat Booking
        </h1>
        <p className="text-sm md:text-base font-normal text-on-surface-variant leading-relaxed">
          Tinjau masa inap Anda sebelumnya dan kelola reservasi Anda berikutnya.
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
              className={`pb-stack-sm border-b-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-on-surface-variant hover:text-primary font-medium"
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
          <p className="mt-3 text-on-surface-variant text-sm font-normal">
            {bookings.length === 0
              ? "Belum ada booking."
              : "Tidak ada booking dengan filter ini."}
          </p>
          <Link
            href="/kos"
            className="mt-4 inline-block px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:opacity-90 active:scale-95 transition-all"
          >
            Cari Kos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {filtered.map((b) => {
            const cfg = getBookingStatus(b);
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
                </div>

                {/* Body */}
                <div className="p-stack-md flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                    {b.rooms?.kos?.name ?? "Kos"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-on-surface-variant mb-3">
                    <span className="material-symbols-outlined text-sm text-outline">
                      bed
                    </span>
                    <span className="text-xs font-normal text-on-surface-variant">
                      {b.rooms?.room_number ?? "Kamar Standar"}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-stack-md flex">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${cfg.className}`}
                    >
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

                  <div className="grid grid-cols-2 gap-4 mb-stack-md bg-surface-container-low p-3 rounded-lg">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">
                        TANGGAL MASUK
                      </p>
                      <p className="text-sm font-semibold text-on-surface">
                        {b.move_in_date
                          ? formatDate(b.move_in_date)
                          : formatDate(b.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">
                        ID BOOKING
                      </p>
                      <p className="text-sm font-semibold text-on-surface">
                        {formatBookingId(b.id)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-outline-variant/20">
                    <span className="text-base font-bold text-primary">
                      Rp{" "}
                      {(b.rooms?.price_per_month ?? 0).toLocaleString(
                        "id-ID"
                      )}
                      <span className="text-xs font-normal text-on-surface-variant">
                        {" "}
                        / bln
                      </span>
                    </span>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="bg-primary text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      Detail
                      <span className="material-symbols-outlined text-xs">
                        arrow_forward
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
            Butuh bantuan dengan booking Anda?
          </h2>
          <p className="font-body-lg text-body-lg text-white/80 max-w-xl">
            Tim dukungan kami tersedia 24/7 untuk membantu masalah pembayaran, perselisihan properti, atau logistik masuk. Kami di sini untuk memastikan pengalaman tinggal Anda lancar.
          </p>
        </div>
        <div className="relative z-10">
          <Link
            href="/support"
            className="inline-block bg-white text-primary px-8 py-4 rounded-xl font-bold font-title-lg text-title-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Hubungi Dukungan
          </Link>
        </div>
      </section>
    </>
  );
}
