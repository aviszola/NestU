"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TxFilters } from "@/lib/supabase/transactions";

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "belum_bayar", label: "Belum Bayar" },
  { value: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { value: "lunas", label: "Lunas" },
  { value: "expired", label: "Kadaluarsa" },
];

const BOOKING_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

const REFUND_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
];

function buildQuery(filters: TxFilters): string {
  const params = new URLSearchParams(window.location.search);
  params.delete("page");
  const setParam = (key: string, value: string | null | undefined) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  setParam("search", filters.search);
  setParam("method", filters.method && filters.method !== "all" ? filters.method : null);
  setParam("from", filters.from);
  setParam("to", filters.to);
  if (filters.minAmount != null) setParam("min", String(filters.minAmount));
  else params.delete("min");
  if (filters.maxAmount != null) setParam("max", String(filters.maxAmount));
  else params.delete("max");
  params.delete("status");
  for (const s of filters.paymentStatuses ?? []) params.append("status", s);
  params.delete("booking");
  for (const s of filters.bookingStatuses ?? []) params.append("booking", s);
  params.delete("refund");
  for (const s of filters.refundStatuses ?? []) params.append("refund", s);
  const qs = params.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

interface TransactionFiltersProps {
  initial: TxFilters;
  collapsible?: boolean;
}

export default function TransactionFilters({
  initial,
  collapsible = true,
}: TransactionFiltersProps) {
  const router = useRouter();
  const [state, setState] = useState<TxFilters>({
    search: "",
    paymentStatuses: [],
    bookingStatuses: [],
    method: "all",
    refundStatuses: [],
    from: null,
    to: null,
    minAmount: null,
    maxAmount: null,
    ...initial,
  });
  const [open, setOpen] = useState(!collapsible);

  const apply = (next: TxFilters) => {
    setState(next);
    router.push(buildQuery(next));
  };

  const reset = () => {
    const empty: TxFilters = {
      search: "",
      paymentStatuses: [],
      bookingStatuses: [],
      method: "all",
      refundStatuses: [],
      from: null,
      to: null,
      minAmount: null,
      maxAmount: null,
    };
    apply(empty);
  };

  const hasActive = Boolean(
    state.search ||
      (state.paymentStatuses?.length ?? 0) > 0 ||
      (state.bookingStatuses?.length ?? 0) > 0 ||
      (state.refundStatuses?.length ?? 0) > 0 ||
      (state.method && state.method !== "all") ||
      state.from ||
      state.to ||
      state.minAmount != null ||
      state.maxAmount != null
  );

  return (
    <div className="bg-surface-container-low rounded-xl card-shadow p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_alt</span>
          Filter
          {hasActive && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-bold">!</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button type="button" onClick={reset}
              className="flex items-center gap-1 text-sm font-medium text-error hover:bg-error-container/20 rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Reset Filter
            </button>
          )}
          {collapsible && (
            <button type="button" onClick={() => setOpen(!open)}
              className="flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-base">
                {open ? "expand_less" : "expand_more"}
              </span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
{/* Search */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Cari (Order ID / Siswa / Email / Kos)</span>
            <input type="text" value={state.search ?? ""} placeholder="Cari transaksi..."
              onChange={(e) => setState({ ...state, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply({ ...state, search: (e.target as HTMLInputElement).value });
              }}
              onBlur={(e) => apply({ ...state, search: e.target.value })}
              className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm" />
          </label>

          {/* Method */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Metode</span>
            <select
              value={state.method ?? "all"}
              onChange={(e) => apply({ ...state, method: e.target.value as TxFilters["method"] })}
              className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm">
              <option value="all">Semua</option>
              <option value="midtrans">Midtrans</option>
              <option value="manual">Manual Transfer</option>
            </select>
          </label>

          {/* Date from */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Tanggal Dari</span>
            <input type="date" value={state.from ?? ""}
              onChange={(e) => apply({ ...state, from: e.target.value || null })}
              className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm" />
          </label>

          {/* Date to */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Tanggal Ke</span>
            <input type="date" value={state.to ?? ""}
              onChange={(e) => apply({ ...state, to: e.target.value || null })}
              className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm" />
          </label>
{/* Payment status multi */}
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-on-surface-variant font-medium">Status Payment</legend>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((o) => {
                const on = (state.paymentStatuses ?? []).includes(o.value);
                return (
                  <label key={o.value} className={`cursor-pointer text-xs rounded-full px-2 py-1 border ${on ? "bg-primary/10 text-primary border-primary" : "bg-surface-container-high text-on-surface-variant border-outline-variant"}`}>
                    <input type="checkbox" checked={on}
                      onChange={() => apply({ ...state, paymentStatuses: toggle(state.paymentStatuses ?? [], o.value) })}
                      className="sr-only" />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Booking status multi */}
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-on-surface-variant font-medium">Status Booking</legend>
            <div className="flex flex-wrap gap-2">
              {BOOKING_OPTIONS.map((o) => {
                const on = (state.bookingStatuses ?? []).includes(o.value);
                return (
                  <label key={o.value} className={`cursor-pointer text-xs rounded-full px-2 py-1 border ${on ? "bg-primary/10 text-primary border-primary" : "bg-surface-container-high text-on-surface-variant border-outline-variant"}`}>
                    <input type="checkbox" checked={on}
                      onChange={() => apply({ ...state, bookingStatuses: toggle(state.bookingStatuses ?? [], o.value) })}
                      className="sr-only" />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
{/* Refund status multi */}
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-on-surface-variant font-medium">Refund Status</legend>
            <div className="flex flex-wrap gap-2">
              {REFUND_OPTIONS.map((o) => {
                const on = (state.refundStatuses ?? []).includes(o.value);
                return (
                  <label key={o.value} className={`cursor-pointer text-xs rounded-full px-2 py-1 border ${on ? "bg-primary/10 text-primary border-primary" : "bg-surface-container-high text-on-surface-variant border-outline-variant"}`}>
                    <input type="checkbox" checked={on}
                      onChange={() => apply({ ...state, refundStatuses: toggle(state.refundStatuses ?? [], o.value) })}
                      className="sr-only" />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Amount range */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Jumlah (Rp)</span>
            <div className="flex items-center gap-2">
              <input type="number" min={0} placeholder="Min"
                value={state.minAmount?.toString() ?? ""}
                onChange={(e) => setState({ ...state, minAmount: e.target.value === "" ? null : Number(e.target.value) })}
                onBlur={(e) => apply({ ...state, minAmount: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm" />
              <span className="text-on-surface-variant">–</span>
              <input type="number" min={0} placeholder="Max"
                value={state.maxAmount?.toString() ?? ""}
                onChange={(e) => setState({ ...state, maxAmount: e.target.value === "" ? null : Number(e.target.value) })}
                onBlur={(e) => apply({ ...state, maxAmount: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}