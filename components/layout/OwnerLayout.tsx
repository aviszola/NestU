import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/constants/routes";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import type { ActivePage } from "@/components/layout/Sidebar";

interface Props {
  children: React.ReactNode;
  activePage?: ActivePage;
  userName?: string;
}

export default async function OwnerLayout({
  children,
  activePage = "dashboard",
  userName,
}: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "pemilik") redirect(getRoleHome(profile?.role));

  const displayName = userName || profile?.full_name || "Pemilik Kos";

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
        <Sidebar activePage={activePage} userRole="pemilik" userName={displayName} />
        <main className="flex-1 lg:ml-64 min-h-screen">
          {children}
        </main>
      </div>
      <Footer
        brandName="NetsU"
        tagline="Academic Reliability & Community Warmth."
        showPartnerSection
      />
      <BottomNav activePage={activePage} userRole="pemilik" />
    </>
  );
}
