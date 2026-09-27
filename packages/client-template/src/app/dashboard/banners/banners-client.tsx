"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Banner } from "@/lib/types";

export default function BannersClient() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/banners");
    const data = await res.json();
    setBanners(data.all || data.banners || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (up.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!up.ok) throw new Error(upData.error || "فشل الرفع");
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: upData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setUploading(false);
    }
  }

  async function toggle(b: Banner) {
    await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("حذف البانر؟")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">بانرات العروض</h1>
        <p className="text-sm text-black/50">
          تظهر أعلى المنيو العام كشريط / كاروسيل. بدون صور = لا يظهر شيء.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">رفع بانر</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="banner">صورة العرض</Label>
          <Input
            id="banner"
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          {uploading && (
            <p className="mt-2 text-xs text-black/45">جاري الرفع…</p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
      <ul className="space-y-3">
        {banners.map((b) => (
          <li
            key={b.id}
            className="overflow-hidden rounded-xl border border-black/8 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.imageUrl}
              alt=""
              className="aspect-[21/9] w-full object-cover"
            />
            <div className="flex justify-end gap-2 p-2">
              <Button size="sm" variant="outline" onClick={() => toggle(b)}>
                {b.active ? "ظاهر" : "مخفي"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(b.id)}>
                حذف
              </Button>
            </div>
          </li>
        ))}
        {banners.length === 0 && (
          <p className="text-sm text-black/45">لا توجد بانرات بعد</p>
        )}
      </ul>
    </div>
  );
}
