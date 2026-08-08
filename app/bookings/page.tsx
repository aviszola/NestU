import { createClient } from "@/lib/supabase/server";
import { getUserBookings } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import BookingsContent from "@/components/BookingsContent";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const bookings = await getUserBookings(supabase, user.id);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage="bookings"
        userRole="siswa"
        userName={profile?.full_name ?? undefined}
      />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopNav
          userRole="siswa"
          userName={profile?.full_name ?? undefined}
        />

        <main className="flex-1 px-margin-mobile md:px-margin-desktop pt-stack-lg pb-32 lg:pb-stack-lg">
          <BookingsContent bookings={bookings ?? []} />
        </main>

        <Footer
          brandName="NestU"
          tagline="Academic Reliability &amp; Community Warmth."
        />
      </div>

      <BottomNav activePage="bookings" userRole="siswa" />
    </div>
  );
}
