import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

/**
 * Serves files uploaded at runtime (Next only serves `public/` files that existed
 * at build time). Build-time files are still served statically before this runs.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "uploads", name));
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (ext === ".svg") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
    return new NextResponse(new Uint8Array(buf), { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
