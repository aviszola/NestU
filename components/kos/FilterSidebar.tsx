"use client";

import { useRouter } from "next/navigation";
import { facilityIcon } from "@/lib/facilities";
import { useState } from "react";

export default function FilterSidebar({
  facilities,
  selectedFacilities,
  minPrice,
  maxPrice,
  selectedType,
  currentSort,
}: {
  facilities: { id: string; name: string; icon: string | null }[];
  selectedFacilities: string[];
  minPrice?: number;
  maxPrice?: number;
  selectedType: string;
  currentSort: string;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const updateFilter = (key: string, value: any) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "") {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    router.push(`/kos?${params.toString()}`);
  };

  const toggleFacility = (facilityId: string) => {
    const newFacilities = selectedFacilities.includes(facilityId)
      ? selectedFacilities.filter((f: string) => f !== facilityId)
      : [...selectedFacilities, facilityId];
    updateFilter("facilities", newFacilities.join(","));
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sticky top-24">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full font-bold text-lg mb-4"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined">filter_list</span>
          Filter
        </span>
        <span className="material-symbols-outlined">
          {isExpanded ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isExpanded && (
        <>
          {/* Harga Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Harga Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                defaultValue={minPrice || ""}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              <input
                type="number"
                placeholder="Max"
                defaultValue={maxPrice || ""}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Tipe Kos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Kos
            </label>
            <select
              defaultValue={selectedType || ""}
              onChange={(e) => updateFilter("type", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary focus:border-primary"
            >
              <option value="">Semua Tipe</option>
              <option value="putra">Putra</option>
              <option value="putri">Putri</option>
              <option value="campur">Campur</option>
            </select>
          </div>

          {/* Fasilitas Utama */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fasilitas Utama
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {facilities.map((fac) => (
                <label
                  key={fac.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedFacilities.includes(fac.id)}
                    onChange={() => toggleFacility(fac.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="material-symbols-outlined text-sm">
                    {facilityIcon(fac)}
                  </span>
                  {fac.name}
                </label>
              ))}
            </div>
          </div>

          {/* Urutkan */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urutkan
            </label>
            <select
              defaultValue={currentSort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary focus:border-primary"
            >
              <option value="newest">Terbaru</option>
              <option value="cheapest">Termurah</option>
              <option value="expensive">Termahal</option>
              <option value="rating">Rating Tertinggi</option>
            </select>
          </div>

          {/* Reset Filter */}
          <button
            onClick={() => {
              const params = new URLSearchParams();
              const search = new URLSearchParams(
                window.location.search
              ).get("search");
              if (search) params.set("search", search);
              router.push(`/kos?${params.toString()}`);
            }}
            className="w-full py-2 text-sm text-primary font-medium hover:underline transition"
          >
            Reset Filter
          </button>
        </>
      )}
    </div>
  );
}
