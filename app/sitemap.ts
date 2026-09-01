import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap dinamis — Next.js App Router (app/sitemap.ts).
 * Dipanggil saat build / revalidasi. Menghasilkan /sitemap.xml otomatis.
 *
 * Hanya include kos yang:
 *   - verification_status = 'verified'
 *   - is_test = false (atau null)
 * Tidak include halaman yang butuh login atau tidak relevan untuk crawl publik.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Ambil semua kos yang terverifikasi dan bukan data test
  const { data: kosList } = await supabase
    .from("kos")
    .select("id, updated_at")
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .eq("is_test", false)
    .order("updated_at", { ascending: false })
    .limit(5000); // batas praktis; sitemap Google max 50.000 URL

  const kosEntries: MetadataRoute.Sitemap = (kosList ?? []).map((kos) => ({
    url: `${SITE_URL}/kos/${kos.id}`,
    lastModified: kos.updated_at ? new Date(kos.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/kos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return [...staticPages, ...kosEntries];
}
