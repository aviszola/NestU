"use client";

import { approveKos, rejectKos } from "@/lib/supabase/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";

export default function AdminKosDetailPage() {
  const router = useRouter();
  const [kos, setKos] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const sup = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }
      const { data: profile } = await sup.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.replace("/dashboard"); return; }
      // Data loaded via the list page — just render detail view
    }
    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <p className="p-6 text-on-surface-variant">Detail page — link from verification queue</p>
    </div>
  );
}
