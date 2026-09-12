import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Pagination kontrol — pagination URL-based (`?page=1&limit=30`).
 * Dipakai page yang render query-param dari `useSearchParams`,
 * conthoh: app/admin/users. Styling pakai design token existing.
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  basePath: string; // ex: "/admin/users"
}

const PAGE_LINK_CLS =
  "inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition";
const PAGE_DISABLED_CLS =
  "inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-lg border border-outline-variant text-outline opacity-50 cursor-not-allowed";
const NUM_ACTIVE_CLS =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold bg-primary text-on-primary transition";
const NUM_INACTIVE_CLS =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition";

/** Pagina nomor + ellipsis (...)— max ~7 tombol, gap jadi "…". */
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set: number[] = [1, current - 1, current, current + 1, total]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .filter((n, i, arr) => i === 0 || n !== arr[i - 1]);

  const out: (number | "…")[] = [];
  set.forEach((n, i) => {
    if (i > 0 && n !== set[i - 1] + 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  basePath,
}: PaginationProps) {
  const searchParams = useSearchParams();

  /** URL halaman target — preserve query param lain (mis. q=), hapus limit. */
  function href(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("limit");
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  }

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav aria-label="Navigasi paginasi" className="flex flex-col items-center gap-3">
      <p className="text-body-sm text-on-surface-variant">
        Menampilkan {startIdx}–{endIdx} dari {totalItems} user
      </p>

      <div className="flex items-center gap-1.5">
        {/* Pertama */}
        {currentPage > 1 ? (
          <Link href={href(1)} aria-label="Halaman pertama" className={PAGE_LINK_CLS}>
            « Pertama
          </Link>
        ) : (
          <span className={PAGE_DISABLED_CLS} aria-label="Halaman pertama">« Pertama</span>
        )}

        {/* Prev */}
        {currentPage > 1 ? (
          <Link href={href(currentPage - 1)} aria-label="Halaman sebelumnya" className={PAGE_LINK_CLS}>
            ‹ Prev
          </Link>
        ) : (
          <span className={PAGE_DISABLED_CLS} aria-label="Halaman sebelumnya">‹ Prev</span>
        )}

        {/* Nomor halaman (ja ellipsis) */}
        {pageItems(currentPage, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-outline">…</span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              aria-label={`Halaman ${p}`}
              className={p === currentPage ? NUM_ACTIVE_CLS : NUM_INACTIVE_CLS}
            >
              {p}
            </Link>
          )
        )}

        {/* Next */}
        {currentPage < totalPages ? (
          <Link href={href(currentPage + 1)} aria-label="Halaman selanjutnya" className={PAGE_LINK_CLS}>
            Next ›
          </Link>
        ) : (
          <span className={PAGE_DISABLED_CLS} aria-label="Halaman selanjutnya">Next ›</span>
        )}

        {/* Terakhir */}
        {currentPage < totalPages ? (
          <Link href={href(totalPages)} aria-label="Halaman terakhir" className={PAGE_LINK_CLS}>
            Terakhir »
          </Link>
        ) : (
          <span className={PAGE_DISABLED_CLS} aria-label="Halaman terakhir">Terakhir »</span>
        )}
      </div>
    </nav>
  );
}