// Patch remaining facility icon render sites to use shared facilityIcon helper
const fs = require("node:fs");

// app/owner/kos/new/page.tsx — replace {f.icon && FACILITY_ICONS[f.icon] ? FACILITY_ICONS[f.icon] : f.icon || "check"}
{
  const p = "app/owner/kos/new/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  const before = '{f.icon && FACILITY_ICONS[f.icon] ? FACILITY_ICONS[f.icon] : f.icon || "check"}';
  if (!s.includes(before)) { console.error("owner/new marker not found"); process.exit(1); }
  s = s.replace(before, "{facilityIcon(f)}");
  // add import
  if (!s.includes('import { facilityIcon } from "@/components/KosCard";')) {
    s = s.replace(
      'import MapPicker from "@/components/MapPicker";',
      'import MapPicker from "@/components/MapPicker";\nimport { facilityIcon } from "@/components/KosCard";'
    );
  }
  fs.writeFileSync(p, s);
  console.log("patched owner/kos/new");
}

// components/kos/FilterSidebar.tsx — replace {fac.icon || "check"}
{
  const p = "components/kos/FilterSidebar.tsx";
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes('{fac.icon || "check"}')) { console.error("filtersidebar marker not found"); process.exit(1); }
  s = s.replace('{fac.icon || "check"}', "{facilityIcon(fac)}");
  if (!s.includes('import { facilityIcon } from "@/components/KosCard";')) {
    s = s.replace(
      'import { createClient } from "@/lib/supabase/client";',
      'import { createClient } from "@/lib/supabase/client";\nimport { facilityIcon } from "@/components/KosCard";'
    );
  }
  fs.writeFileSync(p, s);
  console.log("patched FilterSidebar");
}

// app/owner/kos/[id]/page.tsx — replace <span className="material-symbols-outlined">{f.icon}</span>
{
  const p = "app/owner/kos/[id]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  const before = '<span className="material-symbols-outlined">{f.icon}</span>';
  if (!s.includes(before)) { console.error("owner/[id] marker not found"); process.exit(1); }
  s = s.replace(before, '<span className="material-symbols-outlined">{facilityIcon(f)}</span>');
  if (!s.includes('import { facilityIcon } from "@/components/KosCard";')) {
    // import at top after existing imports — use last import line
    const lines = s.split("\n");
    let lastImport = -1;
    lines.forEach((l, i) => { if (l.startsWith("import ")) lastImport = i; });
    lines.splice(lastImport + 1, 0, 'import { facilityIcon } from "@/components/KosCard";');
    s = lines.join("\n");
  }
  fs.writeFileSync(p, s);
  console.log("patched owner/[id]");
}

console.log("done");
