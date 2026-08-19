"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createKos, uploadFoto, getFacilities, insertKosFacilities } from "@/lib/supabase/queries";
import {
  ValidationError,
  validateRequiredText,
  validatePhone,
  validateOptionalText,
  validateEmojiLimit,
} from "@/lib/validation";
import type { Facility } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import OwnerShell from "@/components/layout/OwnerShell";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-sm text-on-surface-variant">
      <span className="material-symbols-outlined mr-2">map</span> Loading peta...
    </div>
  ),
});

const FACILITY_ICONS: Record<string, string> = {
  ac_unit: "ac_unit",
  wifi: "wifi",
  shower: "shower",
  dapur: "cooking",
  parkir_motor: "moped",
  parkir_mobil: "local_parking",
  lemari: "checkroom",
  kasur: "bed",
  meja: "desk",
  tv: "tv",
  kulkas: "kitchen",
  listrik: "bolt",
  air: "water_drop",
  keamanan: "security",
  laundry: "local_laundry_service",
  ruang_tamu: "living",
  akses_24jam: "schedule",
};

const FACILITY_DEFAULTS: { name: string; icon: string }[] = [
  { name: "AC", icon: "ac_unit" },
  { name: "WiFi", icon: "wifi" },
  { name: "Kamar Mandi Dalam", icon: "shower" },
  { name: "Dapur", icon: "cooking" },
  { name: "Parkir Motor", icon: "moped" },
  { name: "Parkir Mobil", icon: "local_parking" },
  { name: "Lemari", icon: "checkroom" },
  { name: "Kasur", icon: "bed" },
  { name: "TV", icon: "tv" },
  { name: "Kulkas", icon: "kitchen" },
  { name: "Listrik", icon: "bolt" },
  { name: "Air", icon: "water_drop" },
  { name: "Keamanan 24 Jam", icon: "security" },
  { name: "Laundry", icon: "local_laundry_service" },
  { name: "Ruang Tamu", icon: "living" },
  { name: "Akses 24 Jam", icon: "schedule" },
];

// ── Input styling konsisten (token project) ──
const inputCls =
  "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none";

const cardCls =
  "bg-white p-stack-lg rounded-2xl border border-outline-variant card-shadow";

const sectionTitle = (icon: string, title: string, desc?: string) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 shrink-0 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div>
      <h3 className="font-title-lg text-title-lg text-on-surface leading-tight">{title}</h3>
      {desc && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{desc}</p>}
    </div>
  </div>
);

