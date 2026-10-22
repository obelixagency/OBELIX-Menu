"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Lets the signed-in user change their own login password. */
export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ ok: false, text: "الباسورد الجديد لازم 8 حروف على الأقل" });
    if (next !== confirmPw) return setMsg({ ok: false, text: "تأكيد الباسورد مش مطابق" });
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "حصلت مشكلة");
      setCurrent("");
      setNext("");
      setConfirmPw("");
      setMsg({ ok: true, text: "اتغيّر الباسورد — استخدمه في الدخول الجاي" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "حصلت مشكلة" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تغيير باسورد الدخول</CardTitle>
        <CardDescription>غيّر الباسورد اللي بتدخل بيه الداشبورد. 8 حروف على الأقل.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="pw-current">الباسورد الحالي</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-new">الباسورد الجديد</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-confirm">تأكيد الباسورد الجديد</Label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} />
          </div>
          <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ الباسورد الجديد"}</Button>
            {msg && (
              <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
