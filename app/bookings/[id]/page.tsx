"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getBankAccounts,
  submitPaymentProof,
  getSignedProofUrl,
} from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toastSuccess, toastError, toastInfo, toastLoading, toastDismiss } from "@/lib/toast";
import { getSnapScriptUrl } from "@/lib/midtrans";
import { BOOKING_STATUS, getStatusKey } from "@/lib/bookingStatus";
import { formatWhatsAppNumber } from "@/lib/utils";

interface BookingDetail {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_proof_path: string | null;
  payment_note: string | null;
  move_in_date: string | null;
  created_at: string;
  notes: string | null;
  duration_months: number | null;
  total_amount: number | null;
  rooms?: {
    room_number?: string;
    price_per_month?: number;
    kos?: { id: string; name?: string; whatsapp_number?: string };
  };
}

const statusLabels: Record<string, string> = {
  ...Object.fromEntries(Object.entries(BOOKING_STATUS).map(([k, v]) => [k, v.label])),
  pending: "Menunggu Persetujuan Pemilik",
};


const statusStyles: Record<string, string> = {
  ...Object.fromEntries(Object.entries(BOOKING_STATUS).map(([k, v]) => [k, v.className])),
};

const statusIcons: Record<string, string> = {
  ...Object.fromEntries(Object.entries(BOOKING_STATUS).map(([k, v]) => [k, v.icon])),
};

