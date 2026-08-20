import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NestU",
  description:
    "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
  openGraph: {
    title: "NestU",
    description:
      "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
    type: "website",
    locale: "id_ID",
    siteName: "NestU",
  },
  twitter: {
    card: "summary_large_image",
    title: "NestU",
    description:
      "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
  },
  icons: {
    icon: "/images/logo-full.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#00236F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}<Toaster position="top-right" richColors={false} /></body>
    </html>
  );
}
