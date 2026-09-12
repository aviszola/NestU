import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReconciliationPage from "@/components/admin/transactions/ReconciliationPage";
import { getReconciliation } from "@/lib/supabase/transactions";

export const dynamic = "force-dynamic";

export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
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

  const result = await getReconciliation(supabase, {
    from: sp.from || null,
    to: sp.to || null,
  });

  return (
    <ReconciliationPage result={result} from={sp.from || null} to={sp.to || null} />
  );
}