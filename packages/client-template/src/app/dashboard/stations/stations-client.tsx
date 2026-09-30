"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Station } from "@/lib/extensions/ordering";

type Category = {
  id: string;
  name: string;
  nameEn?: string;
  parentId: string | null;
};

export function StationsClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [routing, setRouting] = useState<Record<string, Station>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/ordering/stations").then((r) => r.json()),
    ]).then(([cats, st]) => {
      setCategories(cats.categories || []);
      setRouting(st.stationRouting || {});
    });
  }, []);

  async function save() {
    setError(null);
    setMsg(null);
    const res = await fetch("/api/ordering/stations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationRouting: routing }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    setRouting(data.stationRouting || {});
    setMsg("تم حفظ التوجيه");
  }

  const roots = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/50">
        وجّه كل فئة للمطبخ أو الباريستا. الفئات الفرعية ترث الأب إن لم تُضبط.
      </p>
      <ul className="space-y-2">
        {roots.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-3 text-sm"
          >
            <span className="font-medium">{c.name}</span>
            <select
              className="h-10 rounded-md border px-2"
              value={routing[c.id] || "unassigned"}
              onChange={(e) =>
                setRouting((prev) => ({
                  ...prev,
                  [c.id]: e.target.value as Station,
                }))
              }
            >
              <option value="unassigned">غير مخصّص (كاشير)</option>
              <option value="kitchen">مطبخ</option>
              <option value="barista">باريستا</option>
            </select>
          </li>
        ))}
      </ul>
      <Button type="button" onClick={save}>
        حفظ التوجيه
      </Button>
      {msg && (
        <p className="text-sm text-emerald-700">{msg}</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
