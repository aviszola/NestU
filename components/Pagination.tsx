import Link from "next/link";

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {currentPage > 1 && (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </Link>
      )}

      {pages.map((p, i) => {
        const showEllipsis = i > 0 && p !== pages[i - 1] + 1;
        return (
          <span key={p} className="flex items-center">
            {showEllipsis && (
              <span className="px-1 text-gray-400">...</span>
            )}
            <Link
              href={`${basePath}?page=${p}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                p === currentPage
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {p}
            </Link>
          </span>
        );
      })}

      {currentPage < totalPages && (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </Link>
      )}
    </div>
  );
}
