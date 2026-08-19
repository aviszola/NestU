"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getKosById, updateKos, uploadFoto, getFacilities, setKosFacilities } from "@/lib/supabase/queries";
import { ValidationError, validateRequiredText, validatePhone, validateOptionalText, validateEmojiLimit } from "@/lib/validation";
import type { Kos, Facility } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { facilityIcon } from "@/components/KosCard";
import dynamic from "next/dynamic";
import OwnerShell from "@/components/layout/OwnerShell";
import Image from "next/image";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-sm text-on-surface-variant card-shadow">
      <span className="material-symbols-outlined mr-2">map</span> Loading peta...
    </div>
  ),
});

export default function EditKosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [fotoBaru, setFotoBaru] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [existingFoto, setExistingFoto] = useState<string[]>([]);

  // Snapshot original values to detect changes
  const originalRef = useRef<{
    name: string;
    address: string;
    whatsapp_number: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    facilityIds: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const [kos, allFacilities] = await Promise.all([
          getKosById(supabase, id),
          getFacilities(supabase),
        ]);

        if (!kos || kos.owner_id !== user?.id) {
          setError("Kos tidak ditemukan atau bukan milik Anda");
          return;
        }

        setFacilities(allFacilities);
        setName(kos.name);
        setAddress(kos.address);
        setWhatsappNumber(kos.whatsapp_number ?? "");
        setDescription(kos.description ?? "");
        setLatitude(kos.latitude);
        setLongitude(kos.longitude);
        setSelectedFacilityIds((kos.fasilitas ?? []).map((f: any) => f.id));
        setExistingFoto(kos.foto ?? []);

        originalRef.current = {
          name: kos.name,
          address: kos.address,
          whatsapp_number: kos.whatsapp_number ?? "",
          description: kos.description ?? "",
          latitude: kos.latitude,
          longitude: kos.longitude,
          facilityIds: (kos.fasilitas ?? []).map((f: any) => f.id),
        };
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleFacility(fid: string) {
    setSelectedFacilityIds((prev) =>
      prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid]
    );
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setFotoBaru((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () =>
        setFotoPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const orig = originalRef.current;

      // VALIDASI SERVER-SIDE (sanitasi sebelum update)
      let cleanName: string, cleanAddress: string, cleanWa: string, cleanDesc: string | null;
      try {
        cleanName = validateRequiredText(name, "Nama Kos", 100);
        cleanAddress = validateRequiredText(address, "Alamat", 300);
        cleanWa = validatePhone(whatsappNumber);
        cleanDesc = validateOptionalText(description, "Deskripsi", 2000);
        validateEmojiLimit(cleanName + (cleanDesc ?? ""), "Nama/Deskripsi");
      } catch (e) {
        if (e instanceof ValidationError) { setError(e.message); setSaving(false); return; }
        throw e;
      }

      const patch: Record<string, any> = {};
      if (orig) {
        if (name !== orig.name) patch.name = cleanName;
        if (address !== orig.address) patch.address = cleanAddress;
        if (whatsappNumber !== orig.whatsapp_number) patch.whatsapp_number = cleanWa;
        const desc = cleanDesc;
        if (desc !== orig.description) patch.description = desc;
        if (latitude !== orig.latitude) patch.latitude = latitude;
        if (longitude !== orig.longitude) patch.longitude = longitude;
      } else {
        // No snapshot — send all
        patch.name = cleanName;
        patch.address = cleanAddress;
        patch.whatsapp_number = cleanWa;
        patch.description = cleanDesc;
        patch.latitude = latitude;
        patch.longitude = longitude;
      }

      const facilityChanged = !orig || JSON.stringify(selectedFacilityIds) !== JSON.stringify(orig.facilityIds);

      if (Object.keys(patch).length > 0) {
        await updateKos(supabase, id, patch);
      }
      if (facilityChanged) {
        await setKosFacilities(supabase, id, selectedFacilityIds);
      }

      if (Object.keys(patch).length === 0 && !facilityChanged && fotoBaru.length === 0) {
        // Nothing changed at all
        router.push(`/owner/kos/${id}`);
        return;
      }

      if (fotoBaru.length > 0) {
        const urls = [...existingFoto];
        for (const file of fotoBaru) {
          const url = await uploadFoto(supabase, id, file);
          urls.push(url);
        }
        await supabase.from("kos").update({ foto: urls }).eq("id", id);
      }

      router.push(`/owner/kos/${id}`);
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-outline">Memuat...</p>;

  return (
    <OwnerShell activePage="properties">
      <div className="px-margin-mobile md:px-margin-desktop py-stack-lg max-w-2xl">
      <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
        Edit Properti: {name}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="name"
          label="Nama Kos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="address"
          label="Alamat"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <Input
          id="whatsapp_number"
          label="Nomor WhatsApp"
          type="tel"
          value={whatsappNumber}
          onChange={(e) => {
            let v = e.target.value;
            v = v.replace(/[^\d+]/g, "");
            if (!v.startsWith("+62")) v = "+62";
            setWhatsappNumber(v);
          }}
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">
            Lokasi (klik peta)
          </label>
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">
            Deskripsi Properti
          </label>
          <textarea
            id="kos-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tuliskan deskripsi properti Anda..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-on-surface-variant">
            Fasilitas
          </label>
          <div className="flex flex-wrap gap-2">
            {facilities.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFacility(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedFacilityIds.includes(f.id)
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{facilityIcon(f)}</span> {f.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">
            Tambah Foto
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFotoChange}
            className="block w-full text-sm text-outline file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 transition-all"
          />
          {existingFoto.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {existingFoto.map((url, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden opacity-60">
                <Image
                  src={url}
                  alt="existing"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              ))}
              {fotoPreviews.map((src, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden">
                <Image
                  src={src}
                  alt="new"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-error flex items-center gap-2 bg-error/5 p-3 rounded-lg"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Batal
          </Button>
        </div>
      </form>
      </div>
    </OwnerShell>
  );
}
