"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function OwnerSettingsPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function check() {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }
      setLoaded(true);
    }
    check();
  }, [router]);

  if (!loaded) return null;

  return (
    <>
      <TopNav
        userRole="pemilik"
        userAvatar="/images/avatar-placeholder.svg"
        showSearch
        searchPlaceholder="Cari..."
        searchValue=""
        onSearchChange={() => {}}
      />
      <div className="flex min-h-screen">
        <Sidebar activePage="settings" userRole="pemilik" userName="Pemilik Kos" />
        <main className="flex-1 lg:ml-64 px-4 md:px-8 py-6 pb-32 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-on-surface mb-6">Pengaturan</h1>
          <ChangePasswordForm />
        </main>
      </div>
      <Footer />
    </>
  );
}
