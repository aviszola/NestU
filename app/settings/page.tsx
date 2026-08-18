"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function SettingsPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function check() {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setLoaded(true);
    }
    check();
  }, [router]);

  if (!loaded) return null;

  return (
    <>
      <TopNav
        userRole="siswa"
        userAvatar="/images/avatar-placeholder.svg"
        showSearch
        searchPlaceholder="Cari kos..."
        searchValue=""
        onSearchChange={() => {}}
      />
      <main className="flex-1 px-4 md:px-8 py-6 pb-32 max-w-3xl mx-auto w-full min-h-screen">
        <h1 className="text-2xl font-bold text-on-surface mb-6">Pengaturan</h1>
        <ChangePasswordForm />
      </main>
      <Footer />
      <BottomNav activePage="profile" userRole="siswa" />
    </>
  );
}
