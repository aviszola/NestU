"use client";

import { formatRupiah } from "@/lib/supabase/analytics";
import type { TxStats } from "@/lib/supabase/transactions";

interface TransactionStatsProps {
  stats: TxStats;
  hasFilter: boolean;
}

export default function TransactionStats({
  stats,
  hasFilter,
}: TransactionStatsProps) {
  const cards = [
    {
      icon: "receipt_long",
      label: "Total Transaksi",
      value: new Intl.NumberFormat("id-ID").format(stats.totalCount),
      sub: hasFilter ? "diper filter" : "semua transaksi",
      className: "text-on-surface",
    },
    {
      icon: "payments",
      label: "Total Nilai",
      value: formatRupiah(stats.totalValue),
      sub: "sum total_amount",
      className: "text-on-surface",
    },
    {
      icon: "check_circle",
      label: "Lunas",
      value: formatRupiah(stats.lunasValue),
      sub: `${stats.lunasCount} transaksi lunas`,
      className: "text-secondary",
      chip: "bg-secondary/10 text-secondary",
    },
    {
      icon: "hourglass_top",
      label: "Pending / Menunggu Konfirmasi",
      value: formatRupiah(stats.pendingValue),
      sub: `${stats.pendingCount} transaksi`,
      className: "text-tertiary",
      chip: "bg-tertiary/10 text-tertiary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-surface-container-lowest rounded-xl card-shadow p-5 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-primary text-lg">{c.icon}</span>
            <span>{c.label}</span>
          </div>
          <div className={`text-2xl font-bold ${c.className}`}>{c.value}</div>
          <div className="text-xs text-outline">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}