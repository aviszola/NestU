const fs = require("fs");
const src = fs.readFileSync("c:/SLE/public/images/logo_gpt.svg", "utf8");
const paths = [...src.matchAll(/<path[^>]*?d="([\s\S]*?)"/g)].map((m) => m[1].trim());

function bbox(arr) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of arr) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

// classify: text = any path with y >= 460
const icon = [], text = [];
for (const p of paths) {
  const nums = p.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const maxY = Math.max(...nums.filter((_, i) => i % 2 === 1));
  (maxY < 460 ? icon : text).push(p);
}

function fmt(b, pad) {
  const x = Math.floor(b.minX - pad), y = Math.floor(b.minY - pad);
  const w = Math.ceil(b.maxX - b.minX + pad * 2), h = Math.ceil(b.maxY - b.minY + pad * 2);
  return { vb: `${x} ${y} ${w} ${h}`, ratio: (w / h).toFixed(3), w, h };
}
console.log("icon vb:", fmt(bbox(icon), 2));
console.log("full vb:", fmt(bbox([...icon, ...text]), 3));
console.log("icon count:", icon.length, "text count:", text.length);
