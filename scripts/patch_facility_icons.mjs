// Surgical patch: replace local FACILITY_ICONS + getIcon blocks with shared import from KosCard
const fs = require("fs");

function patch(path, startMarker, endMarker, replacement) {
  let s = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const start = s.indexOf(startMarker);
  const end = s.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    console.error("MARKER NOT FOUND in", path, { start, end });
    process.exit(1);
  }
  const endPos = end + endMarker.length;
  s = s.slice(0, start) + replacement + s.slice(endPos);
  fs.writeFileSync(path, s);
  console.log("patched", path);
}

// app/kos/[id]/page.tsx — replace const FACILITY_ICONS block + function getIcon
patch(
  "app/kos/[id]/page.tsx",
  "const FACILITY_ICONS",
  "function getIcon(name: string) {\n  return FACILITY_ICONS[name.toLowerCase()] ?? \"check\";\n}",
  'import { facilityIcon } from "@/components/KosCard";'
);

// replace usage getIcon(f.name) -> facilityIcon(f)
{
  const p = "app/kos/[id]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("{getIcon(f.name)}", "{facilityIcon(f)}");
  fs.writeFileSync(p, s);
  console.log("usage patched", p);
}

// app/booking/[kosId]/page.tsx — replace const FACILITY_ICONS block + function getIcon
patch(
  "app/booking/[kosId]/page.tsx",
  "const FACILITY_ICONS",
  "function getIcon(name: string, dbIcon?: string | null) {\n  if (dbIcon) return dbIcon;\n  return FACILITY_ICONS[name.toLowerCase()] ?? \"check\";\n}",
  'import { facilityIcon } from "@/components/KosCard";'
);

// replace usage getIcon(f.name, f.icon) -> facilityIcon(f)
{
  const p = "app/booking/[kosId]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("{getIcon(f.name, f.icon)}", "{facilityIcon(f)}");
  fs.writeFileSync(p, s);
  console.log("usage patched", p);
}

console.log("done");
