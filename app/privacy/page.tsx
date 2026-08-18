import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";

const SECTIONS = [
  {
    title: "1. Data yang Kami Kumpulkan",
    body: "Saat menggunakan NestU, kami mengumpulkan data berikut: (a) data akun — nama lengkap, email, nomor telepon, sekolah/kampus, dan kata sandi terenkripsi; (b) data profil — foto profil, preferensi pencarian; (c) data transaksi — riwayat booking, bukti transfer, status pembayaran, dan jumlah sewa; (d) data teknis — alamat IP, jenis perangkat, dan log aktivitas untuk keamanan layanan.",
  },
  {
    title: "2. Untuk Apa Data Dipakai",
    body: "Data kami gunakan untuk: (a) menyediakan dan mengoperasikan layanan — pencarian kos, pengajuan booking, dan proses pembayaran; (b) memverifikasi identitas pengguna dan mencegah penipuan; (c) menampilkan riwayat booking dan notifikasi transaksi; (d) meningkatkan kualitas layanan dan pengalaman pengguna; (e) memenuhi kewajiban hukum yang berlaku.",
  },
  {
    title: "3. Bagaimana Data Disimpan",
    body: "Data disimpan secara aman di infrastruktur cloud Supabase (PostgreSQL + Object Storage) yang berlokasi di pusat data terkelola dengan enkripsi saat transit (TLS) dan enkripsi at-rest. Bukti transfer disimpan di bucket penyimpanan privat yang hanya dapat diakses melalui tautan berwaktu (signed URL) oleh pihak yang berwenang — bukan dapat diakses publik. Kami menerapkan kontrol akses berbasis peran (RBAC) sehingga hanya pengguna yang berhak yang dapat melihat data tertentu.",
  },
  {
    title: "4. Berbagi Data",
    body: "Kami tidak menjual data pribadi pengguna kepada pihak mana pun. Data ditampilkan secara terbatas: nama dan sekolah pengguna terlihat oleh Pemilik kos saat pengajuan booking (untuk proses persetujuan); nama kos dan nomor WhatsApp Pemilik terlihat oleh Pengguna (untuk koordinasi hunian). Data pembayaran hanya diakses oleh sistem dan pihak pemroses pembayaran yang sah.",
  },
  {
    title: "5. Hak Pengguna",
    body: "Anda berhak: (a) mengakses data pribadi yang kami simpan; (b) memperbaiki data yang tidak akurat; (c) menghapus akun dan data terkait; (d) menarik persetujuan penggunaan data. Untuk permintaan penghapusan data, hubungi kami — permintaan akan diproses dalam waktu maksimal 14 hari kerja, kecuali ada kewajiban hukum untuk menyimpannya lebih lama (misalnya data transaksi untuk keperluan perpajakan).",
  },
  {
    title: "6. Keamanan",
    body: "Kata sandi disimpan dalam bentuk ter-hash (bukan teks biasa). Kami menggunakan kebijakan keamanan tingkat baris (Row Level Security) pada database untuk memastikan setiap pengguna hanya dapat mengakses datanya sendiri. Meski demikian, tidak ada sistem yang 100% aman — kami menyarankan pengguna untuk tidak berbagi kata sandi dan melaporkan aktivitas mencurigakan.",
  },
  {
    title: "7. Cookie & Penyimpanan Lokal",
    body: "Kami menggunakan cookie dan penyimpanan lokal untuk menjaga sesi login dan preferensi tampilan. Cookie tidak digunakan untuk pelacakan iklan pihak ketiga.",
  },
  {
    title: "8. Kontak Privasi",
    body: "Untuk pertanyaan, akses, atau permintaan penghapusan data, hubungi tim kami melalui email hello@netsu.id atau halaman Kontak. Kami merespons dalam 1–2 hari kerja.",
  },
];

export default function PrivacyPage() {
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
            Kebijakan Privasi
          </h1>
          <p className="text-body-sm text-on-surface-variant mb-10">
            Terakhir diperbarui: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
          </p>

          <div className="bg-primary-container/20 border border-primary/20 rounded-xl p-5 mb-10">
            <p className="text-body-sm text-on-surface leading-relaxed">
              <span className="font-bold">Ringkasan:</span> Kami mengumpulkan data
              yang diperlukan untuk menjalankan platform booking kos — akun,
              profil, dan bukti pembayaran. Data disimpan aman di Supabase, tidak
              dijual, dan bisa kamu minta hapus kapan saja.
            </p>
          </div>

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
              Ajukan permintaan privasi → halaman Kontak
            </Link>
          </div>
        </div>
      </section>
          <Footer />
    </>
  );
}
