import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";

const SECTIONS = [
  {
    title: "1. Definisi Platform",
    body: "NestU adalah platform digital yang mempertemukan pemilik kos (\"Pemilik\") dengan pelajar yang mencari hunian (\"Pengguna\"). NestU menyediakan sarana pencarian, pengajuan booking, dan pembayaran sewa. NestU bukan pihak dalam kontrak sewa antara Pemilik dan Pengguna, melainkan fasilitator transaksi.",
  },
  {
    title: "2. Akun Pengguna",
    body: "Pengguna wajib mendaftar dengan data yang benar dan lengkap. Satu akun digunakan oleh satu orang; pemindahan atau peminjaman akun kepada pihak lain dilarang. Pengguna bertanggung jawab penuh atas seluruh aktivitas yang terjadi pada akunnya dan wajib menjaga kerahasiaan kata sandi.",
  },
  {
    title: "3. Kewajiban Pemilik Kos",
    body: "Pemilik wajib memberikan informasi hunian yang akurat (harga, fasilitas, foto, dan ketersediaan kamar) serta memperbaruinya bila ada perubahan. Pemilik wajib menyetujui atau menolak permintaan booking dalam waktu yang wajar, dan memproses pembayaran sesuai kesepakatan. Pemilik yang terbukti memberikan informasi palsu dapat dikenakan sanksi hingga penghapusan dari platform.",
  },
  {
    title: "4. Kewajiban Pengguna (Pelajar)",
    body: "Pengguna wajib mengisi data booking dengan benar, menghormati proses persetujuan Pemilik, dan melakukan pembayaran sesuai ketentuan yang berlaku. Pembatalan sepihak tanpa pemberitahuan dapat mempengaruhi reputasi akun Pengguna di platform.",
  },
  {
    title: "5. Kebijakan Pembatalan Booking",
    body: "Booking yang belum disetujui Pemilik dapat dibatalkan oleh Pengguna kapan saja tanpa sanksi. Setelah disetujui, pembatalan diatur sebagai berikut: pembatalan sebelum pembayaran tidak dikenakan biaya; pembatalan setelah pembayaran mengikuti kesepakatan antara Pengguna dan Pemilik, dengan ketentuan umum pengembalian dana (refund) diproses sesuai kebijakan yang tercantum pada halaman pembayaran.",
  },
  {
    title: "6. Kebijakan Pembayaran",
    body: "Pembayaran sewa dapat dilakukan melalui metode yang tersedia di platform (transfer bank, e-wallet, atau virtual account). Pembayaran dianggap sah setelah status konfirmasi diterima. NestU tidak meneruskan dana kepada Pemilik sebelum proses check-in sesuai ketentuan. Biaya layanan (jika ada) akan diinformasikan secara transparan sebelum pembayaran dilakukan.",
  },
  {
    title: "7. Batasan Tanggung Jawab",
    body: "NestU menyediakan platform sebagaimana adanya (as is) dan tidak bertanggung jawab atas sengketa langsung antara Pengguna dan Pemilik, termasuk namun tidak terbatas pada kualitas hunian, kerusakan barang, atau perbedaan deskripsi. NestU berhak menarik layanan jika terdeteksi penyalahgunaan platform, penipuan, atau pelanggaran ketentuan ini.",
  },
  {
    title: "8. Perubahan Ketentuan",
    body: "NestU dapat memperbarui ketentuan ini sewaktu-waktu. Perubahan akan diumumkan melalui platform. Penggunaan platform setelah perubahan berlaku dianggap sebagai penerimaan atas ketentuan yang baru.",
  },
];

export default function TermsPage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo variant="full" className="h-12 w-auto text-primary" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/kos" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Cari Kos
              </Link>
              <Link href="/about" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Tentang Kami
              </Link>
              <Link href="/contact" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Bantuan
              </Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-primary rounded-full hover:bg-primary/10 transition-all duration-200">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200">
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-16">
        <div className="max-w-3xl mx-auto px-4 md:px-10 py-12 md:py-16">
          <p className="text-label-md font-bold text-primary uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="font-headline-lg text-headline-lg md:text-4xl font-bold text-on-surface mb-3">
            Syarat &amp; Ketentuan
          </h1>
          <p className="text-body-sm text-on-surface-variant mb-10">
            Terakhir diperbarui: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
          </p>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <div
                key={s.title}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 md:p-8"
              >
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface mb-3">
                  {s.title}
                </h2>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/contact"
              className="text-body-sm font-semibold text-primary hover:underline"
            >
              Ada pertanyaan tentang ketentuan ini? Hubungi kami â†’
            </Link>
          </div>
        </div>
      </section>
          <Footer />
    </>
  );
}
