import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
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
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
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
