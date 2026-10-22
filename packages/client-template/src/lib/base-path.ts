/** Prefix app-relative paths with Next `basePath` (e.g. `/pilot`). */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  if (!path.startsWith("/")) return path;
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

export function appBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/** Public URL for an uploaded/static asset (`/uploads/...`) honoring basePath. */
export function mediaUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return withBasePath(src.startsWith("/") ? src : `/${src}`);
}
