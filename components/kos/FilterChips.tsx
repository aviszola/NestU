"use client";

import { useRouter } from "next/navigation";

export default function FilterChips({
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
  const hasFilters =
    selectedFacilities.length > 0 ||
    minPrice ||
    maxPrice ||
    selectedType ||
    currentSort !== "newest";

  const clearFilters = () => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    const newParams = new URLSearchParams();
    if (search) newParams.set("search", search);
    router.push(`/kos?${newParams.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium hover:bg-gray-200 transition"
        >
          <span className="material-symbols-outlined text-sm">close</span>
          Reset Filter
        </button>
      )}
      {selectedType && (
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          {selectedType}
        </span>
      )}
      {selectedFacilities.length > 0 && (
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          {selectedFacilities.length} Fasilitas
        </span>
      )}
      {(minPrice || maxPrice) && (
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          Rp {minPrice || "0"} &ndash; {maxPrice || "∞"}
        </span>
      )}
      {currentSort !== "newest" && (
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          {currentSort === "cheapest" && "Termurah"}
          {currentSort === "expensive" && "Termahal"}
          {currentSort === "rating" && "Rating Tertinggi"}
        </span>
      )}
    </div>
  );
}
