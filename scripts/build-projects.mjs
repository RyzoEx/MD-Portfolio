import { readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const base = join(process.cwd(), "public", "projects");
const folders = ["MaxProjects", "DanyaProjects"];
const images = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif"]);
const videos = new Set([".mp4", ".webm", ".mov"]);
const subfolders = { cards: "cards", businesscards: "business", business: "business", visitky: "business", video: "video" };
const collator = new Intl.Collator("uk", { numeric: true, sensitivity: "base" });

const scan = (dir, urlBase, cat) =>
  readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isFile())
    .filter((f) => images.has(extname(f).toLowerCase()) || videos.has(extname(f).toLowerCase()))
    .sort(collator.compare)
    .map((f) => ({
      src: `${urlBase}/${encodeURIComponent(f)}`,
      title: basename(f, extname(f)).replace(/[-_]+/g, " ").replace(/[<>"&]/g, "").trim(),
      type: videos.has(extname(f).toLowerCase()) ? "video" : "image",
      cat: videos.has(extname(f).toLowerCase()) ? "video" : cat,
    }));

const result = {};
for (const folder of folders) {
  const dir = join(base, folder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let items = scan(dir, `projects/${folder}`, "cards");
  for (const sub of readdirSync(dir)) {
    const full = join(dir, sub);
    const cat = subfolders[sub.toLowerCase()];
    if (cat && statSync(full).isDirectory()) items = items.concat(scan(full, `projects/${folder}/${encodeURIComponent(sub)}`, cat));
  }
  result[folder] = items;
}

writeFileSync(join(process.cwd(), "public", "projects.json"), JSON.stringify(result));
console.log(Object.entries(result).map(([k, v]) => `${k}: ${v.length}`).join(" | "));
