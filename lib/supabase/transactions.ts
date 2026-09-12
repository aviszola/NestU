// lib/supabase/transactions.ts
// Repository layer — Manajemen Transaksi + Rekonsiliasi Midtrans vs DB.
// Data masih klein (<5k) → filter/aggregate di-hitung server-side in-memory.
// [TODO: optimize ke RPC] kalau skala >10k: get_transactions_filtered() /
// get_transactions_stats() / detect_anomalies() (lihat README_MIGRATION.md).

import { formatRupiah } from "@/lib/supabase/analytics";

// ─── View model ────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = [
  "belum_bayar",
  "menunggu_konfirmasi",
  "lunas",
  "expired",
] as const;

export const BOOKING_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
] as const;

export const REFUND_STATUSES = ["none", "pending", "processed"] as const;

export interface TxFilters {
  search?: string | null;
  paymentStatuses?: string[];
  bookingStatuses?: string[];
  method?: "midtrans" | "manual" | "all" | null;
  refundStatuses?: string[];
  from?: string | null; // YYYY-MM-DD
  to?: string | null; // YYYY-MM-DD
  minAmount?: number | null;
  maxAmount?: number | null;
}

export interface PersonRef {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export interface TxOwner {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export interface TransactionRow {
  bookingId: string;
  orderId: string; // midtrans_order_id atau `manual-{bookingId}`
  isManual: boolean;
  createdAt: string;
  dateLabel: string;
  student: PersonRef | null;
  kos: { id: string; name?: string } | null;
  owner: TxOwner | null;
  roomNumber?: string;
  durationMonths: number | null;
  baseMonthlyPrice: number | null;
  amount: number;
  paymentStatus: string;
  bookingStatus: string;
  refundStatus: string;
  paidAt: string | null;
  midtransOrderId: string | null;
  midtransTransactionId: string | null;
  midtransStatus: string | null;
  paymentProofPath: string | null;
  paymentNote: string | null;
}

export interface TxStats {
  totalCount: number;
  totalValue: number;
  lunasCount: number;
  lunasValue: number;
  pendingCount: number;
  pendingValue: number;
}

export interface TransactionLog {
  id: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  adminName?: string | null;
}

export interface TransactionDetail {
  row: TransactionRow;
  moveInDate: string | null;
  notes: string | null;
  rejectionReason: string | null;
  decidedAt: string | null;
  paymentExpiredAt: string | null;
  paymentConfirmedAt: string | null;
  logs: TransactionLog[];
}

export interface AnomalyItem {
  id: string; // `anomaly-{type}-{idx}`
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  bookingId: string | null;
  orderId: string | null;
}

export interface ReconciliationRow {
  bookingId: string;
  orderId: string;
  amountDb: number;
  amountMid: number | null;
  statusDb: string;
  statusMid: string | null;
  delta: number | null;
  result: "match" | "mismatch" | "missing_in_db" | "missing_in_midtrans";
}

export interface ReconciliationResult {
  configured: boolean;
  message: string | null;
  rows: ReconciliationRow[];
  summary: {
    matched: number;
    mismatch: number;
    missingInDb: number;
    missingInMidtrans: number;
  };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

export function formatDateIndo(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatRupiahAmount(n?: number | null): string {
  return formatRupiah(n ?? 0);
}

/** Order ID gabungan — midtrans_order_id atau `manual-{bookingId}`. */
export function resolveOrderId(b: {
  midtrans_order_id?: string | null;
  id: string;
}): string {
  return b.midtrans_order_id ?? `manual-${b.id}`;
}

export function resolveMethod(b: {
  payment_method?: string | null;
  midtrans_order_id?: string | null;
}): "midtrans" | "manual" {
  return b.midtrans_order_id || b.payment_method === "midtrans"
    ? "midtrans"
    : "manual";
}

function startOfDay(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

function endOfDay(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T23:59:59.999`);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

// ─── Core fetch (server-only, admin client) ────────────────────────────────────

/** Email di auth.users, bukan profiles — fetch via RPC admin-only get_users_with_email(). */
async function fetchEmailMap(client: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await client.rpc("get_users_with_email");
    for (const u of data ?? []) {
      if (u?.id && u?.email) map.set(u.id, u.email);
    }
  } catch {
    // non-fatal — email tampil null kalau RPC tak tersedia
  }
  return map;
}

async function fetchAllRows(client: any): Promise<TransactionRow[]> {
  const { data: bookings, error } = await client
    .from("bookings")
    .select(
      "*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name, owner_id)), student:student_id(id, full_name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Ambil nama pemilik dari profiles (join many-to-one tak via supabase embed).
  const ownerIds = [
    ...new Set(
      (bookings ?? [])
        .filter((b: any) => b.rooms?.kos?.owner_id)
        .map((b: any) => b.rooms.kos.owner_id)
    ),
  ];
  const ownerMap = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: owners } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);
    for (const o of owners ?? []) ownerMap.set(o.id, o.full_name || o.id);
  }

  const emailMap = await fetchEmailMap(client);

  const rows: TransactionRow[] = (bookings ?? []).map((b: any) => {
    const kos = b.rooms?.kos ?? null;
    const student = b.student ?? null;
    const ownerId = kos?.owner_id ?? null;
    return {
      bookingId: b.id,
      orderId: resolveOrderId(b),
      isManual: resolveMethod(b) === "manual",
      createdAt: b.created_at,
      dateLabel: formatDateIndo(b.created_at),
      student: student
        ? {
            id: student.id,
            full_name: student.full_name,
            email: emailMap.get(student.id) ?? null,
          }
        : null,
      kos: kos ? { id: kos.id, name: kos.name } : null,
      owner: ownerId
        ? {
            id: ownerId,
            full_name: ownerMap.get(ownerId) ?? null,
            email: emailMap.get(ownerId) ?? null,
          }
        : null,
      roomNumber: b.rooms?.room_number,
      durationMonths: b.duration_months,
      baseMonthlyPrice: b.base_monthly_price,
      amount: Number(b.total_amount ?? 0),
      paymentStatus: b.payment_status ?? "belum_bayar",
      bookingStatus: b.status ?? "pending",
      refundStatus: b.refund_status ?? "none",
      paidAt: b.paid_at,
      midtransOrderId: b.midtrans_order_id,
      midtransTransactionId: b.midtrans_transaction_id,
      midtransStatus: b.midtrans_status,
      paymentProofPath: b.payment_proof_path,
      paymentNote: b.payment_note,
    };
  });

  return rows;
}

function matchesRow(row: TransactionRow, f: TxFilters): boolean {
  if (f.search) {
    const q = f.search.trim().toLowerCase();
    const haystack = [
      row.orderId,
      row.student?.full_name,
      row.student?.email,
      row.kos?.name,
      row.owner?.full_name,
      row.roomNumber,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (f.paymentStatuses && f.paymentStatuses.length > 0) {
    if (!f.paymentStatuses.includes(row.paymentStatus)) return false;
  }
  if (f.bookingStatuses && f.bookingStatuses.length > 0) {
    if (!f.bookingStatuses.includes(row.bookingStatus)) return false;
  }
  if (f.method && f.method !== "all") {
    if ((row.midtransOrderId ? "midtrans" : "manual") !== f.method) return false;
  }
  if (f.refundStatuses && f.refundStatuses.length > 0) {
    if (!f.refundStatuses.includes(row.refundStatus)) return false;
  }

  const ts = new Date(row.createdAt).getTime();
  const fromTs = startOfDay(f.from);
  const toTs = endOfDay(f.to);
  if (fromTs !== null && ts < fromTs) return false;
  if (toTs !== null && ts > toTs) return false;

  if (f.minAmount != null && row.amount < f.minAmount) return false;
  if (f.maxAmount != null && row.amount > f.maxAmount) return false;

  return true;
}

export function applyFilters(
  rows: TransactionRow[],
  f: TxFilters
): TransactionRow[] {
  return rows.filter((r) => matchesRow(r, f));
}
// ─── Public repository API ─────────────────────────────────────────────────────

export interface TxListResult {
  rows: TransactionRow[];
  total: number; // total setelah filter
  allCount: number; // total tanpa filter (untuk pagination base)
}

export async function getTransactions(
  client: any,
  filters: TxFilters,
  options: { limit?: number; offset?: number }
): Promise<TxListResult> {
  const all = await fetchAllRows(client);
  const filtered = applyFilters(all, filters);
  const limit = options.limit || 30;
  const offset = options.offset || 0;
  const rows = filtered.slice(offset, offset + limit);
  return { rows, total: filtered.length, allCount: all.length };
}

export async function getTransactionsStats(
  client: any,
  filters: TxFilters
): Promise<TxStats> {
  const all = await fetchAllRows(client);
  const filtered = applyFilters(all, filters);

  let totalValue = 0;
  let lunasCount = 0;
  let lunasValue = 0;
  let pendingCount = 0;
  let pendingValue = 0;

  for (const r of filtered) {
    totalValue += r.amount;
    if (r.paymentStatus === "lunas") {
      lunasCount++;
      lunasValue += r.amount;
    }
    if (r.paymentStatus === "menunggu_konfirmasi") {
      pendingCount++;
      pendingValue += r.amount;
    }
  }

  return {
    totalCount: filtered.length,
    totalValue,
    lunasCount,
    lunasValue,
    pendingCount,
    pendingValue,
  };
}

export async function getTransactionDetail(
  client: any,
  bookingId: string
): Promise<TransactionDetail | null> {
  const { data: booking, error } = await client
    .from("bookings")
    .select(
      "*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name, owner_id)), student:student_id(id, full_name)"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) return null;

  const { data: logs } = await client
    .from("admin_action_log")
    .select("*, admin:admin_id(id, full_name)")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  const ownerId = booking.rooms?.kos?.owner_id ?? null;
  const ownerMap = new Map<string, string>();
  if (ownerId) {
    const { data: owner } = await client
      .from("profiles")
      .select("id, full_name")
      .eq("id", ownerId)
      .maybeSingle();
    if (owner) ownerMap.set(owner.id, owner.full_name || owner.id);
  }

  const emailMap = await fetchEmailMap(client);

  const row: TransactionRow = {
    bookingId: booking.id,
    orderId: resolveOrderId(booking),
    isManual: resolveMethod(booking) === "manual",
    createdAt: booking.created_at,
    dateLabel: formatDateIndo(booking.created_at),
    student: booking.student
      ? {
          id: booking.student.id,
          full_name: booking.student.full_name,
          email: emailMap.get(booking.student.id) ?? null,
        }
      : null,
    kos: booking.rooms?.kos
      ? { id: booking.rooms.kos.id, name: booking.rooms.kos.name }
      : null,
    owner: ownerId
      ? {
          id: ownerId,
          full_name: ownerMap.get(ownerId) ?? null,
          email: emailMap.get(ownerId) ?? null,
        }
      : null,
    roomNumber: booking.rooms?.room_number,
    durationMonths: booking.duration_months,
    baseMonthlyPrice: booking.base_monthly_price,
    amount: Number(booking.total_amount ?? 0),
    paymentStatus: booking.payment_status ?? "belum_bayar",
    bookingStatus: booking.status ?? "pending",
    refundStatus: booking.refund_status ?? "none",
    paidAt: booking.paid_at,
    midtransOrderId: booking.midtrans_order_id,
    midtransTransactionId: booking.midtrans_transaction_id,
    midtransStatus: booking.midtrans_status,
    paymentProofPath: booking.payment_proof_path,
    paymentNote: booking.payment_note,
  };

  return {
    row,
    moveInDate: booking.move_in_date,
    notes: booking.notes,
    rejectionReason: booking.rejection_reason,
    decidedAt: booking.decided_at,
    paymentExpiredAt: booking.payment_expired_at,
    paymentConfirmedAt: booking.payment_confirmed_at,
    logs: (logs ?? []).map((l: any) => ({
      id: l.id,
      actionType: l.action_type ?? "status_override",
      oldValue: l.old_value,
      newValue: l.new_value,
      reason: l.reason,
      createdAt: l.created_at,
      adminName: l.admin?.full_name ?? "Admin",
    })),
  };
}
// ─── Deteksi anomali ───────────────────────────────────────────────────────────

export async function detectAnomalies(
  client: any,
  opts: { dismissedIds?: string[] } = {}
): Promise<AnomalyItem[]> {
  const all = await fetchAllRows(client);
  const dismissed = new Set(opts.dismissedIds ?? []);
  const items: AnomalyItem[] = [];
  let idx = 0;
  const now = Date.now();

  const push = (
    type: string,
    severity: AnomalyItem["severity"],
    title: string,
    description: string,
    row: TransactionRow
  ) => {
    const id = `anomaly-${type}-${idx++}`;
    if (dismissed.has(id)) return;
    items.push({
      id,
      type,
      severity,
      title,
      description,
      bookingId: row.bookingId,
      orderId: row.orderId,
    });
  };

  // 1. Duplikat order_id (2+ booking dengan order_id sama, bukan manual).
  const byOrder = new Map<string, TransactionRow[]>();
  for (const r of all) {
    if (r.midtransOrderId) {
      byOrder.set(r.midtransOrderId, [...(byOrder.get(r.midtransOrderId) ?? []), r]);
    }
  }
  for (const [, group] of byOrder) {
    if (group.length >= 2) {
      push(
        "duplicate",
        "high",
        "Duplikat Order ID",
        `${group.length} booking menggunakan order_id sama "${group[0].orderId}".`,
        group[0]
      );
    }
  }

  // 2. Amount mismatch — total_amount != base_monthly_price * duration_months.
  for (const r of all) {
    if (r.amount && r.baseMonthlyPrice && r.durationMonths) {
      const expected = r.baseMonthlyPrice * r.durationMonths;
      if (Math.abs(r.amount - expected) > 1) {
        push(
          "amount",
          "medium",
          "Mismatch Jumlah",
          `${formatRupiah(r.amount)} ≠ ${formatRupiah(expected)} (${formatRupiah(r.baseMonthlyPrice)} × ${r.durationMonths} bulan).`,
          r
        );
      }
    }
  }

  // 3. Lunas tapi belum completed > 7 hari.
  for (const r of all) {
    if (r.paymentStatus === "lunas" && r.bookingStatus !== "completed" && r.paidAt) {
      const age = now - new Date(r.paidAt).getTime();
      if (age > 7 * DAY_MS) {
        push(
          "lunas_no_complete",
          "medium",
          "Lunas namun belum Selesai",
          `Payment lunas sejak ${formatDateIndo(r.paidAt)} (>7 hari) tapi booking belum completed.`,
          r
        );
      }
    }
  }

  // 4. Menunggu konfirmasi > 7 hari — bukti transfer belum dikonfirmasi.
  for (const r of all) {
    if (r.paymentStatus === "menunggu_konfirmasi") {
      const age = now - new Date(r.createdAt).getTime();
      if (age > 7 * DAY_MS) {
        push(
          "stuck_confirm",
          "medium",
          "Menunggu Konfirmasi > 7 hari",
          "Bukti transfer belum dikonfirmasi oleh pemilik/admin dalam 7+ hari.",
          r
        );
      }
    }
  }

  // 5. Refund pending > 14 hari.
  for (const r of all) {
    if (r.refundStatus === "pending") {
      const age = now - new Date(r.createdAt).getTime();
      if (age > 14 * DAY_MS) {
        push(
          "refund_stuck",
          "low",
          "Refund Menunggu > 14 hari",
          "Refund lama belum diproses dalam 14+ hari.",
          r
        );
      }
    }
  }

  return items;
}
// ─── Rekonsiliasi Midtrans vs DB (server-only) ─────────────────────────────────

function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

interface MidtransOrderStatus {
  status_code?: string;
  transaction_status?: string;
  gross_amount?: string;
  order_id?: string;
  transaction_id?: string;
  fraud_status?: string;
}

function mapMidtransStatus(raw: string): string {
  switch (raw) {
    case "settlement":
    case "capture":
      return "settlement";
    case "pending":
    case "authorize":
      return "pending";
    case "expire":
      return "expire";
    case "cancel":
      return "cancel";
    case "deny":
      return "deny";
    default:
      return raw || "unknown";
  }
}

export async function getReconciliation(
  client: any,
  opts: { from?: string | null; to?: string | null }
): Promise<ReconciliationResult> {
  const NOT_CONFIGURED: ReconciliationResult = {
    configured: false,
    message: "[TODO: Setup MIDTRANS_SERVER_KEY]",
    rows: [],
    summary: { matched: 0, mismatch: 0, missingInDb: 0, missingInMidtrans: 0 },
  };

  if (!midtransConfigured()) return NOT_CONFIGURED;

  const from =
    opts.from ||
    new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10);
  const to = opts.to || new Date().toISOString().slice(0, 10);
  const fromTs = startOfDay(from);
  const toTs = endOfDay(to);

  // Semua booking midtrans dalam rentang.
  let query = client
    .from("bookings")
    .select(
      "id, total_amount, payment_status, midtrans_status, midtrans_order_id, created_at, paid_at"
    )
    .not("midtrans_order_id", "is", null);
  if (fromTs !== null)
    query = query.gte("created_at", new Date(fromTs).toISOString());
  if (toTs !== null)
    query = query.lte("created_at", new Date(toTs).toISOString());

  const { data: bookings, error } = await query;
  if (error) throw error;

  const { CoreApi } = await import("midtrans-client");
  const core = new CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
  });

  const rows: ReconciliationRow[] = [];
  for (const b of bookings ?? []) {
    const orderId = b.midtrans_order_id as string;
    let mid: MidtransOrderStatus | null = null;
    try {
      const res: any = await core.transaction.status(orderId);
      mid = res as MidtransOrderStatus;
    } catch {
      mid = null; // order tidak ditemukan di Midtrans
    }

    const amountDb = Number(b.total_amount ?? 0);
    const amountMid =
      mid?.gross_amount != null ? Number(mid.gross_amount) : null;
    const statusMid = mid
      ? mapMidtransStatus(mid.transaction_status ?? mid.status_code ?? "")
      : null;
    const statusDb = b.payment_status ?? "belum_bayar";

    const dbLunas = statusDb === "lunas";
    const midSettled = statusMid === "settlement";
    const delta =
      amountMid != null
        ? Math.round(amountMid) - Math.round(amountDb)
        : null;

    let result: ReconciliationRow["result"];
    if (!mid) {
      result = "missing_in_midtrans";
    } else if (
      amountMid != null &&
      Math.abs(Math.round(amountMid) - Math.round(amountDb)) > 1
    ) {
      result = "mismatch";
    } else if (dbLunas !== midSettled) {
      // Midtrans settlement tapi DB belum lunas → data out-of-sync in DB.
      result = midSettled ? "missing_in_db" : "mismatch";
    } else {
      result = "match";
    }

    rows.push({
      bookingId: b.id,
      orderId,
      amountDb,
      amountMid,
      statusDb: dbLunas ? "lunas" : statusDb,
      statusMid,
      delta,
      result,
    });
  }

  const summary = {
    matched: rows.filter((r) => r.result === "match").length,
    mismatch: rows.filter((r) => r.result === "mismatch").length,
    missingInDb: rows.filter((r) => r.result === "missing_in_db").length,
    missingInMidtrans: rows.filter((r) => r.result === "missing_in_midtrans")
      .length,
  };

  return { configured: true, message: null, rows, summary };
}

/** Sync DB dari Midtrans untuk satu booking (fix mismatch). */
export async function syncFromMidtrans(
  client: any,
  bookingId: string
): Promise<{ ok: boolean; message: string }> {
  if (!midtransConfigured()) {
    return { ok: false, message: "[TODO: Setup MIDTRANS_SERVER_KEY]" };
  }
  const { data: booking, error } = await client
    .from("bookings")
    .select("id, midtrans_order_id, total_amount, payment_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking || !booking.midtrans_order_id) {
    return { ok: false, message: "Booking midtrans tidak ditemukan." };
  }

  const { CoreApi } = await import("midtrans-client");
  const core = new CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
  });

  try {
    const res: any = await core.transaction.status(booking.midtrans_order_id);
    const statusMid = mapMidtransStatus(
      res?.transaction_status ?? res?.status_code ?? ""
    );
    const newPaymentStatus =
      statusMid === "settlement"
        ? "lunas"
        : statusMid === "expire"
        ? "expired"
        : booking.payment_status;

    const { error: updErr } = await client
      .from("bookings")
      .update({
        payment_status: newPaymentStatus,
        midtrans_status: statusMid,
        paid_at:
          newPaymentStatus === "lunas"
            ? new Date().toISOString()
            : booking.paid_at,
      })
      .eq("id", bookingId);
    if (updErr) return { ok: false, message: updErr.message };
    return {
      ok: true,
      message: `Status sync → ${statusMid} (${newPaymentStatus})`,
    };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Gagal fetch Midtrans." };
  }
}