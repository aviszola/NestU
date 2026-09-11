import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";
import { getAnalytics, resolvePeriod } from "@/lib/supabase/analytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
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

  const span = resolvePeriod(sp);
  const analytics = await getAnalytics(supabase, span);

  return <AnalyticsDashboard analytics={analytics} period={span.key} />;
}