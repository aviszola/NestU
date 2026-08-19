// Surgical patch CJS: replace local FACILITY_ICONS + getIcon blocks with shared import
const fs = require("node:fs");

function patch(path, startMarker, endMarker, replacement) {
  let s = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const start = s.indexOf(startMarker);
  if (start === -1) {
    console.error("START MARKER NOT FOUND in", path);
    process.exit(1);
  }
  const end = s.indexOf(endMarker, start);
  if (end === -1) {
    console.error("END MARKER NOT FOUND in", path);
    process.exit(1);
  }
  const endPos = end + endMarker.length;
  s = s.slice(0, start) + replacement + s.slice(endPos);
  fs.writeFileSync(path, s);
  console.log("patched", path);
}

// app/kos/[id]/page.tsx
patch(
  "app/kos/[id]/page.tsx",
  "const FACILITY_ICONS",
  'function getIcon(name: string) {\n  return FACILITY_ICONS[name.toLowerCase()] ?? "check";\n}',
  'import { facilityIcon } from "@/components/KosCard";'
);

{
  const p = "app/kos/[id]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("{getIcon(f.name)}", "{facilityIcon(f)}");
  fs.writeFileSync(p, s);
  console.log("usage patched", p);
}

// app/booking/[kosId]/page.tsx
patch(
  "app/booking/[kosId]/page.tsx",
  "const FACILITY_ICONS",
  'function getIcon(name: string, dbIcon?: string | null) {\n  if (dbIcon) return dbIcon;\n  return FACILITY_ICONS[name.toLowerCase()] ?? "check";\n}',
  'import { facilityIcon } from "@/components/KosCard";'
);

{
  const p = "app/booking/[kosId]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("{getIcon(f.name, f.icon)}", "{facilityIcon(f)}");
  fs.writeFileSync(p, s);
  console.log("usage patched", p);
}

console.log("done");
