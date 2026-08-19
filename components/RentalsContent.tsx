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
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Kamar Saya
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Kamar kos yang sudah Anda sewa dan bayar.
        </p>
      </div>

      {rentals.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline block mb-3">
            home_work
          </span>
          <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
            Belum ada kamar yang disewa
          </h3>
          <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
            Setelah booking Anda disetujui dan pembayaran lunas, kamar akan
            muncul di sini.
          </p>
          <Link
            href="/kos"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
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
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md ${
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
                  <h3 className="font-title-lg text-title-lg text-primary mb-1 truncate">
                    {r.kos_name ?? "Kos"}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-1 mb-stack-md truncate">
                    <span className="material-symbols-outlined !text-[14px]">location_on</span>
                    {r.kos_address ?? "Alamat tidak tersedia"}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-stack-md bg-surface-container-low p-3 rounded-lg">
                    <div>
                      <p className="font-label-md text-[10px] uppercase text-outline mb-1">
                        Kamar
                      </p>
                      <p className="font-body-md font-semibold">
                        {r.rooms?.room_number ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="font-label-md text-[10px] uppercase text-outline mb-1">
                        Berakhir
                      </p>
                      <p className="font-body-md font-semibold">
                        {end ? formatDate(end.toISOString()) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-primary">
                      {formatPrice(r.rooms?.price_per_month)}
                      <span className="text-body-sm font-normal text-on-surface-variant">
                        {" "}
                        / bulan
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-bold text-label-md">
                      Detail
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward_ios
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
