// Add missing facilityIcon imports
const fs = require("node:fs");

const IMPORTS = [
  {
    path: "app/owner/kos/new/page.tsx",
    anchor: 'import OwnerShell from "@/components/layout/OwnerShell";',
    line: 'import { facilityIcon } from "@/components/KosCard";',
  },
  {
    path: "components/kos/FilterSidebar.tsx",
    anchor: 'import { useRouter } from "next/navigation";',
    line: 'import { facilityIcon } from "@/components/KosCard";',
  },
  {
    path: "app/owner/kos/[id]/page.tsx",
    anchor: 'import OwnerShell from "@/components/layout/OwnerShell";',
    line: 'import { facilityIcon } from "@/components/KosCard";',
  },
];

for (const { path, anchor, line } of IMPORTS) {
  let s = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  if (s.includes(line)) { console.log("already:", path); continue; }
  if (!s.includes(anchor)) {
    console.error("anchor missing in", path, "->", anchor);
    process.exit(1);
  }
  s = s.replace(anchor, anchor + "\n" + line);
  fs.writeFileSync(path, s);
  console.log("import added:", path);
}
console.log("done");
