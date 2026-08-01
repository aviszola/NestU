import { createClient } from "@/lib/supabase/server";
import {
  getAllBookings,
  getTotalAllBookings,
  getAdminBookingStats,
} from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import AdminBookingsContent from "@/components/AdminBookingsContent";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
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

  if (!profile || profile.role !== "admin") {
    if (profile?.role === "siswa") redirect("/dashboard");
    if (profile?.role === "pemilik") redirect("/owner");
    redirect("/login");
  }

  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 10;
  const offset = (page - 1) * limit;

  const [bookings, totalCount, stats] = await Promise.all([
    getAllBookings(supabase, { limit, offset }),
    getTotalAllBookings(supabase),
    getAdminBookingStats(supabase),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AdminBookingsContent
      bookings={bookings}
      stats={stats}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
    />
  );
}
