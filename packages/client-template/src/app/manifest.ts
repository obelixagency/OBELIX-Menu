import type { MetadataRoute } from "next";
import { readBrand } from "@/lib/brand";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await readBrand();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const label = /pos/i.test(brand.displayName)
    ? brand.displayName
    : `${brand.displayName} POS`;
  return {
    name: label,
    short_name: label.slice(0, 12),
    description: `نقطة بيع ${brand.displayName} — تعمل أوفلاين ثم تزامن`,
    start_url: `${base}/pos`,
    scope: `${base}/` || "/",
    display: "standalone",
    orientation: "any",
    background_color: brand.colors.surface || "#F7F1E8",
    theme_color: brand.colors.primary || "#5C3A1E",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: `${base}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
