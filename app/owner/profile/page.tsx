"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";


export default function OwnerProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { data: prof } = await sup
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();
      setProfile({
        full_name: prof?.full_name || "",
        email: user.email || "",
        phone: prof?.phone || "",
      });
      setLoaded(true);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { error } = await sup
        .from("profiles")
        .update({ full_name: profile.full_name, phone: profile.phone, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      setMsg("Profil berhasil disimpan!");
    } catch (err: any) {
      setMsg(err.message || "Gagal menyimpan profil.");
    }
    setSaving(false);
  }

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
        <Sidebar activePage="profile" userRole="pemilik" userName={profile.full_name || "Pemilik Kos"} />
        <main className="flex-1 lg:ml-64 px-4 md:px-8 py-6 pb-32 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-on-surface mb-6">Profil Saya</h1>

          <form onSubmit={handleSave} className="bg-white rounded-xl border border-outline-variant p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-outline mt-1">Email tidak dapat diubah.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Nomor Telepon</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Contoh: 08123456789"
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {msg && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                msg.includes("berhasil") ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
              }`}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </form>
        </main>
      </div>

      <Footer />

    </>
  );
}
