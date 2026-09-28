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
