"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AgencyLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "فشل الدخول"
        );
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center py-8">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/obelix-logo.png"
          alt="OBELIX"
          className="h-16 w-16 rounded-xl object-cover"
        />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            OBELIX Menu
          </h1>
          <p className="mt-1 text-sm text-white/50">
            دخول داشبورد الوكالة
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[var(--obx-bg-card)] p-5 sm:p-6"
      >
        <div>
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className="mt-1.5 text-left"
            required
            autoFocus
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "جاري الدخول…" : "دخول"}
        </Button>
      </form>
    </main>
  );
}
