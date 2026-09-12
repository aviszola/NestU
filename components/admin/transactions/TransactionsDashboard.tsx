"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/layout/AdminShell";
import TransactionFilters from "./TransactionFilters";
import TransactionStats from "./TransactionStats";
import TransactionsTable from "./TransactionsTable";
import TransactionDetail from "./TransactionDetail";
import AnomalyList from "./AnomalyList";
import { toCsv, downloadCsv, transactionsCsvName } from "@/lib/csv";
import type {
  TransactionRow,
  TxFilters,
  TxStats,
  AnomalyItem,
} from "@/lib/supabase/transactions";

const DISMISS_KEY = "tx-anomaly-dismissed";

interface TransactionsDashboardProps {
  rows: TransactionRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  filters: TxFilters;
  stats: TxStats;
  anomalies: AnomalyItem[];
}

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export default function TransactionsDashboard({
  rows,
  total,
  currentPage,
  totalPages,
  filters,
  stats,
  anomalies: serverAnomalies,
}: TransactionsDashboardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState("");

  const visibleAnomalies = serverAnomalies.filter((a) => !dismissed.includes(a.id));

  const goPage = (p: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(p));
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const openDetail = (r: TransactionRow) => {
    setDetailBookingId(r.bookingId);
    setDetailOrderId(r.orderId);
  };

  const exportCsv = () => {
    const headers = [
      "order_id", "tanggal", "siswa", "kos", "pemilik",
      "metode", "amount", "status_payment", "status_booking", "refund_status",
    ];
    const data = rows.map((r) => [
      r.orderId,
      r.createdAt,
      r.student?.full_name || r.student?.email || "",
      r.kos?.name || "",
      r.owner?.full_name || "",
      r.midtransOrderId ? "midtrans" : "manual",
      r.amount,
      r.paymentStatus,
      r.bookingStatus,
      r.refundStatus,
    ]);
    downloadCsv(transactionsCsvName(), toCsv(headers, data));
  };

  const filterAnomaly = (a: AnomalyItem) => {
    const q = a.orderId || a.bookingId || "";
    router.push(`/admin/transactions?search=${encodeURIComponent(q)}`);
  };

  const dismissAnomaly = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      // ignore — storage unavailable (private mode)
    }
  };

  return (
    <AdminShell activePage="transactions">
      <div className="p-margin-mobile md:p-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Transaksi</h1>
            <p className="text-on-surface-variant font-body-md">
              Manajemen pembayaran, rekonsiliasi Midtrans, dan deteksi anomali.
            </p>
          </div>
          <Link href="/admin/transactions/reconciliation"
            className="flex items-center gap-2 text-sm font-medium bg-secondary-container text-on-secondary-container rounded-lg px-4 py-2.5">
            <span className="material-symbols-outlined text-base">sync_alt</span>
            Rekonsiliasi
          </Link>
        </div>

        <TransactionFilters initial={filters} />
        <AnomalyList anomalies={visibleAnomalies} onFilter={filterAnomaly} onDismiss={dismissAnomaly} />
        <TransactionStats stats={stats} hasFilter={filters.search != null} />
        <TransactionsTable
          rows={rows}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          onPageChange={goPage}
          onDetail={openDetail}
          onRefund={openDetail}
          onOverride={openDetail}
          onExport={exportCsv}
        />

        <TransactionDetail
          open={detailBookingId != null}
          bookingId={detailBookingId}
          orderId={detailOrderId}
          onClose={() => setDetailBookingId(null)}
          onChanged={() => router.refresh()}
        />
      </div>
    </AdminShell>
  );
}