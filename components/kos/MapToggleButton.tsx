"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { KosMapItem } from "@/components/kos/KosMapView";

// react-leaflet tidak boleh dirender saat SSR — dynamic import ssr:false
// (pola sama dgn MapPicker).
const KosMapView = dynamic(() => import("@/components/kos/KosMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full flex items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin mr-2">
        progress_activity
      </span>
      Memuat peta...
    </div>
  ),
});

interface MapToggleProps {
  kos?: (KosMapItem & { isFavorited?: boolean })[] | null;
  minPriceMap?: Record<string, number>;
}

export default function MapToggleButton({ kos, minPriceMap }: MapToggleProps) {
  const [open, setOpen] = useState(false);

  const mapItems = useMemo<KosMapItem[]>(
    () =>
      (kos ?? []).map((k) => ({
        id: k.id,
        name: k.name,
        address: k.address,
        latitude: k.latitude,
        longitude: k.longitude,
        foto: k.foto,
        minPrice: minPriceMap?.[k.id],
      })),
    [kos, minPriceMap]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-lg">map</span>
        Lihat Peta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 md:p-6 animate-fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Peta lokasi kos"
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container/40 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">map</span>
                </div>
                <div>
                  <h2 className="font-title-lg text-title-lg text-on-surface font-bold leading-tight">
                    Peta Lokasi Kos
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {kos?.length ?? 0} hasil pencarian ditampilkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup peta"
                className="shrink-0 p-1 text-outline hover:text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-[480px]">
              <KosMapView items={mapItems} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
