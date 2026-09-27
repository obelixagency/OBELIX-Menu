import { promises as fs } from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import archiver from "archiver";
import type { ClientRecord } from "./types";
import { getUploadsDir, updateClient } from "./clients";

const IGNORE = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "out",
  ".DS_Store",
  "pnpm-lock.yaml",
  "package-lock.json",
]);

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

function sampleMenu(displayName: string) {
  return {
    categories: [
      {
        id: "cat-drinks",
        name: "مشروبات",
        nameEn: "Drinks",
        parentId: null,
        sortOrder: 1,
        active: true,
      },
      {
        id: "cat-hot",
        name: "مشروبات ساخنة",
        nameEn: "Hot Drinks",
        parentId: "cat-drinks",
        sortOrder: 1,
        active: true,
        discountType: "percent",
        discountValue: 10,
      },
      {
        id: "cat-cold",
        name: "مشروبات باردة",
        nameEn: "Cold Drinks",
        parentId: "cat-drinks",
        sortOrder: 2,
        active: true,
      },
      {
        id: "cat-food",
        name: "أكل",
        nameEn: "Food",
        parentId: null,
        sortOrder: 2,
        active: true,
      },
      {
        id: "cat-sweets",
        name: "حلويات",
        nameEn: "Desserts",
        parentId: "cat-food",
        sortOrder: 1,
        active: true,
      },
    ],
    products: [
      {
        id: "p-espresso",
        categoryId: "cat-hot",
        name: "إسبريسو",
        nameEn: "Espresso",
        description: `شوت مزدوج — ${displayName}`,
        descriptionEn: `Double shot — ${displayName}`,
        price: 45,
        discountType: "fixed",
        discountValue: 5,
        image: null,
        available: true,
        featured: true,
        sortOrder: 1,
      },
      {
        id: "p-latte",
        categoryId: "cat-hot",
        name: "لاتيه",
        nameEn: "Latte",
        description: "حليب مبخر مع إسبريسو ناعم",
        descriptionEn: "Steamed milk with soft espresso",
        price: 65,
        image: null,
        available: true,
        featured: false,
        sortOrder: 2,
      },
      {
        id: "p-iced",
        categoryId: "cat-cold",
        name: "آيس لاتيه",
        nameEn: "Iced Latte",
        description: "لاتيه مثلّج لحرّ القاهرة",
        descriptionEn: "Iced latte for Cairo heat",
        price: 70,
        image: null,
        available: true,
        featured: true,
        sortOrder: 1,
      },
      {
        id: "p-basbousa",
        categoryId: "cat-sweets",
        name: "بسبوسة",
        nameEn: "Basbousa",
        description: "بسبوسة بالقشطة على الطريقة البيتية",
        descriptionEn: "Homestyle basbousa with cream",
        price: 40,
        discountType: "percent",
        discountValue: 15,
        image: null,
        available: true,
        featured: true,
        sortOrder: 1,
      },
    ],
    contacts: [
      {
        id: "c-wa",
        type: "whatsapp",
        label: "واتساب",
        value: "201000000000",
        active: true,
      },
    ],
    reviews: [],
    meta: {
      seededFor: displayName,
      note: "بيانات تجريبية — عدّلها من لوحة التحكم",
    },
  };
}

export async function exportClientPackage(client: ClientRecord): Promise<{
  packageDir: string;
  zipPath: string;
}> {
  const workspaceRoot = path.resolve(process.cwd(), "../..");
  const templateDir = path.join(workspaceRoot, "packages", "client-template");
  const generatedRoot = path.join(process.cwd(), "generated");
  const packageDir = path.join(generatedRoot, client.slug);

  await fs.rm(packageDir, { recursive: true, force: true });
  await copyDir(templateDir, packageDir);

  // Drop template sample uploads so the package only ships this client's assets
  const uploadsDest = path.join(packageDir, "public", "uploads");
  await fs.mkdir(uploadsDest, { recursive: true });
  for (const entry of await fs.readdir(uploadsDest)) {
    if (entry === ".gitkeep") continue;
    await fs.rm(path.join(uploadsDest, entry), { force: true });
  }

  const brand = {
    displayName: client.displayName,
    slug: client.slug,
    logoUrl: client.logoPath ? `/uploads/${path.basename(client.logoPath)}` : null,
    colors: client.colors,
    font: client.font,
    currency: client.currency || "EGP",
    domain: client.domain,
    dashboardPassword: client.dashboardPassword,
    languages: client.languages || "both",
    notificationEmail: null,
    menuBackgroundUrl: client.menuBackgroundPath
      ? `/uploads/${path.basename(client.menuBackgroundPath)}`
      : null,
    extensions: {
      ordering: {
        enabled: false,
        provider: null as string | null,
        note: "v1 view-only — enable WhatsApp/cart in a later release",
      },
    },
  };

  await fs.mkdir(path.join(packageDir, "data"), { recursive: true });
  await fs.mkdir(path.join(packageDir, "public", "uploads"), { recursive: true });
  await fs.writeFile(
    path.join(packageDir, "data", "brand.json"),
    JSON.stringify(brand, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(packageDir, "data", "menu.json"),
    JSON.stringify(sampleMenu(client.displayName), null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(packageDir, ".env.example"),
    `DASHBOARD_PASSWORD=${client.dashboardPassword}\nPORT=3000\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(packageDir, ".env.local"),
    `DASHBOARD_PASSWORD=${client.dashboardPassword}\n`,
    "utf8"
  );

  if (client.logoPath) {
    const srcLogo = path.join(getUploadsDir(), path.basename(client.logoPath));
    try {
      await fs.copyFile(
        srcLogo,
        path.join(
          packageDir,
          "public",
          "uploads",
          path.basename(client.logoPath)
        )
      );
    } catch {
      // logo optional
    }
  }

  if (client.menuBackgroundPath) {
    const srcBg = path.join(
      getUploadsDir(),
      path.basename(client.menuBackgroundPath)
    );
    try {
      await fs.copyFile(
        srcBg,
        path.join(
          packageDir,
          "public",
          "uploads",
          path.basename(client.menuBackgroundPath)
        )
      );
    } catch {
      // background optional
    }
  }

  const zipPath = path.join(generatedRoot, `${client.slug}.zip`);
  await fs.mkdir(generatedRoot, { recursive: true });
  await zipDirectory(packageDir, zipPath);

  await updateClient(client.id, {
    lastExportedAt: new Date().toISOString(),
    packagePath: `generated/${client.slug}`,
  });

  return { packageDir, zipPath };
}

async function zipDirectory(sourceDir: string, outPath: string) {
  const output = createWriteStream(outPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const done = pipeline(archive, output);
  archive.directory(sourceDir, false);
  await archive.finalize();
  await done;
}

export function getGeneratedDir() {
  return path.join(process.cwd(), "generated");
}
