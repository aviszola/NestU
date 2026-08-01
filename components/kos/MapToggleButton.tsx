"use client";

export default function MapToggleButton() {
  return (
    <button
      type="button"
      onClick={() => {}}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
    >
      {/* TODO: implement map view toggle */}
      <span className="material-symbols-outlined text-lg">map</span>
      Lihat Peta
    </button>
  );
}
