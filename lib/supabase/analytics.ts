// lib/supabase/analytics.ts
// Analytics dashboard — client-side aggregate (Opsi B).
// Data masih klein (<10k rows) → aggregate handled at server component.
// [TODO: optimize ke RPC] kalau skala besar: get_analytics_kpi / get_booking_trend /
// get_revenue_monthly / get_top_kos / get_top_owners yang return series più kecil.

export interface AnalyticsPeriodSpan {
  from: Date;
  to: Date;
  prevFrom: Date;
  label: string;
  key: string;
}

export interface AnalyticsKpi {
  gmv: number;
  gmvDeltaPct: number | null;
  gmvTrendUp: boolean;
  totalBookings: number;
  pending: number;
  approved: number;
  completed: number;
  conversionRate: number; // 0-100
  conversionTarget: number;
  activeUsers: number;
  activeSiswa: number;
  activePemilik: number;
}

export interface TrendPoint {
  date: string;
  newBookings: number;
  completed: number;
}

export interface RevenueMonth {
  month: string;
  revenue: number;
  bookings: number;
}

export interface TopKosRow {
  kosId: string;
  kosName: string;
  ownerName: string;
  bookings: number;
  paidBookings: number;
  revenue: number;
}

export interface TopOwnerRow {
  ownerId: string;
  ownerName: string;
  kosCount: number;
  bookings: number;
  paidBookings: number;
  revenue: number;
}

export interface ActivityRow {
  time: string | null;
  actor: string;
  action: string;
  target: string;
  href?: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AnalyticsHealth {
  paymentSuccessRate: number; // %
  refundRate: number; // %
  pendingKos: number;
  pendingRefunds: number;
}

export interface AnalyticsResult {
  kpi: AnalyticsKpi;
  trend: TrendPoint[];
  revenue: RevenueMonth[];
  topKos: TopKosRow[];
  topOwners: TopOwnerRow[];
  activity: ActivityRow[];
  health: AnalyticsHealth;
}

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Format Rupiah locale Indonesia (pemisah ribuan). */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n || 0);
}

function sum(arr: any[], key: string): number {
  return arr.reduce((acc, row) => acc + (row[key] || 0), 0);
}

/**
 * Resolve periode dari query param (7d/30d/90d/custom from+to). Default 30d.
 */
export function resolvePeriod(
  sp: { period?: string; from?: string; to?: string }
): AnalyticsPeriodSpan {
  const now = new Date();
  let key: string;
  let label: string;
  let from: Date;
  let to: Date;

  if (sp.from && sp.to) {
    from = startOfDay(new Date(sp.from + "T00:00:00"));
    to = endOfDay(new Date(sp.to + "T00:00:00"));
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      from = startOfDay(addDays(now, -29));
      to = endOfDay(now);
      key = "30d";
      label = "30 dau";
    } else {
      key = "custom";
      label = `${sp.from} → ${sp.to}`;
    }
  } else {
    const days = sp.period === "7d" ? 7 : sp.period === "90d" ? 90 : 30;
    to = endOfDay(now);
    from = startOfDay(addDays(now, -(days - 1)));
    key = sp.period || "30d";
    label = key === "7d" ? "7 dau" : key === "90d" ? "90 dau" : "30 dau";
  }

  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);
  const prevFrom = startOfDay(addDays(from, -spanDays));

  return { from, to, prevFrom, label, key };
}

/**
 * Kumpulan + aggregate alle metrik analytics. Client admin-only (RLS).
 * @param client any — server/authenticated Supabase client (admin).
 */
