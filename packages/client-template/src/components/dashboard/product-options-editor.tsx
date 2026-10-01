"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductOptionGroup } from "@/lib/types";

function rid() {
  return `opt-${Math.random().toString(36).slice(2, 9)}`;
}

export function ProductOptionsEditor({
  groups,
  onChange,
}: {
  groups: ProductOptionGroup[];
  onChange: (next: ProductOptionGroup[]) => void;
}) {
  function addGroup() {
    onChange([
      ...groups,
      {
        id: rid(),
        name: "الحجم",
        nameEn: "Size",
        required: true,
        priceMode: "replace",
        values: [
          { id: rid(), name: "صغير", nameEn: "Small", price: 0 },
          { id: rid(), name: "كبير", nameEn: "Large", price: 0 },
        ],
      },
    ]);
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-2xl border border-[var(--brand-line)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">خيارات الصنف</p>
          <p className="text-xs text-[var(--brand-muted)]">
            أحجام أو إضافات. «سعر بديل» = رقم مكان رقم. «فرق» = يُضاف على السعر.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addGroup}>
          + مجموعة
        </Button>
      </div>
      {groups.map((g, gi) => (
        <div
          key={g.id}
          className="space-y-2 rounded-xl bg-[#F6F3EE] p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>اسم المجموعة</Label>
              <Input
                value={g.name}
                onChange={(e) => {
                  const next = [...groups];
                  next[gi] = { ...g, name: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div>
              <Label>English</Label>
              <Input
                value={g.nameEn || ""}
                dir="ltr"
                className="text-left"
                onChange={(e) => {
                  const next = [...groups];
                  next[gi] = { ...g, nameEn: e.target.value };
                  onChange(next);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex min-h-10 items-center gap-2">
              <input
                type="checkbox"
                checked={g.required}
                onChange={(e) => {
                  const next = [...groups];
                  next[gi] = { ...g, required: e.target.checked };
                  onChange(next);
                }}
              />
              إلزامي
            </label>
            <label className="flex min-h-10 items-center gap-2">
              <input
                type="radio"
                name={`mode-${g.id}`}
                checked={g.priceMode === "replace"}
                onChange={() => {
                  const next = [...groups];
                  next[gi] = { ...g, priceMode: "replace" };
                  onChange(next);
                }}
              />
              سعر بديل
            </label>
            <label className="flex min-h-10 items-center gap-2">
              <input
                type="radio"
                name={`mode-${g.id}`}
                checked={g.priceMode === "delta"}
                onChange={() => {
                  const next = [...groups];
                  next[gi] = { ...g, priceMode: "delta" };
                  onChange(next);
                }}
              />
              فرق سعر
            </label>
            <button
              type="button"
              className="ms-auto text-xs text-red-600"
              onClick={() => onChange(groups.filter((_, i) => i !== gi))}
            >
              حذف المجموعة
            </button>
          </div>
          <ul className="space-y-2">
            {g.values.map((v, vi) => (
              <li key={v.id} className="grid grid-cols-3 gap-2">
                <Input
                  value={v.name}
                  placeholder="القيمة"
                  onChange={(e) => {
                    const next = [...groups];
                    const values = [...g.values];
                    values[vi] = { ...v, name: e.target.value };
                    next[gi] = { ...g, values };
                    onChange(next);
                  }}
                />
                <Input
                  value={v.nameEn || ""}
                  placeholder="EN"
                  dir="ltr"
                  className="text-left"
                  onChange={(e) => {
                    const next = [...groups];
                    const values = [...g.values];
                    values[vi] = { ...v, nameEn: e.target.value };
                    next[gi] = { ...g, values };
                    onChange(next);
                  }}
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={v.price}
                    dir="ltr"
                    className="text-left"
                    onChange={(e) => {
                      const next = [...groups];
                      const values = [...g.values];
                      values[vi] = {
                        ...v,
                        price: Number(e.target.value) || 0,
                      };
                      next[gi] = { ...g, values };
                      onChange(next);
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => {
                      const next = [...groups];
                      next[gi] = {
                        ...g,
                        values: g.values.filter((_, i) => i !== vi),
                      };
                      onChange(next);
                    }}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = [...groups];
              next[gi] = {
                ...g,
                values: [
                  ...g.values,
                  { id: rid(), name: "", nameEn: "", price: 0 },
                ],
              };
              onChange(next);
            }}
          >
            + قيمة
          </Button>
        </div>
      ))}
    </div>
  );
}
