"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Zone = {
  id: string;
  name: string;
  nameAr: string;
  active: boolean;
};
type Table = {
  id: string;
  label: string;
  labelAr?: string;
  zoneId?: string | null;
  active: boolean;
  sortOrder: number;
};

export function TablesClient({ zonesEnabled }: { zonesEnabled: boolean }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [label, setLabel] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const cfg = await fetch("/api/ordering/config").then((r) => r.json());
    setTables(cfg.tables || []);
    setZones(cfg.zones || []);
  }

  useEffect(() => {
    load().catch(() => setError("تعذّر التحميل"));
  }, []);

  async function addTable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const res = await fetch("/api/ordering/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        labelAr: label,
        zoneId: zonesEnabled ? zoneId || null : null,
        active: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    setLabel("");
    setMsg("تمت إضافة الطاولة");
    load();
  }

  async function toggleActive(t: Table) {
    await fetch("/api/ordering/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, active: !t.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف الطاولة؟")) return;
    await fetch("/api/ordering/tables", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function renameZone(z: Zone, nameAr: string, name: string) {
    await fetch("/api/ordering/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...z, nameAr, name }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {zonesEnabled && (
        <section className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="mb-3 font-bold">المناطق</h2>
          <ul className="space-y-3">
            {zones.map((z) => (
              <li key={z.id} className="flex flex-wrap gap-2 text-sm">
                <Input
                  defaultValue={z.nameAr}
                  className="max-w-[140px]"
                  onBlur={(e) => {
                    if (e.target.value !== z.nameAr)
                      renameZone(z, e.target.value, z.name);
                  }}
                />
                <Input
                  defaultValue={z.name}
                  className="max-w-[140px] text-left"
                  dir="ltr"
                  onBlur={(e) => {
                    if (e.target.value !== z.name)
                      renameZone(z, z.nameAr, e.target.value);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={addTable}
        className="space-y-3 rounded-xl border border-black/10 bg-white p-4"
      >
        <h2 className="font-bold">إضافة طاولة</h2>
        <div>
          <Label htmlFor="label">الاسم / الرقم</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="طاولة 1"
            required
          />
        </div>
        {zonesEnabled && (
          <div>
            <Label htmlFor="zone">المنطقة</Label>
            <select
              id="zone"
              className="flex h-11 w-full rounded-md border px-3 text-sm"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">—</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nameAr}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit">إضافة</Button>
      </form>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <ul className="space-y-2">
        {tables.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-3 py-3 text-sm"
          >
            <div>
              <p className="font-semibold">{t.labelAr || t.label}</p>
              <p className="text-xs text-black/45">
                {t.active ? "نشطة" : "مخفية"}
                {zonesEnabled && t.zoneId
                  ? ` · ${zones.find((z) => z.id === t.zoneId)?.nameAr || ""}`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => toggleActive(t)}
              >
                {t.active ? "إخفاء" : "تفعيل"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => remove(t.id)}
              >
                حذف
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {tables.length === 0 && (
        <p className="text-center text-sm text-black/40">
          لا توجد طاولات — أضف أول طاولة أعلاه
        </p>
      )}
    </div>
  );
}