export async function getAnalytics(
  client: any,
  span: AnalyticsPeriodSpan
): Promise<AnalyticsResult> {
  const gtePrev = span.prevFrom.toISOString();
  const lteCur = span.to.toISOString();

  const { data: bookingsRaw } = await client
    .from("bookings")
    .select(
      "id, created_at, status, payment_status, refund_status, total_amount, student_id, room:room_id(room_number, kos:kos_id(id, name, owner_id))"
    )
    .gte("created_at", gtePrev)
    .lte("created_at", lteCur);
  const bookings = (bookingsRaw ?? []) as any[];

  const { data: kosRaw } = await client
    .from("kos")
    .select("id, name, owner_id, verification_status");
  const kosList = (kosRaw ?? []) as any[];

  const { data: profilesRaw } = await client
    .from("profiles")
    .select("id, full_name, role");
  const profiles = (profilesRaw ?? []) as any[];
  const nameMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  const { data: logRaw } = await client
    .from("admin_action_log")
    .select("*, admin:admin_id(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(10);
  const logs = (logRaw ?? []) as any[];

  const cur = bookings.filter((b) => {
    const t = new Date(b.created_at).getTime();
    return t >= span.from.getTime() && t <= span.to.getTime();
  });

  const gmv = sum(cur.filter((b) => b.payment_status === "lunas"), "total_amount");
  const gmvPrev = sum(
    bookings
      .filter((b) => {
        const t = new Date(b.created_at).getTime();
        return t >= span.prevFrom.getTime() && t < span.from.getTime();
      })
      .filter((b) => b.payment_status === "lunas"),
    "total_amount"
  );
  const gmvDeltaPct = gmvPrev > 0 ? ((gmv - gmvPrev) / gmvPrev) * 100 : null;

  const totalBookings = cur.length;
  const pending = cur.filter((b) => b.status === "pending").length;
  const approved = cur.filter((b) => b.status === "approved").length;
  const completed = cur.filter((b) => b.status === "completed").length;
  const conversionRate = totalBookings > 0 ? (completed / totalBookings) * 100 : 0;

  // Booking trend — series harian di periode.
  const trend: TrendPoint[] = [];
  for (let d = new Date(span.from); d.getTime() <= span.to.getTime(); d = addDays(d, 1)) {
    const dayKey = d.toISOString().slice(0, 10);
    const day = cur.filter(
      (b) => new Date(b.created_at).toISOString().slice(0, 10) === dayKey
    );
    trend.push({
      date: dayKey,
      newBookings: day.length,
      completed: day.filter((b) => b.status === "completed").length,
    });
  }

  // Revenue per bulan — 6 bulan terakhir fino a span.to.
  const revenue: RevenueMonth[] = [];
  {
    const end = new Date(span.to);
    for (let i = 5; i >= 0; i--) {
      const m = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
      const inMonth = cur.filter((b) => {
        const t = new Date(b.created_at).getTime();
        return t >= mStart.getTime() && t <= mEnd.getTime();
      });
      revenue.push({
        month: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
        revenue: sum(inMonth.filter((b) => b.payment_status === "lunas"), "total_amount"),
        bookings: inMonth.length,
      });
    }
  }

  // Top 10 kos by booking count.
  const kosAgg: Record<string, { kosId: string; kosName: string; ownerId: string; bookings: number; paidBookings: number; revenue: number }> = {};
  cur.forEach((b: any) => {
    const k = b.room?.kos;
    if (!k) return;
    const a = (kosAgg[k.id] ??= {
      kosId: k.id,
      kosName: k.name,
      ownerId: k.owner_id,
      bookings: 0,
      paidBookings: 0,
      revenue: 0,
    });
    a.bookings++;
    if (b.payment_status === "lunas") {
      a.paidBookings++;
      a.revenue += b.total_amount || 0;
    }
  });
  const topKos: TopKosRow[] = Object.values(kosAgg)
    .map((r) => ({
      kosId: r.kosId,
      kosName: r.kosName,
      ownerName: nameMap.get(r.ownerId) || "-",
      bookings: r.bookings,
      paidBookings: r.paidBookings,
      revenue: r.revenue,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  // Top 10 pemilik by revenue.
  const ownerAgg: Record<string, { ownerId: string; kosSet: Set<string>; bookings: number; paidBookings: number; revenue: number }> = {};
  cur.forEach((b: any) => {
    const k = b.room?.kos;
    if (!k || !k.owner_id) return;
    const a = (ownerAgg[k.owner_id] ??= {
      ownerId: k.owner_id,
      kosSet: new Set<string>(),
      bookings: 0,
      paidBookings: 0,
      revenue: 0,
    });
    a.kosSet.add(k.id);
    a.bookings++;
    if (b.payment_status === "lunas") {
      a.paidBookings++;
      a.revenue += b.total_amount || 0;
    }
  });
  const topOwners: TopOwnerRow[] = Object.values(ownerAgg)
    .map((r) => ({
      ownerId: r.ownerId,
      ownerName: nameMap.get(r.ownerId) || "-",
      kosCount: r.kosSet.size,
      bookings: r.bookings,
      paidBookings: r.paidBookings,
      revenue: r.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Recent activity — admin_action_log.
  const activity: ActivityRow[] = (logs || []).map((l: any) => ({
    time: l.created_at,
    actor: l.admin?.full_name || "Admin",
    action: l.action_type || "status_override",
    target: `Booking #${String(l.booking_id || "").slice(0, 8)}`,
    href: "/admin/bookings",
    oldValue: l.old_value,
    newValue: l.new_value,
  }));

  // Health metrics.
  const paid = cur.filter((b) => b.payment_status === "lunas").length;
  const approvedOrCompleted = cur.filter(
    (b) => b.status === "approved" || b.status === "completed"
  ).length;
  const paymentSuccessRate = approvedOrCompleted > 0 ? (paid / approvedOrCompleted) * 100 : 0;

  const refunded = cur.filter(
    (b) => b.refund_status === "pending" || b.refund_status === "processed"
  ).length;
  const refundRate = completed > 0 ? (refunded / completed) * 100 : 0;

  const pendingKos = kosList.filter((k) => k.verification_status === "pending").length;
  const { count: pendingRefundCount } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("refund_status", "pending");

  // Active users (30 dau terakhir, opp til span.to).
  const activeFrom = startOfDay(addDays(span.to, -29));
  const active = bookings.filter((b) => {
    const t = new Date(b.created_at).getTime();
    return t >= activeFrom.getTime() && t <= span.to.getTime();
  });
  const siswaSet = new Set<string>(active.filter((b) => b.student_id).map((b) => b.student_id));
  const ownerSet = new Set<string>(
    active.filter((b) => b.room?.kos?.owner_id).map((b) => b.room.kos.owner_id)
  );
  const activeSet = new Set<string>([...siswaSet, ...ownerSet]);

  // Benchmark conversion — configurable via app_config.conversion_benchmark_pct.
  // [TODO: seed key in DB:
  //   INSERT INTO app_config(key,value) VALUES ('conversion_benchmark_pct','20');
  let conversionTarget = 20;
  const { data: cfg } = await client
    .from("app_config")
    .select("value")
    .eq("key", "conversion_benchmark_pct")
    .maybeSingle();
  if (cfg?.value && !isNaN(Number(cfg.value))) conversionTarget = Number(cfg.value);

  const kpi: AnalyticsKpi = {
    gmv,
    gmvDeltaPct,
    gmvTrendUp: gmv >= gmvPrev,
    totalBookings,
    pending,
    approved,
    completed,
    conversionRate,
    conversionTarget,
    activeUsers: activeSet.size,
    activeSiswa: siswaSet.size,
    activePemilik: ownerSet.size,
  };

  return {
    kpi,
    trend,
    revenue,
    topKos,
    topOwners,
    activity,
    health: {
      paymentSuccessRate,
      refundRate,
      pendingKos,
      pendingRefunds: pendingRefundCount || 0,
    },
  };
}