import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "./FavoriteButton";

const FACILITY_ICONS: Record<string, string> = {
  wifi: "wifi",
  ac: "ac_unit",
  "kamar mandi": "bathroom",
  bathroom: "bathroom",
  dapur: "kitchen",
  kitchen: "kitchen",
  listrik: "bolt",
  keamanan: "shield",
  security: "shield",
  parkir: "local_parking",
  parking: "local_parking",
  tv: "tv",
  lemari: "checklist",
  meja: "table_restaurant",
  kasur: "bed",
};

function getIcon(name: string) {
  return FACILITY_ICONS[name.toLowerCase()] ?? "check";
}

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
            {/* Grid pattern halus — kesan "belum difoto" yang disengaja */}
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,35,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,35,111,0.12) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <span className="material-symbols-outlined text-3xl text-primary/30 relative">photo_camera</span>
            <span className="text-[11px] font-medium text-on-surface-variant/70 relative">
              Foto belum tersedia
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
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-gray-400">
              location_on
            </span>
            {kos.distance_to_school_km.toFixed(1)} km dari sekolah
          </p>
        )}

        {/* Fasilitas */}
        {facilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {facilities.slice(0, 3).map((f: any, i: number) => (
              <span
                key={f.id || i}
                className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {f.icon || getIcon(f.name)}
                </span>
                {f.name}
              </span>
            ))}
            {facilities.length > 3 && (
              <span className="text-xs text-outline">
                +{facilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Harga & Detail */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-primary font-bold text-sm">
            {price != null
              ? `Rp${price.toLocaleString("id-ID")}/bln`
              : "Harga belum tersedia"}
          </span>
          <Link
            href={`/kos/${kos.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Detail
          </Link>
        </div>
      </div>
    </div>
  );
}
