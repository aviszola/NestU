"use client";

import Link from "next/link";

interface Rental {
  id: string;
  move_in_date: string | null;
  duration_months: number | null;
  total_amount: number | null;
  created_at: string;
  rooms?: {
    room_number?: string;
    price_per_month?: number;
  };
  kos_name?: string;
  kos_address?: string | null;
  kos_whatsapp?: string | null;
  kos_foto?: string[];
  owner_name?: string;
  fasilitas?: { id: string; name: string; icon: string | null }[];
}

interface Props {
  rentals: Rental[];
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

/** Tanggal berakhir = move_in_date + duration_months (akhir bulan terakhir). */
function getEndDate(r: Rental): Date | null {
  if (!r.move_in_date) return null;
  const start = new Date(r.move_in_date);
  if (isNaN(start.getTime())) return null;
  const months = r.duration_months && r.duration_months > 0 ? r.duration_months : 1;
  return new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
}

export default function RentalsContent({ rentals }: Props) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <>
      {/* Page Header */}
      <div className="mb-stack-lg">
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-2">
          Kamar Saya
        </h1>
        <p className="text-sm md:text-base font-normal text-on-surface-variant leading-relaxed">
          Kamar kos yang sudah Anda sewa dan bayar.
        </p>
      </div>

      {rentals.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline block mb-3">
            home_work
          </span>
          <h3 className="text-lg font-bold text-on-surface">
            Belum ada kamar yang disewa
          </h3>
          <p className="text-sm font-normal text-on-surface-variant mt-1 max-w-sm mx-auto leading-relaxed">
            Setelah booking Anda disetujui dan pembayaran lunas, kamar akan
            muncul di sini.
          </p>
          <Link
            href="/kos"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined !text-[18px]">search</span>
            Cari Kos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {rentals.map((r) => {
            const end = getEndDate(r);
            const isExpired = end !== null && end < now;
            const foto = r.kos_foto?.[0] ?? "/images/property-placeholder.jpg";
            return (
              <Link
                key={r.id}
                href={`/rental/${r.id}`}
                className="group rounded-2xl overflow-hidden bg-surface-container-lowest card-shadow border border-outline-variant hover:card-shadow-hover transition-all flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt={r.kos_name ?? "Kos"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/property-placeholder.jpg";
                    }}
                  />
                  <span
                    className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md ${
                      isExpired
                        ? "bg-surface/80 text-on-surface-variant"
                        : "bg-secondary/90 text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined !text-[14px]">
                      {isExpired ? "schedule" : "check_circle"}
                    </span>
                    {isExpired ? "Berakhir" : "Aktif"}
                  </span>
                </div>

                {/* Body */}
                <div className="p-stack-md flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors mb-1 truncate">
                    {r.kos_name ?? "Kos"}
                  </h3>
                  <p className="text-xs font-normal text-on-surface-variant flex items-center gap-1 mb-stack-md truncate">
                    <span className="material-symbols-outlined !text-[14px] text-outline">location_on</span>
                    {r.kos_address ?? "Alamat tidak tersedia"}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-stack-md bg-surface-container-low p-3 rounded-lg">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">
                        Kamar
                      </p>
                      <p className="text-sm font-semibold text-on-surface">
                        {r.rooms?.room_number ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">
                        Berakhir
                      </p>
                      <p className="text-sm font-semibold text-on-surface">
                        {end ? formatDate(end.toISOString()) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-outline-variant/20">
                    <span className="text-base font-bold text-primary">
                      {formatPrice(r.rooms?.price_per_month)}
                      <span className="text-xs font-normal text-on-surface-variant">
                        {" "}
                        / bulan
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-semibold text-xs group-hover:underline">
                      Detail
                      <span className="material-symbols-outlined text-xs">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
