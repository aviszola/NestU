"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, changePassword, logout } from "@/lib/supabase/actions";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import AvatarUploadField from "@/components/AvatarUploadField";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [role, setRole] = useState<"siswa" | "pemilik" | "admin" | "">("");

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // UI state
  const [isEditing, setIsEditing] = useState(false);

  // Avatar — shared hook (satu sumber kebenaran bersama owner/profile)
  const avatar = useAvatarUpload({ onError: (msg) => setError(msg) });

  useEffect(() => {
    (async () => {
      const sup = createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }

      setEmail(user.email ?? "");

      const { data: profile } = await sup
        .from("profiles")
        .select("full_name, phone, avatar_url, school_name, role")
        .eq("id", user.id)
        .single();

      if (!profile) { router.replace(`/login?redirect=${window.location.pathname}`); return; }

      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setSchoolName(profile.school_name ?? "");
      setRole(profile.role ?? "");
      avatar.initialize(profile.avatar_url ?? "");
      setLoading(false);
    })();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    let uploadedUrl = avatar.avatarUrl;
    if (avatar.avatarFile) {
      const url = await avatar.uploadAvatar();
      if (!url) { setSaving(false); return; }
      uploadedUrl = url;
    }

    const result = await updateProfile({
      fullName,
      phone,
      avatarUrl: uploadedUrl,
      schoolName: role === "siswa" ? schoolName : undefined,
    });

    setSaving(false);
    if (result.error) { setError(result.error); return; }
    avatar.commitUpload(uploadedUrl);
    setSuccess("Profil berhasil disimpan");
    setIsEditing(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPwSaving(true);

    const result = await changePassword({ oldPassword, newPassword });

    setPwSaving(false);
    if (result.error) { setError(result.error); return; }
    setOldPassword("");
    setNewPassword("");
    setSuccess("Password berhasil diubah");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Sidebar activePage="profile" userRole="siswa" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <p className="text-outline">Memuat...</p>
        </div>
      </div>
    );
  }

  const userInitial = (fullName || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar activePage="profile" userRole="siswa" />

      <div className="flex min-h-screen">
        <main className="flex-1 lg:ml-64">
          <TopNav userRole="siswa" userName={fullName} />

          <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">
                Profile Settings
              </h1>
              <p className="text-sm text-outline mt-1">
                Kelola informasi akun dan pengaturan profil Anda
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-error-container text-on-error-container p-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-secondary-container text-on-secondary-container p-3 text-sm">
                {success}
              </div>
            )}

            {/* Edit Profil */}
            <div className="rounded-xl border border-outline-variant bg-white p-5 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-on-surface">Edit Profil</h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar */}
                <AvatarUploadField
                  avatar={avatar}
                  initial={userInitial}
                  isEditing={isEditing}
                />

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Nama Lengkap</label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant py-2.5">{fullName || "—"}</p>
                  )}
                </div>

                {/* Email (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                  <p className="text-sm text-outline py-2.5">{email || "—"}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Nomor WhatsApp</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant py-2.5">{phone || "—"}</p>
                  )}
                </div>

                {/* School — only for siswa */}
                {role === "siswa" && (
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Sekolah / Universitas</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    ) : (
                      <p className="text-sm text-on-surface-variant py-2.5">{schoolName || "—"}</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {isEditing && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setError(null);
                      }}
                      className="px-6 py-2.5 border border-outline-variant text-sm font-medium rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Ganti Password */}
            <div className="rounded-xl border border-outline-variant bg-white p-5">
              <h3 className="text-base font-bold text-on-surface mb-5">Ganti Password</h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Password Lama</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Password saat ini"
                    className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex gap-3">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">info</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Changing your password will log you out from all other active sessions.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-6 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pwSaving ? "Menyimpan..." : "Update Password"}
                </button>
              </form>

              {/* Logout */}
              <div className="mt-6 pt-5 border-t border-outline-variant">
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg border border-error text-error text-sm font-medium hover:bg-error/5 transition-colors"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
      <BottomNav activePage="profile" userRole="siswa" />
    </div>
  );
}