export default function CreateKosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("+62");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [dbFacilities, setDbFacilities] = useState<Facility[]>([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const data = await getFacilities(supabase);
        setDbFacilities(data);
      } catch (error) {
        console.error("[Owner] Failed to load facilities:", error);
      }
    })();
  }, []);

  const facilityList = dbFacilities.length > 0
    ? dbFacilities
    : FACILITY_DEFAULTS.map((f, i) => ({
        id: `placeholder_${i}`,
        name: f.name,
        icon: f.icon,
      }));

  function toggleFacility(fid: string) {
    setSelectedFacilityIds((prev) =>
      prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid]
    );
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setFotoFiles((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () =>
        setFotoPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeFoto(index: number) {
    setFotoFiles((prev) => prev.filter((_, i) => i !== index));
    setFotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Harus login");

      // ── VALIDASI SERVER-SIDE (bukan cuma HTML required) ──
      let cleanName: string, cleanAddress: string, cleanWa: string, cleanDesc: string | null;
      try {
        cleanName = validateRequiredText(name, "Nama Kos", 100);
        cleanAddress = validateRequiredText(address, "Alamat", 300);
        cleanWa = validatePhone(whatsappNumber);
        cleanDesc = validateOptionalText(description, "Deskripsi", 2000);
        validateEmojiLimit(cleanName + (cleanDesc ?? ""), "Nama/Deskripsi");
      } catch (e) {
        if (e instanceof ValidationError) {
          setError(e.message);
          setLoading(false);
          return;
        }
        throw e;
      }

      const kos = await createKos(supabase, {
        owner_id: user.id,
        name: cleanName,
        address: cleanAddress,
        whatsapp_number: cleanWa,
        latitude,
        longitude,
        description: cleanDesc,
      });

      const realIds = selectedFacilityIds.filter((id) => !id.startsWith("placeholder_"));
      if (realIds.length > 0) {
        await insertKosFacilities(supabase, kos.id, realIds);
      }

      if (fotoFiles.length > 0) {
        const urls: string[] = [];
        for (const file of fotoFiles) {
          const url = await uploadFoto(supabase, kos.id, file);
          urls.push(url);
        }
        await supabase.from("kos").update({ foto: urls }).eq("id", kos.id);
      }

      router.push(`/owner/kos/${kos.id}`);
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan kos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OwnerShell activePage="properties">
      <main className="w-full px-margin-mobile md:px-margin-desktop py-stack-lg max-w-[1280px]">
        {/* ── Header ringan (form butuh ruang baca, bukan panel gelap) ── */}
        <div className="mb-stack-lg">
          <nav className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md mb-3">
            <Link href="/owner" className="hover:text-primary">Properti</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary font-bold">Tambah Kos Baru</span>
          </nav>
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-fixed px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">
            <span className="material-symbols-outlined !text-sm">add_home</span>
            Properti Baru
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Tambah Properti Kos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">
            Lengkapi informasi properti Anda untuk mulai menarik penyewa potensial.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
            {/* === KOLOM UTAMA === */}
            <div className="xl:col-span-8 space-y-stack-lg">

              {/* 1. INFORMASI DASAR + LOKASI */}
              <div className={cardCls}>
                {sectionTitle("info", "Informasi Dasar", "Detail dasar properti Anda")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mt-stack-md">
                  <div className="space-y-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="kos-name">Nama Properti *</label>
                    <input
                      id="kos-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Kos Putri Sejahtera"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="kos-wa">Nomor WhatsApp *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">+62</span>
                      <input
                        id="kos-wa"
                        value={whatsappNumber.replace("+62", "")}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^\d]/g, "");
                          setWhatsappNumber("+62" + v);
                        }}
                        placeholder="812 3456 7890"
                        required
                        className={inputCls + " pl-14"}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mt-stack-md">
                  <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="kos-address">Alamat Lengkap *</label>
                  <textarea
                    id="kos-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Pendidikan No. 45, Kecamatan Sukolilo, Surabaya"
                    required
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </div>
                <div className="space-y-1 mt-stack-md">
                  <label className="block font-label-md text-label-md text-on-surface-variant">Titik Koordinat (Map Picker)</label>
                  <MapPicker
                    lat={latitude}
                    lng={longitude}
                    onSelect={async (newLat, newLng) => {
                      setLatitude(newLat);
                      setLongitude(newLng);
                      try {
                        const res = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&accept-language=id`,
                          { headers: { "User-Agent": "NestU-App/1.0" } }
                        );
                        const data = await res.json();
                        if (data?.display_name) setAddress(data.display_name);
                      } catch (e) {
                        console.error("Reverse geocode failed:", e);
                      }
                    }}
                  />
                  {latitude !== null && longitude !== null && (
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">my_location</span>
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. FASILITAS */}
              <div className={cardCls}>
                {sectionTitle("checklist", "Fasilitas Kos", "Pilih fasilitas yang tersedia di properti Anda")}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-stack-md mt-stack-md">
                  {facilityList.map((f) => {
                    const selected = selectedFacilityIds.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`group flex flex-col items-center justify-center p-stack-md border-2 rounded-xl cursor-pointer transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleFacility(f.id)}
                          className="hidden peer"
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                          selected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary"
                        }`}>
                          <span className="material-symbols-outlined">
                            {f.icon && FACILITY_ICONS[f.icon] ? FACILITY_ICONS[f.icon] : f.icon || "check"}
                          </span>
                        </div>
                        <span className={`font-label-md text-label-md text-center ${
                          selected ? "text-primary font-bold" : "text-on-surface-variant"
                        }`}>
                          {f.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. FOTO */}
              <div className={cardCls}>
                {sectionTitle("photo_library", "Foto Properti", "Upload minimal 3 foto berkualitas tinggi. Format JPG/PNG, max 5MB")}
                <label className="mt-stack-md border-2 border-dashed border-outline-variant rounded-2xl p-stack-lg bg-surface-container-low flex flex-col items-center justify-center text-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                  </div>
                  <p className="font-title-lg text-title-lg text-on-surface">Klik atau seret foto ke sini</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Upload minimal 3 foto berkualitas tinggi. Format JPG/PNG, max 5MB.</p>
                  <input type="file" accept="image/*" multiple onChange={handleFotoChange} className="hidden" />
                </label>
                {fotoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-stack-md">
                    {fotoPreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <Image src={src} alt="preview" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFoto(i)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-error text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                        {i === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[10px] font-bold py-1 text-center">UTAMA</div>
                        )}
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-outline-variant flex items-center justify-center text-outline-variant hover:text-primary hover:border-primary transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-4xl">add</span>
                      <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* 4. DESKRIPSI (label tanpa * — tidak required) */}
              <div className={cardCls}>
                {sectionTitle("description", "Deskripsi Properti", "Ceritakan keunggulan properti Anda")}
                <div className="space-y-1 mt-stack-md">
                  <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="kos-desc">Tuliskan keunggulan properti Anda</label>
                  <div className="border border-outline-variant rounded-lg overflow-hidden">
                    <div className="bg-surface-container-high p-2 flex gap-2 border-b border-outline-variant">
                      <button type="button" className="p-1 hover:bg-surface-container rounded transition-colors material-symbols-outlined text-[18px]">format_bold</button>
                      <button type="button" className="p-1 hover:bg-surface-container rounded transition-colors material-symbols-outlined text-[18px]">format_italic</button>
                      <button type="button" className="p-1 hover:bg-surface-container rounded transition-colors material-symbols-outlined text-[18px]">format_list_bulleted</button>
                      <button type="button" className="p-1 hover:bg-surface-container rounded transition-colors material-symbols-outlined text-[18px]">link</button>
                    </div>
                    <textarea
                      id="kos-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Kos ini terletak sangat dekat dengan kampus ITS dan Unair. Kamar baru saja direnovasi dengan furnitur berkualitas premium..."
                      rows={6}
                      className="w-full px-4 py-3 bg-surface-container-low font-body-md text-body-md text-on-surface outline-none border-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── STICKY SUBMIT BAR ── */}
              <div className="sticky bottom-4 z-10">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-outline-variant card-shadow p-4 flex flex-col sm:flex-row items-center gap-stack-md justify-end">
                  {error && (
                    <p className="bg-error-container/20 text-on-error-container p-3 rounded-lg font-body-sm text-body-sm w-full sm:w-auto sm:mr-auto">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-10 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all font-label-md text-label-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-12 py-3 rounded-lg bg-primary text-on-primary font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 font-label-md text-label-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">save</span>
                    {loading ? "Menyimpan..." : "Simpan Properti"}
                  </button>
                </div>
              </div>
            </div>

            {/* === SIDEBAR === */}
            <div className="xl:col-span-4 space-y-stack-lg xl:sticky xl:top-6">
              <div className="bg-primary-container text-on-primary-container p-stack-lg rounded-2xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-title-lg text-title-lg mb-2">Tips Properti Laku Cepat</h4>
                  <ul className="space-y-4 font-body-sm text-body-sm opacity-90">
                    <li className="flex gap-3">
                      <span className="material-symbols-outlined text-secondary-container">stars</span>
                      <span>Gunakan foto dengan pencahayaan alami untuk kesan yang lebih luas dan bersih.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="material-symbols-outlined text-secondary-container">stars</span>
                      <span>Sebutkan jarak tempuh ke kampus atau fasilitas umum terdekat dalam deskripsi.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="material-symbols-outlined text-secondary-container">stars</span>
                      <span>Pastikan nomor WhatsApp aktif untuk merespon calon penyewa dengan cepat.</span>
                    </li>
                  </ul>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10">
                  <span className="material-symbols-outlined text-[120px]">lightbulb</span>
                </div>
              </div>

              <div className="bg-white p-stack-lg rounded-2xl border border-outline-variant card-shadow">
                <h4 className="font-title-lg text-title-lg text-on-surface mb-4">Butuh Bantuan?</h4>
                <div className="space-y-stack-md">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">Hotline Dukungan</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">+62 800 1234 567</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">Email Support</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">owner-care@netsu.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </OwnerShell>
  );
}
