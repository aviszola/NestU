// Fix edit page facility chip: show Material icon instead of raw emoji
const fs = require("node:fs");

const p = "app/owner/kos/[id]/edit/page.tsx";
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const before = "{f.icon ?? \"\"} {f.name}";
if (!s.includes(before)) { console.error("marker not found"); process.exit(1); }
const after = '<span className="material-symbols-outlined text-sm">{facilityIcon(f)}</span> {f.name}';
s = s.replace(before, after);

if (!s.includes('import { facilityIcon } from "@/components/KosCard";')) {
  s = s.replace(
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useRef, useState } from "react";\nimport { facilityIcon } from "@/components/KosCard";'
  );
}
fs.writeFileSync(p, s);
console.log("patched edit page");
