"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import {
  getKosById,
  getRoomsByKosId,
  createRoom,
  updateRoom,
  deleteRoom,
  getFacilities,
} from "@/lib/supabase/queries";
import type { Kos, Room, Facility } from "@/lib/types";
import OwnerShell from "@/components/layout/OwnerShell";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toastSuccess, toastError } from "@/lib/toast";
import { facilityIcon } from "@/lib/facilities";

function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const statusLabels: Record<string, string> = {
  tersedia: "Tersedia",
  terisi: "Terisi",
  dipesan: "Dipesan",
};

const statusColors: Record<string, string> = {
  tersedia: "bg-secondary/10 text-secondary",
  terisi: "bg-primary/10 text-primary",
  dipesan: "bg-tertiary-container/20 text-on-tertiary-container",
};

export default function DetailKosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kos, setKos] = useState<Kos | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Room modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [rmRoomNumber, setRmRoomNumber] = useState("");
  const [rmPrice, setRmPrice] = useState("");
  const [rmSize, setRmSize] = useState("");
  const [rmDescription, setRmDescription] = useState("");
  const [rmSaving, setRmSaving] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [kosDeleteOpen, setKosDeleteOpen] = useState(false);

  const totalRooms = rooms.length;
  const terisi = rooms.filter((r) => r.status === "terisi").length;
  const tersedia = rooms.filter((r) => r.status === "tersedia").length;

  async function loadData() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const [k, r] = await Promise.all([
        getKosById(supabase, id),
        getRoomsByKosId(supabase, id),
      ]);
      if (k) setKos(k);
      setRooms(r ?? []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadFacilities() {
    try {
      const supabase = createClient();
      const facilities = await getFacilities(supabase);
      setFacilities(facilities ?? []);
    } catch (e) {
      console.error("Failed to load facilities:", e);
    }
  }

  useEffect(() => {
    loadData();
    loadFacilities();
  }, [id]);

  function openAddModal() {
    setEditRoom(null);
    setRmRoomNumber("");
    setRmPrice("");
    setRmSize("");
    setRmDescription("");
    setModalOpen(true);
  }

  function openEditModal(room: Room) {
    setEditRoom(room);
    setRmRoomNumber(room.room_number);
    setRmPrice(String(room.price_per_month));
    setRmSize(room.size_sqm ? String(room.size_sqm) : "");
    setRmDescription(room.description ?? "");
    setModalOpen(true);
  }

  async function handleRoomSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRmSaving(true);
    try {
      const supabase = createClient();
      if (editRoom) {
        await updateRoom(supabase, editRoom.id, {
          room_number: rmRoomNumber,
          price_per_month: Number(rmPrice),
          size_sqm: rmSize ? Number(rmSize) : null,
          description: rmDescription || null,
        });
      } else {
        await createRoom(supabase, {
          kos_id: id,
          room_number: rmRoomNumber,
          price_per_month: Number(rmPrice),
          size_sqm: rmSize ? Number(rmSize) : null,
          description: rmDescription || null,
        });
      }
      setModalOpen(false);
      loadData();
      toastSuccess(editRoom ? "Kamar berhasil diperbarui" : "Kamar berhasil ditambahkan");
    } catch (e: any) {
      toastError("Gagal menyimpan kamar: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setRmSaving(false);
    }
  }

  function openDeleteModal(room: Room) {
    setDeleteTarget(room);
    setDeleteModalOpen(true);
  }

  async function handleDeleteRoom() {
    if (!deleteTarget) return;
    setDeletingRoom(true);
    try {
      const supabase = createClient();
      await deleteRoom(supabase, deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      loadData();
      toastSuccess("Kamar berhasil dihapus");
    } catch (e: any) {
      toastError("Gagal menghapus kamar: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setDeletingRoom(false);
    }
  }

  async function handleToggleStatus(room: Room) {
    const next = room.status === "tersedia" ? "terisi" : "tersedia";
    try {
      const supabase = createClient();
      await updateRoom(supabase, room.id, { status: next });
      loadData();
      toastSuccess("Status kamar diubah ke " + (next === "tersedia" ? "Tersedia" : "Terisi"));
    } catch (e: any) {
      toastError("Gagal mengubah status: " + (e.message || "Terjadi kesalahan"));
    }
  }

  async function handleDeleteKos() {
    setDeleting(true);
    try {
      const supabase = createClient();
      await supabase.from("kos").delete().eq("id", id);
      toastSuccess("Kos berhasil dihapus");
      router.push("/owner/kos");
    } catch (e: any) {
      toastError("Gagal menghapus kos: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading)
    return (
      <OwnerShell activePage="properties">
        <div className="p-margin-mobile">
          <p className="text-outline">Memuat...</p>
        </div>
      </OwnerShell>
    );
  if (!kos)
    return (
      <OwnerShell activePage="properties">
        <div className="p-margin-mobile">
          <p className="text-error">Kos tidak ditemukan</p>
        </div>
      </OwnerShell>
    );

  const fotoSrc = kos.foto?.[0] ?? "/images/property-placeholder.jpg";
  const isVerified = kos.verification_status === "verified";

  return (
    <OwnerShell activePage="properties">
      <div className="w-full px-margin-mobile md:px-margin-desktop py-stack-lg max-w-[1280px] pb-32">
        {/* ── Header ringan (konsisten Tambah Kos) ── */}
        <div className="mb-stack-lg">
          <nav className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md mb-3">
            <Link href="/owner" className="hover:text-primary">Properti</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href="/owner/kos" className="hover:text-primary">Kelola Properti</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary font-bold line-clamp-1">{kos.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-fixed px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  <span className="material-symbols-outlined !text-sm">home_work</span>
                  Detail Properti
                </p>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-label-md font-bold">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-label-md font-bold">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Menunggu
                  </span>
                )}
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">
                Detail Properti: {kos.name}
              </h1>
              <p className="text-on-surface-variant font-body-md flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                {kos.address}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/owner/kos/${id}/edit`}
                className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
                Edit Info Kos
              </Link>
              <button
                onClick={() => setKosDeleteOpen(true)}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-error text-error rounded-xl font-bold hover:bg-error/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                {deleting ? "Menghapus..." : "Hapus Kos"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Bento Grid ── */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* Kiri: Foto + Deskripsi + Fasilitas */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl overflow-hidden card-shadow border border-outline-variant">
            <div className="h-80 w-full relative bg-surface-container-high">
              <img
                className="w-full h-full object-cover"
                src={fotoSrc}
                alt={kos.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/property-placeholder.jpg";
                }}
                style={{ fontVariationSettings: "'FILL' 0" }}
              />
            </div>
            <div className="p-stack-lg">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-sm">Deskripsi Properti</h3>
              <p className="text-on-surface-variant font-body-md leading-relaxed mb-stack-md">
                {kos.description || "Belum ada deskripsi."}
              </p>

              {facilities.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {facilities.map((f) => (
                    <div key={f.id} className="flex flex-col items-center p-3 bg-surface-container-low rounded-xl">
                      <div className="w-10 h-10 bg-primary-fixed text-primary rounded-full flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined">{facilityIcon(f)}</span>
                      </div>
                      <span className="text-label-md text-on-surface text-center">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kanan: Stats + Lokasi */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
            <div className="bg-primary p-stack-lg rounded-2xl card-shadow text-white relative overflow-hidden">
              {/* Grid pattern halus — konsisten hero */}
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }} />
              <div className="relative">
                <h3 className="font-title-lg text-title-lg mb-stack-md opacity-90">Ringkasan Kamar</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[32px] font-bold">{totalRooms}</div>
                    <div className="text-label-md opacity-80">Total Unit</div>
                  </div>
                  <div>
                    <div className="text-[32px] font-bold">{terisi}</div>
                    <div className="text-label-md opacity-80">Terisi</div>
                  </div>
                  <div>
                    <div className="text-[32px] font-bold text-secondary-fixed">{tersedia}</div>
                    <div className="text-label-md opacity-80">Tersedia</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-outline-variant h-full">
              <div className="p-stack-md flex items-center justify-between border-b border-outline-variant">
                <h3 className="font-title-lg text-title-lg text-on-surface">Lokasi</h3>
                {kos.latitude && kos.longitude ? (
                  <a
                    href={`https://www.google.com/maps?q=${kos.latitude},${kos.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold text-label-md hover:underline"
                  >
                    Buka Maps
                  </a>
                ) : null}
              </div>
              <div className="h-64 relative">
                {kos.latitude && kos.longitude ? (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${kos.longitude - 0.01}%2C${kos.latitude - 0.01}%2C${kos.longitude + 0.01}%2C${kos.latitude + 0.01}&layer=mapnik&marker=${kos.latitude}%2C${kos.longitude}`}
                    style={{ border: "none" }}
                    title="Lokasi Properti"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface-variant">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl block mb-2">map</span>
                      <p className="font-body-sm">Lokasi belum diatur</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daftar Kamar — tabel full width */}
          <div className="col-span-12 bg-white rounded-2xl card-shadow border border-outline-variant overflow-hidden">
            <div className="p-stack-lg border-b border-outline-variant flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Daftar Kamar</h2>
                <p className="text-on-surface-variant font-body-sm">Kelola status dan harga setiap unit kamar.</p>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Tambah Kamar Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Nama/Nomor Kamar</th>
                    <th className="px-6 py-4 font-semibold">Tipe</th>
                    <th className="px-6 py-4 font-semibold">Harga / Bulan</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="max-w-sm mx-auto rounded-2xl border-2 border-dashed border-outline-variant p-8">
                          <span className="material-symbols-outlined text-4xl text-outline block mb-2">meeting_room</span>
                          <p className="text-on-surface-variant font-body-md">Belum ada kamar. Klik &quot;Tambah Kamar Baru&quot; untuk memulai.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-surface-container-low/60 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-title-lg text-primary">{room.room_number}</div>
                          <div className="text-body-sm text-on-surface-variant">
                            {room.description || (room.size_sqm ? `${room.size_sqm} m²` : "-")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-label-md bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full">
                            {room.size_sqm ? (room.size_sqm >= 20 ? "Deluxe" : "Standard") : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-on-surface">{formatPrice(room.price_per_month)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleStatus(room)}
                              className={`px-3 py-1 rounded-full text-label-md font-bold transition-colors cursor-pointer ${
                                statusColors[room.status] || "bg-outline/10 text-outline"
                              }`}
                              title="Klik untuk ubah status"
                            >
                              {statusLabels[room.status] || room.status}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(room)}
                              className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-all"
                              title="Edit kamar"
                            >
                              <span className="material-symbols-outlined">edit_note</span>
                            </button>
                            <button
                              onClick={() => openDeleteModal(room)}
                              className="p-2 text-error hover:bg-error/10 rounded-lg transition-all"
                              title="Hapus kamar"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {rooms.length > 0 && (
              <div className="p-stack-md bg-surface-container-low flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">
                  Menampilkan 1-{rooms.length} dari {totalRooms} kamar
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRoom ? "Edit Kamar" : "Tambah Kamar Baru"}>
        <form onSubmit={handleRoomSubmit} className="space-y-5 p-4">
          <h2 className="text-xl font-bold text-on-surface">
            {editRoom ? "Edit Kamar" : "Tambah Kamar Baru"}
          </h2>
          <Input
            id="rm-room-number"
            label="Nomor Kamar"
            value={rmRoomNumber}
            onChange={(e) => setRmRoomNumber(e.target.value)}
            required
          />
          <Input
            id="rm-price"
            label="Harga per Bulan (Rp)"
            type="number"
            value={rmPrice}
            onChange={(e) => setRmPrice(e.target.value)}
            required
          />
          <Input
            id="rm-size"
            label="Luas (m²)"
            type="number"
            value={rmSize}
            onChange={(e) => setRmSize(e.target.value)}
          />
          <Input
            id="rm-desc"
            label="Deskripsi / Lokasi Kamar"
            value={rmDescription}
            onChange={(e) => setRmDescription(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={rmSaving}>
              {rmSaving ? "Menyimpan..." : editRoom ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Room Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Hapus Kamar"
      >
        <div className="p-4 space-y-5">
          <p className="text-on-surface-variant font-body-md">
            Yakin ingin menghapus kamar{" "}
            <span className="font-bold text-on-surface">{deleteTarget?.room_number}</span>?
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deletingRoom}
              onClick={handleDeleteRoom}
            >
              {deletingRoom ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Kos Confirmation Modal */}
      <Modal
        open={kosDeleteOpen}
        onClose={() => setKosDeleteOpen(false)}
        title="Hapus Kos"
      >
        <div className="p-4 space-y-5">
          <p className="text-on-surface-variant font-body-md">
            Yakin ingin menghapus kos{" "}
            <span className="font-bold text-on-surface">{kos.name}</span>?
            Semua data kamar akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setKosDeleteOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="danger" disabled={deleting} onClick={handleDeleteKos}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </div>
      </Modal>
    </OwnerShell>
  );
}
