"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeliveryArea } from "@/lib/commerce";
import { withBasePath } from "@/lib/base-path";

export default function DeliveryClient() {
  const [minOrder, setMinOrder] = useState("0");
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [fee, setFee] = useState("0");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(withBasePath("/api/ordering/config"));
    const d = await res.json();
    setMinOrder(String(d.settings?.deliveryMinOrder || 0));
    setAreas(d.settings?.deliveryAreas || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveAreas(next: DeliveryArea[], min?: string) {
    const res = await fetch(withBasePath("/api/ordering/config"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryMinOrder: Number(min ?? minOrder) || 0,
        deliveryAreas: next,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error || "فشل");
      return;
    }
    setMsg("تم الحفظ");
    await load();
  }

  async function addArea(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const next: DeliveryArea[] = [
      ...areas,
      {
        id: `area-${Date.now().toString(36)}`,
        name: nameEn || name,
        nameAr: name,
        fee: Number(fee) || 0,
        active: true,
        sortOrder: areas.length + 1,
      },
    ];
    setName("");
    setNameEn("");
    setFee("0");
    await saveAreas(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">التوصيل حسب المنطقة</h1>
        <p className="text-sm text-[var(--brand-muted)]">
          حد أدنى للطلب ورسوم لكل حي. الضيف يختار المنطقة في السلة.
        </p>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الحد الأدنى</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <Label>أقل قيمة للسلة (بدون رسوم)</Label>
            <Input
              type="number"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>
          <Button
            type="button"
            onClick={() => saveAreas(areas)}
          >
            حفظ الحد
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة منطقة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addArea} className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label>الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>English</Label>
              <Input
                value={nameEn}
                dir="ltr"
                className="text-left"
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>
            <div>
              <Label>الرسوم</Label>
              <Input
                type="number"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <Button type="submit" className="sm:col-span-3 w-full sm:w-auto">
              إضافة
            </Button>
          </form>
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {areas.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-[var(--brand-line)] bg-white px-3 py-2 text-sm"
          >
            <span>
              {a.nameAr} {a.name !== a.nameAr ? ` / ${a.name}` : ""} · رسوم {a.fee}
              {!a.active ? " · مخفي" : ""}
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  saveAreas(
                    areas.map((x) =>
                      x.id === a.id ? { ...x, active: !x.active } : x
                    )
                  )
                }
              >
                {a.active ? "إخفاء" : "إظهار"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => saveAreas(areas.filter((x) => x.id !== a.id))}
              >
                حذف
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
