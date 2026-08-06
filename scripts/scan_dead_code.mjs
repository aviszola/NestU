// Scan import references utk semua file di app/components/lib
import fs from "fs";
import path from "path";

const ROOT = "c:\\SLE";
const SKIP = new Set(["node_modules", ".next", ".git", "scratch", "scripts", "migrations", "public"]);

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!SKIP.has(ent.name)) out.push(...walk(p)); }
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function scan(rootDir) {
  const files = walk(rootDir);
  const contents = new Map(files.map(f => [f, fs.readFileSync(f, "utf8")]));
  const name = f => path.basename(f).replace(/\.(tsx|ts)$/, "");

  for (const f of files) {
    const n = name(f);
    let refs = 0, where = [];
    for (const [other, c] of contents) {
      if (other === f || /page\.tsx$/.test(other)) continue; // routes self-stand
      // match import dari "./x", "../x", "@/x", "components/x", atau nama path penuh
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`["'][^"']*(${escaped})["']`);
      if (re.test(c)) { refs++; where.push(path.relative(ROOT, other).split("\\").join("/")); }
    }
    const rel = path.relative(ROOT, f).split("\\").join("/");
    if (!path.basename(f).startsWith("page.") && !path.basename(f).startsWith("layout.")) {
      // komponen/lib non-route
      if (refs === 0) console.log("  UNREF:", rel);
    }
  }
}

console.log("=== UNREFERENCED (non-layer) components/lib ===");
const all = walk(ROOT);
const content = new Map(all.map(f => [f, fs.readFileSync(f, "utf8")]));
const name = f => path.basename(f).replace(/\.(tsx|ts)$/, "");

for (const f of all) {
  const n = name(f);
  const isPage = /page\.tsx$/.test(f) || /layout\.tsx$/.test(f) || /route\.ts$/.test(f);
  if (isPage) continue;
  let refs = 0;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`["'\`][^"'\`]*${esc}["'\`]`);
  for (const [other, c] of content) {
    if (other !== f && re.test(c)) { refs++; }
  }
  const rel = path.relative(ROOT, f).split("\\").join("/");
  if (refs === 0 && !/\.html$/.test(f)) console.log("  UNREF:", rel);
}
