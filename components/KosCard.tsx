import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import { FACILITY_ICONS, facilityIcon } from "@/lib/facilities";

export { FACILITY_ICONS, facilityIcon };

export default function KosCard({
  kos,
  showFavorite = false,
  showRating = false,
  showDistance = false,
  minPrice,
}: {
  kos: any;
  showFavorite?: boolean;
  showRating?: boolean;
  showDistance?: boolean;
  minPrice?: number | null;
}) {
  const facilities = kos.facilities || kos.fasilitas || [];
  const foto = kos.foto?.[0] || kos.images?.[0];
  const price = minPrice || kos.price;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-100 group">
      {/* Gambar */}
      <div className="relative h-48 bg-surface-container-high overflow-hidden">
        {foto ? (
          <Image
            src={foto}
            alt={kos.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest relative overflow-hidden">
            {/* Grid pattern halus - kesan "belum difoto" yang disengaja */}
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,35,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,35,111,0.12) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-3xl text-secondary-fixed">home</span>
            </div>
            <span className="text-[11px] font-semibold text-on-surface-variant/80 relative">
              Foto menyusul
            </span>
            <span className="text-[10px] text-on-surface-variant/50 relative">
              Pemilik sedang mengunggah
            </span>
          </div>
        )}
        {showFavorite && (
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton
              kosId={kos.id}
              initialFavorited={kos.isFavorited || false}
              loggedIn={true}
            />
          </div>
        )}
      </div>

      {/* Konten */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/kos/${kos.id}`}
            className="flex-1 min-w-0 group-hover:text-primary transition-colors"
          >
            <h3 className="font-bold text-lg text-on-surface leading-snug line-clamp-1">
              {kos.name}
            </h3>
          </Link>
          {showRating && (
            <span className="flex items-center gap-1 text-sm text-yellow-500 font-medium whitespace-nowrap">
              <span className="material-symbols-outlined text-yellow-500 text-sm">
                star
              </span>
              {kos.rating || "4.5"}
            </span>
          )}
        </div>

        {showDistance && kos.distance_to_school_km != null && (
          <p className="text-xs md:text-sm text-on-surface-variant mt-1 flex items-center gap-1 font-normal">
            <span className="material-symbols-outlined text-sm text-outline">
              location_on
            </span>
            {kos.distance_to_school_km.toFixed(1)} km dari sekolah
          </p>
        )}

        {/* Fasilitas */}
        {facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {facilities.slice(0, 3).map((f: any, i: number) => (
              <span
                key={f.id || i}
                className="flex items-center gap-1 text-xs font-medium bg-surface-container-low px-2 py-1 rounded-md text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">
                  {facilityIcon(f)}
                </span>
                {f.name}
              </span>
            ))}
            {facilities.length > 3 && (
              <span className="text-xs font-medium text-outline self-center">
                +{facilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Harga & Detail */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/30">
          <span className="text-primary font-bold text-sm md:text-base">
            {price != null
              ? `Rp${price.toLocaleString("id-ID")}/bln`
              : "Harga belum tersedia"}
          </span>
          <Link
            href={`/kos/${kos.id}`}
            className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Detail
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
