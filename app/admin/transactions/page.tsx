import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionsDashboard from "@/components/admin/transactions/TransactionsDashboard";
import {
  getTransactions,
  getTransactionsStats,
  detectAnomalies,
} from "@/lib/supabase/transactions";
import type { TxFilters } from "@/lib/supabase/transactions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function parseFilters(sp: URLSearchParams): TxFilters {
  const num = (v: string | null) =>
    v != null && v !== "" && !isNaN(Number(v)) ? Number(v) : null;
  return {
    search: sp.get("search") || null,
    paymentStatuses: sp.getAll("status"),
    bookingStatuses: sp.getAll("booking"),
    method:
      (["midtrans", "manual"].includes(sp.get("method") ?? "")
        ? sp.get("method")
        : "all") as TxFilters["method"],
    refundStatuses: sp.getAll("refund"),
    from: sp.get("from") || null,
    to: sp.get("to") || null,
    minAmount: num(sp.get("min")),
    maxAmount: num(sp.get("max")),
  };
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<URLSearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const filters = parseFilters(sp);
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [list, stats, anomalies] = await Promise.all([
    getTransactions(supabase, filters, { limit: PAGE_SIZE, offset }),
    getTransactionsStats(supabase, filters),
    detectAnomalies(supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <TransactionsDashboard
      rows={list.rows}
      total={list.total}
      currentPage={page}
      totalPages={totalPages}
      filters={filters}
      stats={stats}
      anomalies={anomalies}
    />
  );
}