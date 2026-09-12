"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PRESETS = [
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
  { key: "90d", label: "90 hari" },
];

const pillBase =
  "px-3 py-1.5 rounded-full text-label-md font-bold transition";
const pillActive = "bg-primary text-on-primary";
const pillInactive =
  "bg-surface-container-high text-on-surface-variant hover:bg-surface-container";

/** Filter periode — preset + custom (URL-synced via router.replace). */
export default function PeriodFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function go(key: string) {
    setOpen(false);
    router.replace(`${pathname}?period=${key}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    router.replace(`${pathname}?from=${from}&to=${to}`);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => go(p.key)}
          className={`${pillBase} ${
            current === p.key || (current === "" && p.key === "30d")
              ? pillActive
              : pillInactive
          }`}
        >
          {p.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !from && !to) {
            const today = new Date();
            const iso = (d: Date) => d.toISOString().slice(0, 10);
            setFrom(iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)));
            setTo(iso(today));
          }
        }}
        className={`${pillBase} ${current === "custom" ? pillActive : pillInactive}`}
      >
        Custom
      </button>

      {open && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-high text-on-surface text-sm px-2 py-1"
          />
          <span className="text-outline">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-high text-on-surface text-sm px-2 py-1"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}