"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function approveKos(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const kosId = formData.get("kosId") as string;
  if (!kosId) return { error: "Missing kosId" };

  const { error } = await supabase
    .from("kos")
    .update({
      verification_status: "verified",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", kosId);
  if (error) return { error: error.message };

  revalidatePath("/admin/kos");
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectKos(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const kosId = formData.get("kosId") as string;
  if (!kosId) return { error: "Missing kosId" };

  const { error } = await supabase
    .from("kos")
    .update({ verification_status: "rejected" })
    .eq("id", kosId);
  if (error) return { error: error.message };

  revalidatePath("/admin/kos");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleFavorite(
  kosId: string
): Promise<{ favorited: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { favorited: false, error: "Login diperlukan" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("student_id")
    .eq("student_id", user.id)
    .eq("kos_id", kosId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("student_id", user.id)
      .eq("kos_id", kosId);
    if (error) return { favorited: true, error: error.message };
    revalidatePath("/favorites");
    revalidatePath("/kos");
    revalidatePath("/dashboard");
    return { favorited: false };
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ student_id: user.id, kos_id: kosId });
    if (error) return { favorited: false, error: error.message };
    revalidatePath("/favorites");
    revalidatePath("/kos");
    revalidatePath("/dashboard");
    return { favorited: true };
  }
}

export async function updateProfile(opts: {
  fullName: string;
  phone: string;
  avatarUrl?: string;
  schoolName?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const updates: Record<string, any> = {
    full_name: opts.fullName,
    phone: opts.phone,
  };
  if (opts.avatarUrl !== undefined) updates.avatar_url = opts.avatarUrl;
  if (opts.schoolName !== undefined) updates.school_name = opts.schoolName;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function changePassword(opts: {
  oldPassword: string;
  newPassword: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!user.email) return { error: "Email tidak ditemukan" };

  if (opts.newPassword.length < 6)
    return { error: "Password baru minimal 6 karakter" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: opts.oldPassword,
  });
  if (signInError) return { error: "Password lama salah" };

  const { error: updateError } = await supabase.auth.updateUser({
    password: opts.newPassword,
  });
  if (updateError) return { error: updateError.message };

  return { success: true };
}

export async function submitBooking(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("[submitBooking] Unauthorized: User not logged in");
      return { 
        success: false, 
        error: "Silakan login terlebih dahulu",
        code: "UNAUTHORIZED"
      };
    }

    const kosId = formData.get("kosId") as string;
    const roomId = formData.get("roomId") as string;
    const startDate = formData.get("start_date") as string;
    const duration = parseInt(formData.get("duration") as string);
    const notes = formData.get("notes") as string;

    if (!kosId || !roomId || !startDate || !duration) {
      console.error("[submitBooking] Missing required fields:", { kosId: !!kosId, roomId: !!roomId, startDate: !!startDate, duration: !!duration });
      return { 
        success: false, 
        error: "Data tidak lengkap. Harap isi semua field yang wajib.",
        code: "MISSING_DATA"
      };
    }

    // Get room price
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("price_per_month")
      .eq("id", roomId)
      .single();
      
    if (roomError) {
      console.error("[submitBooking] Room fetch error:", { code: roomError.code, message: roomError.message });
      return { 
        success: false, 
        error: `Room tidak ditemukan: ${roomError.message}`,
        code: roomError.code,
        details: roomError.details
      };
    }
    
    if (!room) {
      console.error("[submitBooking] Room not found for ID:", roomId);
      return { 
        success: false, 
        error: "Room tidak ditemukan",
        code: "ROOM_NOT_FOUND"
      };
    }
    
    // Calculate total price - LINEAR: harga bulanan × jumlah bulan
    const basePrice = room.price_per_month || 0;
    const monthlyTotal = basePrice * duration;
    
    // Add fees
    const serviceFee = 25000;
    const adminFee = 5000;
    const finalTotal = monthlyTotal + serviceFee + adminFee;

    // Data untuk insert
    const insertData = {
      student_id: user.id,
      room_id: roomId,
      move_in_date: startDate,
      duration_months: duration,
      total_amount: finalTotal,
      base_monthly_price: basePrice,
      notes: notes || null,
      status: "pending",
    };
    
    // TRY 1: Insert dengan semua kolom (termasuk yang baru)
    const { data, error } = await supabase
      .from("bookings")
      .insert(insertData)
      .select();

    if (error) {
      console.error("[submitBooking] Insert error:", { code: error.code, message: error.message, hint: error.hint });
      
      // TRY 2: Jika error karena kolom tidak ada, coba insert tanpa kolom baru
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('kolom')) {
        console.warn("[submitBooking] Columns missing, trying backup insert without new columns");
        
        const backupInsertData = {
          student_id: user.id,
          room_id: roomId,
          move_in_date: startDate,
          notes: notes || null,
          status: "pending",
        };
        
        const { data: backupData, error: backupError } = await supabase
          .from("bookings")
          .insert(backupInsertData)
          .select();
          
        if (backupError) {
          console.error("[submitBooking] Backup insert failed:", { code: backupError.code, message: backupError.message });
          return { 
            success: false, 
            error: `Gagal menyimpan booking: ${backupError.message}`,
            code: backupError.code,
            details: backupError.details,
            hint: backupError.hint
          };
        }
        
        revalidatePath("/dashboard");
        revalidatePath("/bookings");
        return { 
          success: true, 
          data: backupData, 
          usedBackup: true,
          message: "Booking berhasil disimpan (mode backup - beberapa data tidak tersimpan). Anda akan dialihkan ke halaman bookings."
        };
      }
      
      // Jika bukan error kolom, return error asli
      return { 
        success: false, 
        error: `Gagal menyimpan booking: ${error.message}`,
        code: error.code,
        details: error.details,
        hint: error.hint
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/bookings");
    return { 
      success: true, 
      data,
      message: "Booking berhasil diajukan! Anda akan dialihkan ke halaman bookings."
    };
    
  } catch (error: any) {
    console.error("[submitBooking] Unexpected error:", { message: error?.message, stack: error?.stack });
    return { 
      success: false, 
      error: `Terjadi kesalahan tidak terduga: ${error?.message || 'Unknown error'}`,
      code: "UNEXPECTED_ERROR"
    };
  }
}

// ─── Booking status ────────────────────────────────────────────
// Verifikasi eksplisit: user adalah owner kos dari booking ini ATAU admin.
// Cegah error RLS mentah (HTTP 400) saat sesi lama/role berubah —
// beri pesan jelas sebelum PATCH. Pola sama seperti updateBookingStatus di queries.ts.
async function assertCanManageBooking(supabase: Awaited<ReturnType<typeof createClient>>, bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid. Silakan login ulang.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, room_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new Error("Booking tidak ditemukan.");

  const { data: room } = await supabase
    .from("rooms")
    .select("kos_id")
    .eq("id", booking.room_id)
    .maybeSingle();
  if (!room) throw new Error("Kamar tidak ditemukan.");

  const { data: kos } = await supabase
    .from("kos")
    .select("owner_id")
    .eq("id", room.kos_id)
    .maybeSingle();
  if (!kos || (kos.owner_id !== user.id && !isAdmin)) {
    throw new Error("Anda tidak memiliki izin untuk mengubah booking ini.");
  }

  return { supabase, booking, user };
}

export async function approveBooking(bookingId: string) {
  const supabase = await createClient();
  const { booking } = await assertCanManageBooking(supabase, bookingId);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (error) throw error;

  revalidatePath("/owner");
  revalidatePath("/owner/bookings");
}

export async function rejectBooking(bookingId: string) {
  const supabase = await createClient();
  const { booking } = await assertCanManageBooking(supabase, bookingId);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (error) throw error;

  revalidatePath("/owner");
  revalidatePath("/owner/bookings");
}
