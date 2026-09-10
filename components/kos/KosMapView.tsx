"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon (sama dgn MapPicker)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface KosMapItem {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  foto?: string[] | null;
  minPrice?: number;
}

/**
 * Peta sebaran kos hasil pencarian /kos.
 * Hanya menampilkan kos yang punya koordinat valid.
 * Klik pin → popup info singkat + link ke detail kos.
 */
export default function KosMapView({ items }: { items: KosMapItem[] }) {
  const withCoords = useMemo(
    () =>
      items.filter(
        (k): k is KosMapItem & { latitude: number; longitude: number } =>
          k.latitude !== null &&
          k.longitude !== null &&
          !Number.isNaN(k.latitude) &&
          !Number.isNaN(k.longitude)
      ),
    [items]
  );

  const bounds = useMemo(() => {
    if (withCoords.length === 0) return null;
    return L.latLngBounds(withCoords.map((k) => [k.latitude, k.longitude]));
  }, [withCoords]);

  if (withCoords.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl text-outline/40 mb-3">
          location_off
        </span>
        <p className="text-sm font-semibold text-on-surface">
          Tidak ada kos dengan lokasi peta pada hasil ini
        </p>
        <p className="text-xs mt-1">
          Coba ubah filter atau kata kunci pencarian.
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      bounds={bounds!}
      boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
      scrollWheelZoom
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((k) => (
        <Marker key={k.id} position={[k.latitude, k.longitude]} icon={icon}>
          <Popup maxWidth={280}>
            <div className="min-w-[180px]">
              {k.foto && k.foto[0] && (
                <img
                  src={k.foto[0]}
                  alt={k.name}
                  className="w-full h-24 object-cover rounded-md mb-2"
                  loading="lazy"
                />
              )}
              <p className="text-sm font-bold text-on-surface leading-snug">
                {k.name}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                {k.address}
              </p>
              {k.minPrice != null && (
                <p className="text-sm font-semibold text-primary mt-1">
                  Rp {k.minPrice.toLocaleString("id-ID")}/bln
                </p>
              )}
              <Link
                href={`/kos/${k.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                Lihat detail
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}