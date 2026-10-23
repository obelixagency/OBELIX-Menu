#!/usr/bin/env node
// Load the pilot demo menu (items, photos, banners, brand look) into a client app folder.
//
//   node scripts/demo-seed.mjs <eg|sa> <app-dir> [--photos <dir>]
//
//   eg  → Egypt demo, EGP, no VAT        (menu.obelixagency.com/pilot)
//   sa  → Saudi demo, SAR, VAT 15% incl. (menu.obelixagency.com/pilot-sa)
//
// <app-dir> is a client-template checkout locally, or the live app folder on the
// server (e.g. ~/domains/menu.obelixagency.com/public_html/pilot).
//
// What it changes:
//   data/menu.json      replaced (categories, items, banners, contacts, reviews)
//   data/brand.json     only look & money fields merged (name, slogan, logo, cover,
//                       colors, currency, VAT). Password, ordering flags, domain kept.
//   data/ordering.json  stationRouting merged; tables, orders, settings kept.
//   data/branches.json  demo branch names merged by id; branch prices kept.
//   public/uploads/     demo-<name> photos (and the demo logo) copied in.
// A timestamped copy of these JSON files is saved next to them first.
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const variant = args[0];
const appDir = args[1] && path.resolve(args[1]);
const photosIdx = args.indexOf("--photos");
const demoRoot = path.join(here, "..", "packages", "client-template", "demo");
const photosDir = photosIdx > -1 ? path.resolve(args[photosIdx + 1]) : path.join(demoRoot, "photos");

if (!["eg", "sa"].includes(variant) || !appDir) {
  console.error("usage: node scripts/demo-seed.mjs <eg|sa> <app-dir> [--photos <dir>]");
  process.exit(1);
}

const readJson = async (p, fallback) => {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch (err) {
    if (fallback !== undefined && err.code === "ENOENT") return fallback;
    throw err;
  }
};
const writeJson = (p, v) => fs.writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

const src = path.join(demoRoot, variant);
const dataDir = path.join(appDir, "data");
const uploadsDir = path.join(appDir, "public", "uploads");
await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(uploadsDir, { recursive: true });

const menu = await readJson(path.join(src, "menu.json"));
const brandPatch = await readJson(path.join(src, "brand.patch.json"));
const orderingPatch = await readJson(path.join(src, "ordering.patch.json"));

// Every photo the menu points at must exist before anything is written.
const wanted = new Set(
  [
    brandPatch.menuBackgroundUrl,
    brandPatch.logoUrl,
    ...menu.products.map((p) => p.image),
    ...menu.banners.flatMap((b) => [b.imageUrl, b.imageUrlMobile]),
  ]
    .filter((u) => typeof u === "string" && u.startsWith("/uploads/demo-"))
    .map((u) => u.slice("/uploads/demo-".length))
);
// A file in demo/<variant>/ (e.g. that demo's logo) wins over demo/photos/.
const located = new Map();
const missing = [];
for (const file of wanted) {
  for (const dir of [src, photosDir]) {
    try {
      await fs.access(path.join(dir, file));
      located.set(file, path.join(dir, file));
      break;
    } catch {}
  }
  if (!located.has(file)) missing.push(file);
}
if (missing.length) {
  console.error(`✗ missing photos in ${photosDir}:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
for (const f of ["menu.json", "brand.json", "ordering.json", "branches.json"]) {
  try {
    await fs.copyFile(path.join(dataDir, f), path.join(dataDir, `${f}.bak-${stamp}`));
  } catch {}
}

await writeJson(path.join(dataDir, "menu.json"), menu);

const brandFile = path.join(dataDir, "brand.json");
const brand = await readJson(brandFile, null);
if (brand) {
  await writeJson(brandFile, { ...brand, ...brandPatch, colors: { ...brand.colors, ...brandPatch.colors } });
} else {
  console.warn("! data/brand.json not found — skipped brand (run once the app has its brand.json)");
}

const orderingFile = path.join(dataDir, "ordering.json");
const ordering = await readJson(orderingFile, null);
if (ordering) {
  await writeJson(orderingFile, {
    ...ordering,
    stationRouting: { ...(ordering.stationRouting || {}), ...orderingPatch.stationRouting },
  });
}

const branchesFile = path.join(dataDir, "branches.json");
const branches = await readJson(branchesFile, null);
const branchesPatch = await readJson(path.join(src, "branches.patch.json"), null);
if (branches && branchesPatch) {
  const byId = new Map(branchesPatch.branches.map((b) => [b.id, b]));
  await writeJson(branchesFile, {
    ...branches,
    branches: (branches.branches || []).map((b) =>
      byId.has(b.id) ? { ...b, ...byId.get(b.id) } : b
    ),
  });
}

for (const file of wanted) {
  await fs.copyFile(located.get(file), path.join(uploadsDir, `demo-${file}`));
}

console.log(
  `✓ ${variant} demo → ${appDir}\n  ${menu.products.length} items · ${menu.categories.length} categories · ${menu.banners.length} banners · ${wanted.size} photos · ${brandPatch.currency}`
);
