"use client";

import { FormEvent, useEffect, useState } from "react";
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
import type { Contact, ContactType } from "@/lib/types";

const TYPES: { value: ContactType; label: string }[] = [
  { value: "whatsapp", label: "واتساب" },
  { value: "phone", label: "تليفون" },
  { value: "instagram", label: "إنستجرام" },
  { value: "facebook", label: "فيسبوك" },
  { value: "tiktok", label: "تيك توك" },
  { value: "email", label: "إيميل" },
  { value: "maps", label: "خرائط / موقع" },
];

export default function ContactsClient() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [type, setType] = useState<ContactType>("whatsapp");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, label, value }),
    });
    const data = await res.json();
    if (res.status === 401) {
      router.push("/dashboard/login");
      return;
    }
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    setLabel("");
    setValue("");
    await load();
  }

  async function toggle(c: Contact) {
    await fetch(`/api/contacts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("حذف؟")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-black/50">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">وسائل التواصل</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">النوع</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="label">تسمية (اختياري)</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="value">القيمة / الرابط / الرقم</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                dir="ltr"
                className="text-left"
                placeholder="2010… أو https://…"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              حفظ
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/8 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {c.label || TYPES.find((t) => t.value === c.type)?.label}
              </p>
              <p className="truncate text-xs text-black/45" dir="ltr">
                {c.value}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(c)}>
                {c.active ? "ظاهر" : "مخفي"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(c.id)}>
                حذف
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
