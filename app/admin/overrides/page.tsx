import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminOverridesContent from "@/components/AdminOverridesContent";

export const dynamic = "force-dynamic";

export default async function AdminOverridesPage() {
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

  return <AdminOverridesContent />;
}
