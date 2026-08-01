export interface Facility {
  id: string;
  name: string;
  icon: string | null;
}

export interface Kos {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  whatsapp_number: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  fasilitas: { id: string; name: string; icon: string | null }[]; // loaded via kos_facilities → facilities join
  foto: string[];
  distance_to_school_km: number | null;
  verification_status: "verified" | "pending" | "rejected";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  kos_id: string;
  room_number: string;
  price_per_month: number;
  size_sqm: number | null;
  kapasitas: number;
  terisi: number;
  description: string | null;
  status: "tersedia" | "terisi" | "dipesan";
  created_at: string;
  updated_at: string;
}

export type RoomStatus = Room["status"];

export interface Booking {
  id: string;
  student_id: string;
  room_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  notes: string | null;
  move_in_date: string | null;
  duration_months: number | null;
  total_amount: number | null;
  base_monthly_price: number | null;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  payment_status: "belum_bayar" | "menunggu_konfirmasi" | "lunas" | "expired";
  payment_method: "midtrans" | "manual";
  payment_proof_path: string | null;
  payment_note: string | null;
  paid_at: string | null;
  midtrans_order_id: string | null;
  midtrans_transaction_id: string | null;
  midtrans_status: string | null;
  payment_expired_at: string | null;
}
