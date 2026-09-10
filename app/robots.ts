import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt — Next.js App Router (app/robots.ts).
 * Izinkan crawl halaman publik, blokir halaman yang butuh login
 * atau tidak relevan untuk indeks mesin pencari.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/kos",
          "/kos/",
          "/about",
          "/developer",
          "/contact",
          "/terms",
          "/privacy",
          "/partner",
        ],
        disallow: [
          "/dashboard",
          "/bookings",
          "/booking/",
          "/favorites",
          "/profile",
          "/rental",
          "/rental/",
          "/settings",
          "/owner/",
          "/admin/",
          "/login",
          "/register",
          "/forgot-password",
          "/logout",
          "/auth/",
          "/api/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
