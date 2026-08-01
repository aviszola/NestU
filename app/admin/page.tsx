import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboardContent from "@/components/AdminDashboardContent";

export const dynamic = "force-dynamic";

async function countByStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table as any)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) return 0;
  return count ?? 0;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const [pendingKos, verifiedKos, rejectedKos] = await Promise.all([
    countByStatus(supabase, "kos", "verification_status", "pending"),
    countByStatus(supabase, "kos", "verification_status", "verified"),
    countByStatus(supabase, "kos", "verification_status", "rejected"),
  ]);

  const [pendingBookings, approvedBookings, rejectedBookings, cancelledBookings] =
    await Promise.all([
      countByStatus(supabase, "bookings", "status", "pending"),
      countByStatus(supabase, "bookings", "status", "approved"),
      countByStatus(supabase, "bookings", "status", "rejected"),
      countByStatus(supabase, "bookings", "status", "cancelled"),
    ]);

  const [siswaCount, pemilikCount, adminCount] = await Promise.all([
    countByStatus(supabase, "profiles", "role", "siswa"),
    countByStatus(supabase, "profiles", "role", "pemilik"),
    countByStatus(supabase, "profiles", "role", "admin"),
  ]);

  const totalUsers = siswaCount + pemilikCount + adminCount;

  // ─── Weekly Booking Chart ─────────────────────────────
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("created_at, status")
    .order("created_at", { ascending: true });

  const now = new Date();
  const weeks: { label: string; total: number; approved: number }[] = [];

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() - i * 7);
    d.setHours(0, 0, 0, 0);
    weeks.push({ label: `W${5 - i}`, total: 0, approved: 0 });
  }

  function getWeekStart(dateStr: string): number {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  const weekStarts = weeks.map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() - (4 - i) * 7);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  (allBookings ?? []).forEach((b: any) => {
    const ts = getWeekStart(b.created_at);
    const idx = weekStarts.indexOf(ts);
    if (idx >= 0) {
      weeks[idx].total++;
      if (b.status === "approved") weeks[idx].approved++;
    }
  });

  const totalKos = verifiedKos + pendingKos + rejectedKos;

  return (
    <AdminDashboardContent
      pendingKos={pendingKos}
      verifiedKos={verifiedKos}
      rejectedKos={rejectedKos}
      pendingBookings={pendingBookings}
      approvedBookings={approvedBookings}
      rejectedBookings={rejectedBookings}
      cancelledBookings={cancelledBookings}
      siswaCount={siswaCount}
      pemilikCount={pemilikCount}
      adminCount={adminCount}
      totalUsers={totalUsers}
      weeks={weeks}
      allBookings={allBookings ?? []}
      totalKos={totalKos}
    />
  );
}
