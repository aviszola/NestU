// Fix package-lock.json: pastikan semua optional platform binary @next/swc
// punya flag "optional": true — Vercel (Linux) butuh entry linux, Windows butuh win32.
import fs from "fs";

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pkgs = lock.packages;
let fixed = 0;

for (const [key, val] of Object.entries(pkgs)) {
  if (key.startsWith("node_modules/@next/swc")) {
    if (val.optional !== true) {
      val.optional = true;
      fixed++;
      console.log(`fixed optional: ${key.replace("node_modules/", "")}`);
    }
  }
}

// Pastikan entry win32-x64-musl juga ada (kalau belum)
const needed = {
  "@next/swc-darwin-arm64": ["darwin", "arm64"],
  "@next/swc-darwin-x64": ["darwin", "x64"],
  "@next/swc-linux-arm64-gnu": ["linux", "arm64"],
  "@next/swc-linux-arm64-musl": ["linux", "arm64"],
  "@next/swc-linux-x64-gnu": ["linux", "x64"],
  "@next/swc-linux-x64-musl": ["linux", "x64"],
  "@next/swc-win32-arm64-msvc": ["win32", "arm64"],
  "@next/swc-win32-x64-msvc": ["win32", "x64"],
  "@next/swc-win32-x64-musl": ["win32", "x64"],
};
for (const [name, [os, cpu]] of Object.entries(needed)) {
  const key = `node_modules/${name}`;
  if (!pkgs[key]) {
    pkgs[key] = {
      version: "16.2.11",
      resolved: `https://registry.npmjs.org/${name}/-/${name}-16.2.11.tgz`,
      cpu: [cpu],
      optional: true,
      os: [os],
      engines: { node: ">= 10" },
    };
    fixed++;
    console.log(`added: ${name}`);
  }
}

fs.writeFileSync("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
console.log(`\nDone. ${fixed} entries fixed/added.`);
