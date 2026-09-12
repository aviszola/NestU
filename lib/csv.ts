// lib/csv.ts
// Helper export CSV — reusable, plain blob download tanpa dependency tambahan.
// Import-safe trước client component (funkci kalari hanya saat dipanggil).

export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(v: CsvCell): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote kalau mengandung komma, quote, atau newline (RFC 4180).
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize array rows → CSV string (CRLF). */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines: string[] = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Download CSV via Blob (browser-only).
 * Prefix BOM (\uFEFF) supaya Excel ambil UTF-8 segun onggan.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Nama file CSV — `transaksi-{YYYY-MM-DD}.csv`. */
export function transactionsCsvName(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `transaksi-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}