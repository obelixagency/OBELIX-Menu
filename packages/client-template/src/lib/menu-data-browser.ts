import type { Category } from "@/lib/types";

/** Browser-safe helpers (no fs) for public menu tree nav */
export function childrenOf(
  categories: Category[],
  parentId: string | null
): Category[] {
  return categories
    .filter((c) => (c.parentId ?? null) === parentId && c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