function getStatusKeyLocal(booking: BookingDetail): string {
  return getStatusKey(booking);
}
function formatPrice(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Guard sinkron anti double-invoke: state async (re-render telat), ref langsung kebaca.
  const payingRef = useRef(false);
  const popupOpenRef = useRef(false);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, rooms:room_id(*, kos:kos_id(*))")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toastError("Gagal memuat detail booking: " + (error.message || ""));
      setLoading(false);
      return;
    }
    setBooking(data);
    if (data?.rooms?.kos?.id) {
      try {
        const accounts = await getBankAccounts(supabase, data.rooms.kos.id);
        setBankAccounts(accounts);
      } catch {
        setBankAccounts([]);
      }
    }
    // Generate signed URL jika ada bukti yang sudah dikirim
    if (data?.payment_proof_path) {
      try {
        const url = await getSignedProofUrl(supabase, data.payment_proof_path, 3600);
        setProofUrl(url);
      } catch {
        setProofUrl(null);
      }
    } else {
      setProofUrl(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!proofFile) {
      toastError("Pilih file bukti transfer terlebih dahulu");
      return;
    }
    setSubmitting(true);
    const toastId = toastLoading("Mengunggah bukti transfer...");
    try {
      const supabase = createClient();
      // Upload ke storage bucket bukti-transfer (PRIVAT)
      const path = `proof/${id}/${crypto.randomUUID()}.${proofFile.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage
        .from("bukti-transfer")
        .upload(path, proofFile, { upsert: false });
      if (upErr) throw new Error("Gagal unggah file. Pastikan bucket 'bukti-transfer' ada.");

      // Simpan PATH (bukan public URL) — akses via signed URL
      await submitPaymentProof(supabase, id, path, note || null);
      toastDismiss(toastId);
      toastSuccess("Bukti transfer terkirim. Menunggu konfirmasi pemilik.");
      setModalOpen(false);
      setProofFile(null);
      setNote("");
      load();
    } catch (e: any) {
      toastDismiss(toastId);
      toastError("Gagal mengirim bukti transfer: " + (e.message || "Terjadi kesalahan"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayNow() {
    // Guard sinkron: cegah double-click / re-invoke saat popup masih terbuka
    if (payingRef.current || popupOpenRef.current) return;
    payingRef.current = true;
    setPaying(true);
    const toastId = toastLoading("Membuat transaksi pembayaran...");
    try {
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat transaksi");

      toastDismiss(toastId);
      // Load Snap.js lalu buka popup
      const snapScript = getSnapScriptUrl();
      const snapWin = window as Window & { snap?: { pay: (token: string, options?: unknown) => void } };
      if (!snapWin.snap) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = snapScript;
          script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Gagal memuat Snap.js"));
          document.head.appendChild(script);
        });
      }
      // Guard kedua: popup kebuka saat script load (misal klik lain)
      if (popupOpenRef.current) {
        payingRef.current = false;
        setPaying(false);
        return;
      }
      popupOpenRef.current = true;
      snapWin.snap!.pay(data.token, {
        onSuccess: () => {
          popupOpenRef.current = false;
          payingRef.current = false;
          setPaying(false);
          toastSuccess("Pembayaran berhasil! Menunggu konfirmasi sistem.");
          load();
        },
        onPending: () => {
          popupOpenRef.current = false;
          payingRef.current = false;
          setPaying(false);
          toastInfo("Pembayaran menunggu diselesaikan.");
          load();
        },
        onError: () => {
          popupOpenRef.current = false;
          payingRef.current = false;
          setPaying(false);
          toastError("Pembayaran gagal. Coba lagi.");
          load();
        },
        onClose: () => {
          popupOpenRef.current = false;
          payingRef.current = false;
          setPaying(false);
          toastInfo("Popup pembayaran ditutup. Pembayaran bisa dilanjutkan kapan saja.");
          load();
        },
      });
      // CATATAN: setPaying(false) TIDAK di finally — popup masih terbuka,
      // tombol harus tetap disabled sampai onClose/onSuccess/onError reset.
    } catch (e: any) {
      toastDismiss(toastId);
      toastError(e.message || "Gagal membuat transaksi pembayaran");
      payingRef.current = false;
      setPaying(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-outline">Memuat detail booking...</p>
      </div>
    );

  if (!booking)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Booking tidak ditemukan.</p>
          <Link href="/bookings" className="text-primary font-bold hover:underline">
            Kembali ke daftar booking
          </Link>
        </div>
      </div>
    );

  const isApproved = booking.status === "approved";
  const isPaid = booking.payment_status === "lunas";
  const waitingConfirm = booking.payment_status === "menunggu_konfirmasi";
  const usingMidtrans = booking.payment_method === "midtrans";
  const kos = booking.rooms?.kos;
  const total = booking.total_amount ?? (booking.rooms?.price_per_month ?? 0) * (booking.duration_months ?? 1);

  return (
    <div className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-stack-lg">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-stack-md font-label-md"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          KEMBALI KE BOOKING
        </Link>

        {/* Header */}
        <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary mb-1">
                {kos?.name || "Kos"}
              </h1>
              <p className="text-on-surface-variant font-body-md">
                Kamar {booking.rooms?.room_number || "-"}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md font-bold ${
                  statusStyles[getStatusKeyLocal(booking)] || "bg-surface-variant text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {statusIcons[getStatusKeyLocal(booking)] || "info"}
                </span>
                {statusLabels[getStatusKeyLocal(booking)] || booking.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-stack-md bg-surface-container-low p-4 rounded-lg">
            <div>
              <p className="font-label-md text-[10px] uppercase text-outline mb-1">Tanggal Masuk</p>
              <p className="font-body-md font-semibold text-on-surface">
                {formatDate(booking.move_in_date || booking.created_at)}
              </p>
            </div>
            <div>
              <p className="font-label-md text-[10px] uppercase text-outline mb-1">Total Sewa</p>
              <p className="font-body-md font-semibold text-primary">{formatPrice(total)}</p>
            </div>
            <div>
              <p className="font-label-md text-[10px] uppercase text-outline mb-1">Durasi</p>
              <p className="font-body-md font-semibold text-on-surface">
                {booking.duration_months || 1} bulan
              </p>
            </div>
            <div>
              <p className="font-label-md text-[10px] uppercase text-outline mb-1">Status Booking</p>
              <p className="font-body-md font-semibold text-on-surface">
                {statusLabels[getStatusKeyLocal(booking)] || booking.status}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {isApproved && !isPaid && (
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-md">
              Booking Disetujui — Silakan Lanjutkan Pembayaran
            </h2>

            {waitingConfirm ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-tertiary/10 border border-tertiary/20">
                <span className="material-symbols-outlined text-tertiary mt-0.5">hourglass_top</span>
                <div>
                  <p className="font-body-md text-on-surface font-semibold">
                    Bukti transfer Anda sedang diperiksa pemilik kos.
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Status akan berubah menjadi &quot;Lunas&quot; setelah dikonfirmasi. Biasanya dalam 1x24 jam.
                  </p>
                  {proofUrl ? (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary font-bold text-label-md mt-2 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">image</span>
                      Lihat bukti yang dikirim
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-primary font-bold text-label-md mt-2 opacity-60">
                      <span className="material-symbols-outlined text-sm">image</span>
                      Lihat bukti yang dikirim
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Tombol utama: Midtrans Snap */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 mb-stack-md">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">credit_card</span>
                    <div>
                      <p className="font-body-md text-on-surface font-semibold">
                        Bayar online dengan Midtrans
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        Pilih metode: Bank Transfer, Virtual Account, E-Wallet (GoPay, OVO, DANA), atau kartu kredit.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handlePayNow} disabled={paying} className="w-full md:w-auto">
                  <span className="material-symbols-outlined text-sm mr-2">lock</span>
                  {paying ? "Membuat Transaksi..." : "Bayar Sekarang"}
                </Button>

                {/* Fallback: manual transfer (bila Midtrans tidak tersedia) */}
                <details className="mt-stack-md">
                  <summary className="text-label-md text-primary font-bold cursor-pointer hover:underline">
                    Bayar manual (transfer bank) sebagai alternatif
                  </summary>
                  <div className="mt-3 space-y-3">
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant bg-surface-container-low"
                        >
                          <div>
                            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                              {acc.bank_name}
                            </p>
                            <p className="font-headline-md text-headline-md text-primary font-bold tracking-wider">
                              {acc.account_number}
                            </p>
                            <p className="text-body-sm text-on-surface-variant">a.n. {acc.account_holder}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(acc.account_number)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Salin nomor rekening"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-lg bg-tertiary/10 border border-tertiary/20">
                        <p className="text-body-sm text-on-surface-variant">
                          Nomor rekening belum diatur oleh pemilik kos. Hubungi{" "}
                          {kos?.whatsapp_number ? (
                            <a
                              href={`https://wa.me/${formatWhatsAppNumber(kos.whatsapp_number)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-bold"
                            >
                              pemilik via WhatsApp
                            </a>
                          ) : (
                            "pemilik kos"
                          )}{" "}
                          untuk instruksi transfer.
                        </p>
                      </div>
                    )}
                    {bankAccounts.length > 0 && (
                      <Button onClick={() => setModalOpen(true)} variant="ghost">
                        <span className="material-symbols-outlined text-sm mr-2">upload</span>
                        Saya Sudah Transfer
                      </Button>
                    )}
                  </div>
                </details>
              </>
            )}
          </div>
        )}

        {isPaid && (
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <span className="material-symbols-outlined text-secondary mt-0.5">check_circle</span>
              <div>
                <p className="font-body-md text-on-surface font-semibold">Pembayaran Lunas</p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Terima kasih! Pembayaran Anda telah dikonfirmasi. Siap check-in.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Proof Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Kirim Bukti Transfer"
      >
        <form onSubmit={handleSubmitProof} className="p-4 space-y-5">
          <div>
            <label htmlFor="proof-file" className="block text-sm font-medium text-on-surface-variant mb-2">
              File Bukti Transfer (JPG/PNG/PDF)
            </label>
            <input
              id="proof-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-on-surface-variant file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary file:text-on-primary file:font-bold file:cursor-pointer hover:file:brightness-110 transition-all"
            />
          </div>
          <Input
            id="proof-note"
            label="Catatan (opsional)"
            placeholder="Contoh: transfer dari BCA a.n. Budi"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim Bukti"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
