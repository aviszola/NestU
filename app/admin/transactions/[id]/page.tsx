import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionDetailPage from "@/components/admin/transactions/TransactionDetailPage";

export const dynamic = "force-dynamic";

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return <TransactionDetailPage bookingId={id} />;
}