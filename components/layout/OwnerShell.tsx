"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import type { ActivePage } from "@/components/layout/Sidebar";

interface OwnerShellProps {
  children: React.ReactNode;
  activePage: ActivePage;
  userName?: string;
}

export default function OwnerShell({ children, activePage, userName }: OwnerShellProps) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await sup
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "pemilik") {
        const { getRoleHome } = await import("@/lib/constants/routes");
        router.replace(getRoleHome(profile?.role));
        return;
      }
      if (!cancelled) setAuthed(true);
    }
    check();
    return () => { cancelled = true; };
  }, [router]);

  if (!authed) return null;

  return (
    <>
      <TopNav
        userRole="pemilik"
        userAvatar="/images/avatar-placeholder.svg"
        showSearch
        searchPlaceholder="Cari properti..."
        searchValue=""
        onSearchChange={() => {}}
      />
      <div className="flex min-h-screen">
        <Sidebar activePage={activePage} userRole="pemilik" userName={userName || "Pemilik Kos"} />
        <main className="flex-1 lg:ml-64 min-h-screen">
          {children}
        </main>
      </div>
      <Footer
        brandName="NestU"
        tagline="Academic Reliability & Community Warmth."
        showPartnerSection
      />
      <BottomNav activePage={activePage} userRole="pemilik" />
    </>
  );
}
