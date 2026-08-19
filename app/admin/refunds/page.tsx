import { createClient } from "@/lib/supabase/server";
import { getRefunds } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import AdminRefundsContent from "@/components/AdminRefundsContent";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
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

  const [pending, processed] = await Promise.all([
    getRefunds(supabase, "pending"),
    getRefunds(supabase, "processed"),
  ]);

  return <AdminRefundsContent pending={pending} processed={processed} />;
}
