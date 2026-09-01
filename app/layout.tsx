import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { SITE_NAME, SITE_URL, OG_DEFAULT_IMAGE } from "@/lib/seo";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const materialSymbols = localFont({
  src: "../public/fonts/material-symbols-outlined.ttf",
  variable: "--font-material-symbols",
  display: "block",
  weight: "100 700",
  style: "normal",
});

export const metadata: Metadata = {
  // Template: halaman spesifik akan override title, fallback ke "NestU"
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} — Temukan Kos Impianmu`,
    description:
      "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [{ url: OG_DEFAULT_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — Temukan Kos Impianmu` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Temukan Kos Impianmu`,
    description:
      "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
    images: [OG_DEFAULT_IMAGE],
  },
  icons: {
    icon: "/images/logo-full.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#00236F",
};

import { Suspense } from "react";
import RouteProgressBar from "@/components/RouteProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${materialSymbols.variable} h-full antialiased`}
    >
      <head>
        {/* Fallback CDN Google Fonts Material Symbols — redundansi ganda jika font lokal tertunda */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors={false} />
      </body>
    </html>
  );
}
