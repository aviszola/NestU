import Image from "next/image";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import ApproveRejectButtons from "@/components/ApproveRejectButtons";

export default function BookingTableRow({ booking }: { booking: any }) {
  const student = booking.student;
  const room = booking.rooms;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition">
      {/* Mahasiswa */}
      <div className="col-span-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {student?.avatar_url ? (
            <Image
              src={student.avatar_url}
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-gray-400 text-xl">
              person
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-on-surface truncate">
            {student?.full_name || "N/A"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {student?.school_name || "Universitas"} &bull;{" "}
            {student?.batch || "Angk."}
          </p>
        </div>
      </div>

      {/* Tipe Kamar */}
      <div className="col-span-3">
        <p className="font-medium text-sm text-on-surface">
          {room?.kos?.name || "N/A"}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {room?.room_number || "Kamar"} &bull; Rp
          {room?.price_per_month?.toLocaleString("id-ID") || "0"}
        </p>
      </div>

      {/* Tgl Masuk */}
      <div className="col-span-2 text-sm text-on-surface-variant pt-1">
        {formatDate(booking.move_in_date || booking.created_at)}
      </div>

      {/* Catatan */}
      <div className="col-span-2 text-sm text-gray-500 truncate pt-1">
        {booking.notes || "N/A"}
      </div>

      {/* Status / Aksi */}
      <div className="col-span-2 flex flex-col items-end gap-2 pt-1">
        {booking.status === "pending" ? (
          <ApproveRejectButtons bookingId={booking.id} />
        ) : (
          <StatusBadge status={booking.status} />
        )}
      </div>
    </div>
  );
}
