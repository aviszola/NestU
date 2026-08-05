import type { Facility, Kos, Room } from "@/lib/types";

const STORAGE_BUCKET = "kos-foto";

// ─── Kos CRUD ────────────────────────────────────────────

export async function getVerifiedKosList(
  client: any,
  userId?: string
): Promise<any[]> {
  let query = client
    .from("kos")
    .select("*, kos_facilities(facility_id, facility:facility_id(name))")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(4);

  const { data, error } = await query;
  if (error) throw error;

  let favoriteIds: Set<string> = new Set();
  if (userId) {
    const { data: favs } = await client
      .from("favorites")
      .select("kos_id")
      .eq("student_id", userId);
    if (favs) favoriteIds = new Set(favs.map((f: any) => f.kos_id));
  }

  return (data ?? []).map((row: any) => ({
    ...mapKosRow(row),
    isFavorited: favoriteIds.has(row.id),
  }));
}

export async function getUserFavoritesSet(
  client: any,
  userId: string
): Promise<Set<string>> {
  const { data } = await client
    .from("favorites")
    .select("kos_id")
    .eq("student_id", userId);
  return new Set((data ?? []).map((f: any) => f.kos_id));
}

export async function getKosList(
  client: any,
  options: {
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    type?: string;
    facilities?: string[];
    sort?: "newest" | "cheapest" | "expensive" | "rating";
    page?: number;
    limit?: number;
  } = {}
): Promise<{ data: Kos[]; total: number }> {
  let query = client
    .from("kos")
    .select("*, kos_facilities(facility_id, facility:facility_id(name, icon))", {
      count: "exact",
    })
    .eq("verification_status", "verified")
    .eq("is_active", true);

  // Search
  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,address.ilike.%${options.search}%`
    );
  }

  // Harga — filtered via cheapest room in subquery workaround
  if (options.minPrice) query = query.gte("price", options.minPrice);
  if (options.maxPrice) query = query.lte("price", options.maxPrice);

  // Tipe
  if (options.type) query = query.eq("type", options.type);

  // Fasilitas — filter via junction table
  if (options.facilities?.length) {
    query = query.filter(
      "kos_facilities.facility_id",
      "in",
      `(${options.facilities.join(",")})`
    );
  }

  // Urutkan
  switch (options.sort) {
    case "cheapest":
      query = query.order("price", { ascending: true });
      break;
    case "expensive":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Pagination
  const page = options.page || 1;
  const limit = options.limit || 8;
  const start = (page - 1) * limit;
  query = query.range(start, start + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(mapKosRow), total: count || 0 };
}

export async function getKosById(
  client: any,
  id: string
): Promise<Kos | null> {
  const { data, error } = await client
    .from("kos")
    .select("*, kos_facilities(facility_id, facility:facility_id(name, icon))")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data ? mapKosRow(data) : null;
}

function mapKosRow(row: any): Kos {
  const { kos_facilities, ...rest } = row;
  return {
    ...rest,
    fasilitas: (kos_facilities ?? []).map((kf: any) => ({
      id: kf.facility_id,
      name: kf.facility?.name ?? kf.facility_id,
      icon: kf.facility?.icon ?? null,
    })),
  };
}

export async function getFacilities(client: any): Promise<Facility[]> {
  const { data, error } = await client
    .from("facilities")
    .select("id, name, icon")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createKos(
  client: any,
  values: {
    owner_id: string;
    name: string;
    address: string;
    whatsapp_number: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
  }
): Promise<Kos> {
  const { data, error } = await client
    .from("kos")
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertKosFacilities(
  client: any,
  kosId: string,
  facilityIds: string[]
): Promise<void> {
  if (facilityIds.length === 0) return;
  const rows = facilityIds.map((fid) => ({ kos_id: kosId, facility_id: fid }));
  const { error } = await client.from("kos_facilities").insert(rows);
  if (error) throw error;
}

export async function setKosFacilities(
  client: any,
  kosId: string,
  facilityIds: string[]
): Promise<void> {
  // Replace all facilities for this kos
  const { error: delErr } = await client
    .from("kos_facilities")
    .delete()
    .eq("kos_id", kosId);
  if (delErr) throw delErr;
  await insertKosFacilities(client, kosId, facilityIds);
}

export async function updateKos(
  client: any,
  id: string,
  values: Partial<{
    name: string;
    address: string;
    whatsapp_number: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
  }>
): Promise<Kos> {
  const { data, error } = await client
    .from("kos")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKos(client: any, id: string): Promise<void> {
  const { error } = await client.from("kos").delete().eq("id", id);
  if (error) throw error;
}

// ─── Rooms CRUD ──────────────────────────────────────────

export async function getRoomsByKosId(
  client: any,
  kosId: string
): Promise<Room[]> {
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("kos_id", kosId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createRoom(
  client: any,
  values: {
    kos_id: string;
    room_number: string;
    price_per_month: number;
    size_sqm: number | null;
    description: string | null;
  }
): Promise<Room> {
  const { data, error } = await client
    .from("rooms")
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoom(
  client: any,
  id: string,
  values: Partial<{
    room_number: string;
    price_per_month: number;
    size_sqm: number | null;
    description: string | null;
    status: "tersedia" | "terisi" | "dipesan";
  }>
): Promise<Room> {
  const { data, error } = await client
    .from("rooms")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(client: any, id: string): Promise<void> {
  const { error } = await client.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

// ─── Storage (foto) ──────────────────────────────────────

export async function uploadFoto(
  client: any,
  kosId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `kos/${kosId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export async function deleteFoto(
  client: any,
  url: string
): Promise<void> {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  if (!url.startsWith(base)) return;
  const path = url.slice(base.length);
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([path]);
  if (error) throw error;
}

// ─── Bookings ─────────────────────────────────────────────

export interface Booking {
  id: string;
  student_id: string;
  room_id: string;
  status: "pending" | "approved" | "cancelled" | "completed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  move_in_date: string | null;
  rejection_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

export async function getUserBookings(
  client: any,
  userId: string
): Promise<any[]> {
  const { data, error } = await client
    .from("bookings")
    .select("*, rooms:room_id(*, kos:kos_id(*))")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getActiveBookings(
  client: any,
  userId: string,
  limit = 2
): Promise<any[]> {
  const { data, error } = await client
    .from("bookings")
    .select("*, rooms:room_id(*, kos:kos_id(*))")
    .eq("student_id", userId)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getBookingCount(
  client: any,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("student_id", userId)
    .in("status", ["pending", "approved"]);
  if (error) throw error;
  return count ?? 0;
}

export async function createBooking(
  client: any,
  values: {
    student_id: string;
    room_id: string;
    notes?: string | null;
    move_in_date?: string | null;
  }
): Promise<Booking> {
  const { data, error } = await client
    .from("bookings")
    .insert({
      student_id: values.student_id,
      room_id: values.room_id,
      notes: values.notes ?? null,
      move_in_date: values.move_in_date ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getKosBookings(
  client: any,
  kosId: string
): Promise<any[]> {
  const { data, error } = await client
    .from("bookings")
    .select("*, rooms:room_id(*, kos:kos_id(*))")
    .eq("rooms.kos_id", kosId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateBookingStatus(
  client: any,
  id: string,
  status: "approved" | "cancelled" | "completed"
): Promise<Booking | null> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid. Silakan login ulang.");

  // Verifikasi eksplisit: user adalah owner kos dari booking ini ATAU admin
  // (admin bypass via RLS; non-owner dapat pesan jelas, bukan 400 diam-diam)
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: booking } = await client
    .from("bookings")
    .select("id, room_id")
    .eq("id", id)
    .single();
  if (!booking) throw new Error("Booking tidak ditemukan.");

  const { data: room } = await client
    .from("rooms")
    .select("kos_id")
    .eq("id", booking.room_id)
    .single();
  if (!room) throw new Error("Kamar tidak ditemukan.");

  const { data: kos } = await client
    .from("kos")
    .select("owner_id")
    .eq("id", room.kos_id)
    .single();
  if (!kos || (kos.owner_id !== user.id && !isAdmin)) {
    throw new Error("Anda tidak memiliki izin untuk mengubah status booking ini.");
  }

  const { data, error } = await client
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFeaturedKos(
  client: any,
  limit = 3
): Promise<Kos[]> {
  const { data, error } = await client
    .from("kos")
    .select("*, kos_facilities(facility_id, facility:facility_id(name))")
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapKosRow);
}

export async function getTotalKosCount(client: any): Promise<number> {
  const { count, error } = await client
    .from("kos")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "verified")
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

export async function getOwnerBookings(
  client: any,
  ownerId: string,
  options: { status?: string; search?: string; limit?: number; offset?: number }
): Promise<any[]> {
  // Get all kos IDs owned by this owner
  const { data: kosList } = await client
    .from("kos")
    .select("id")
    .eq("owner_id", ownerId);
  if (!kosList || kosList.length === 0) return [];

  const kosIds = kosList.map((k: any) => k.id);

  // Get room IDs for those kos
  const { data: rooms } = await client
    .from("rooms")
    .select("id")
    .in("kos_id", kosIds);
  if (!rooms || rooms.length === 0) return [];

  const roomIds = rooms.map((r: any) => r.id);

  // Get bookings for those rooms
  let query = client
    .from("bookings")
    .select("*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name))")
    .in("room_id", roomIds)
    .order("created_at", { ascending: false });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.limit) {
    query = query.range(options.offset || 0, (options.offset || 0) + options.limit - 1);
  }

  const { data: bookings, error } = await query;
  if (error) throw error;
  if (!bookings || bookings.length === 0) return [];

  // Fetch student profiles separately
  const studentIds = [...new Set(bookings.map((b: any) => b.student_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, school_name")
    .in("id", studentIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  return bookings.map((b: any) => ({ ...b, student: profileMap[b.student_id] ?? null }));
}

export async function getOwnerStats(
  client: any,
  ownerId: string
): Promise<{ pending: number; approvedThisMonth: number }> {
  const { data: kosList } = await client
    .from("kos")
    .select("id")
    .eq("owner_id", ownerId);
  if (!kosList || kosList.length === 0) return { pending: 0, approvedThisMonth: 0 };

  const kosIds = kosList.map((k: any) => k.id);

  const { data: rooms } = await client
    .from("rooms")
    .select("id")
    .in("kos_id", kosIds);
  if (!rooms || rooms.length === 0) return { pending: 0, approvedThisMonth: 0 };

  const roomIds = rooms.map((r: any) => r.id);

  const { count: pending } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .in("room_id", roomIds)
    .eq("status", "pending");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: approvedThisMonth } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .in("room_id", roomIds)
    .eq("status", "approved")
    .gte("updated_at", startOfMonth.toISOString());

  return { pending: pending || 0, approvedThisMonth: approvedThisMonth || 0 };
}

export async function getAvailableRoomsCount(
  client: any,
  ownerId: string
): Promise<number> {
  const { count, error } = await client
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("kos.owner_id", ownerId)
    .eq("status", "tersedia");
  if (error) {
    // Fallback: 2-step query if filter fails
    const { data: kosList } = await client
      .from("kos")
      .select("id")
      .eq("owner_id", ownerId);
    if (!kosList || kosList.length === 0) return 0;
    const kosIds = kosList.map((k: any) => k.id);
    const { count: c } = await client
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .in("kos_id", kosIds)
      .eq("status", "tersedia");
    return c || 0;
  }
  return count || 0;
}

export async function getTotalOwnerBookings(
  client: any,
  ownerId: string,
  options: { status?: string; search?: string }
): Promise<number> {
  const { data: kosList } = await client
    .from("kos")
    .select("id")
    .eq("owner_id", ownerId);
  if (!kosList || kosList.length === 0) return 0;

  const kosIds = kosList.map((k: any) => k.id);

  const { data: rooms } = await client
    .from("rooms")
    .select("id")
    .in("kos_id", kosIds);
  if (!rooms || rooms.length === 0) return 0;

  const roomIds = rooms.map((r: any) => r.id);

  let query = client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .in("room_id", roomIds);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getAllBookings(
  client: any,
  options: { limit?: number; offset?: number }
): Promise<any[]> {
  const { data: bookings, error } = await client
    .from("bookings")
    .select("*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name)), student:student_id(id, full_name, avatar_url, school_name)")
    .order("created_at", { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 10) - 1);
  if (error) throw error;
  return bookings ?? [];
}

export async function getTotalAllBookings(client: any): Promise<number> {
  const { count, error } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

export async function getAdminBookingStats(client: any): Promise<{ pending: number; approvedThisMonth: number; availableRooms: number }> {
  const { count: pending } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: approvedThisMonth } = await client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .gte("updated_at", startOfMonth.toISOString());

  const { count: availableRooms } = await client
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("status", "tersedia");

  return {
    pending: pending || 0,
    approvedThisMonth: approvedThisMonth || 0,
    availableRooms: availableRooms || 0,
  };
}

// ─── Notifications ────────────────────────────────────────

export async function getNotifications(
  client: any,
  userId: string,
  limit = 20
): Promise<any[]> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadNotificationCount(
  client: any,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  client: any,
  notificationId: string
): Promise<void> {
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(
  client: any,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

// ─── Payments (Manual Transfer MVP) ──────────────────────

export async function getBankAccounts(
  client: any,
  kosId: string
): Promise<any[]> {
  const { data, error } = await client
    .from("bank_accounts")
    .select("*")
    .eq("kos_id", kosId);
  if (error) throw error;
  return data ?? [];
}

export async function submitPaymentProof(
  client: any,
  bookingId: string,
  proofPath: string,
  note?: string | null
): Promise<void> {
  const { error } = await client
    .from("bookings")
    .update({
      payment_status: "menunggu_konfirmasi",
      payment_proof_path: proofPath,
      payment_note: note ?? null,
    })
    .eq("id", bookingId);
  if (error) throw error;
}

export async function getSignedProofUrl(
  client: any,
  proofPath: string | null,
  expiresIn = 3600
): Promise<string | null> {
  if (!proofPath) return null;
  const { data, error } = await client.storage
    .from("bukti-transfer")
    .createSignedUrl(proofPath, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function confirmPayment(
  client: any,
  bookingId: string
): Promise<void> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid. Silakan login ulang.");

  // Verifikasi eksplisit: user adalah owner kos dari booking ini ATAU admin
  // (bukan hanya andalkan RLS — cegah PATCH diam-diam 400 saat sesi berubah)
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: booking } = await client
    .from("bookings")
    .select("id, room_id")
    .eq("id", bookingId)
    .single();
  if (!booking) throw new Error("Booking tidak ditemukan.");

  const { data: room } = await client
    .from("rooms")
    .select("kos_id")
    .eq("id", booking.room_id)
    .single();
  if (!room) throw new Error("Kamar tidak ditemukan.");

  const { data: kos } = await client
    .from("kos")
    .select("owner_id")
    .eq("id", room.kos_id)
    .single();
  if (!kos || (kos.owner_id !== user.id && !isAdmin)) {
    throw new Error("Anda tidak memiliki izin untuk mengonfirmasi pembayaran booking ini.");
  }

  const { error } = await client
    .from("bookings")
    .update({
      payment_status: "lunas",
      paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) throw error;
}
