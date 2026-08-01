"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toastSuccess, toastError } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "siswa" | "pemilik" | "admin";
  is_active: boolean | null;
  created_at: string | null;
  school_name?: string | null;
}

const roleLabels: Record<string, string> = {
  siswa: "Siswa",
  pemilik: "Pemilik Kos",
  admin: "Admin",
};

const roleColors: Record<string, string> = {
  siswa: "bg-surface-variant text-on-surface-variant",
  pemilik: "bg-secondary/10 text-secondary",
  admin: "bg-primary/10 text-primary",
};

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [roleValue, setRoleValue] = useState<"siswa" | "pemilik" | "admin">("siswa");
  const [roleSaving, setRoleSaving] = useState(false);

  async function loadUsers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at, school_name")
      .order("created_at", { ascending: false });
    if (error) {
      toastError("Gagal memuat data user: " + (error.message || "Terjadi kesalahan"));
      setLoading(false);
      return;
    }
    setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.role ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openSuspendModal(u: UserRow) {
    setSuspendTarget(u);
    setSuspendModalOpen(true);
  }

  async function handleSuspendToggle() {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    const next = !(suspendTarget.is_active ?? true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: next })
        .eq("id", suspendTarget.id);
      if (error) throw error;
      toastSuccess(
        next
          ? `Akun ${suspendTarget.full_name || suspendTarget.email} diaktifkan`
          : `Akun ${suspendTarget.full_name || suspendTarget.email} disuspend`
      );
      setSuspendModalOpen(false);
      setSuspendTarget(null);
      loadUsers();
    } catch (e: any) {
      toastError("Gagal mengubah status akun: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setSuspendLoading(false);
    }
  }

  function openRoleModal(u: UserRow) {
    setRoleTarget(u);
    setRoleValue(u.role);
    setRoleModalOpen(true);
  }

  async function handleRoleSave() {
    if (!roleTarget) return;
    setRoleSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: roleValue })
        .eq("id", roleTarget.id);
      if (error) throw error;
      toastSuccess(`Role ${roleTarget.full_name || roleTarget.email} diubah ke ${roleLabels[roleValue]}`);
      setRoleModalOpen(false);
      setRoleTarget(null);
      loadUsers();
    } catch (e: any) {
      toastError("Gagal mengubah role: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setRoleSaving(false);
    }
  }

  return (
    <AdminShell activePage="users">
      <div className="p-margin-mobile md:p-margin-desktop">
        {/* Header */}
        <div className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Kelola User</h1>
            <p className="text-on-surface-variant font-body-md">
              Kelola akun siswa, pemilik kos, dan admin. {users.length} total user.
            </p>
          </div>
          <div className="w-full md:w-72">
            <Input
              id="user-search"
              placeholder="Cari nama, email, atau role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Terdaftar</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                      Memuat data user...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl text-outline block mb-2">group_off</span>
                      Tidak ada user yang cocok.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const active = u.is_active ?? true;
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-title-lg text-on-surface">{u.full_name || "-"}</div>
                          <div className="text-body-sm text-outline">{u.email || "-"}</div>
                          {u.school_name && (
                            <div className="text-body-sm text-on-surface-variant">{u.school_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-label-md font-bold ${roleColors[u.role] || "bg-surface-variant text-on-surface-variant"}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-label-md font-bold ${
                              active ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
                            }`}
                          >
                            {active ? "Aktif" : "Suspend"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" onClick={() => openRoleModal(u)}>
                              Ubah Role
                            </Button>
                            <Button
                              variant={active ? "danger" : "primary"}
                              onClick={() => openSuspendModal(u)}
                            >
                              {active ? "Suspend" : "Aktifkan"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      <Modal
        open={suspendModalOpen}
        onClose={() => {
          setSuspendModalOpen(false);
          setSuspendTarget(null);
        }}
        title={suspendTarget?.is_active === false ? "Aktifkan Akun" : "Suspend Akun"}
      >
        <div className="p-4 space-y-5">
          <p className="text-on-surface-variant font-body-md">
            {suspendTarget?.is_active === false ? (
              <>
                Aktifkan kembali akun{" "}
                <span className="font-bold text-on-surface">{suspendTarget?.full_name || suspendTarget?.email}</span>?
              </>
            ) : (
              <>
                Suspend akun{" "}
                <span className="font-bold text-on-surface">{suspendTarget?.full_name || suspendTarget?.email}</span>?
                User tidak bisa login sampai diaktifkan kembali.
              </>
            )}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSuspendModalOpen(false);
                setSuspendTarget(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant={suspendTarget?.is_active === false ? "primary" : "danger"}
              disabled={suspendLoading}
              onClick={handleSuspendToggle}
            >
              {suspendLoading ? "Memproses..." : suspendTarget?.is_active === false ? "Aktifkan" : "Suspend"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        open={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false);
          setRoleTarget(null);
        }}
        title="Ubah Role User"
      >
        <div className="p-4 space-y-5">
          <p className="text-on-surface-variant font-body-md">
            Ubah role untuk{" "}
            <span className="font-bold text-on-surface">{roleTarget?.full_name || roleTarget?.email}</span>
          </p>
          <div className="flex gap-3">
            {(["siswa", "pemilik", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleValue(r)}
                className={`flex-1 px-4 py-2 rounded-lg text-label-md font-bold transition-all ${
                  roleValue === r
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRoleModalOpen(false);
                setRoleTarget(null);
              }}
            >
              Batal
            </Button>
            <Button type="button" disabled={roleSaving} onClick={handleRoleSave}>
              {roleSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
