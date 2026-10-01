"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgencyLocale } from "@/components/locale-provider";

export default function AgencyLoginPage() {
  const router = useRouter();
  const { t, locale } = useAgencyLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t.login.failed
        );
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-[75vh] flex-col items-center justify-center py-10"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/obelix-logo.png"
          alt="OBELIX"
          className="h-16 w-16 rounded-xl object-cover ring-2 ring-[var(--obx-yellow)]/40"
        />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            <span className="text-[var(--obx-yellow)]">OBELIX</span> Menu
          </h1>
          <p className="mt-1 text-sm text-white/50">{t.login.subtitle}</p>
        </div>
      </div>

        <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-[var(--obx-bg-card)] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:p-8"
        autoComplete="on"
      >
        <div>
          <Label htmlFor="username">{t.login.username}</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            dir="ltr"
            className="mt-1.5 text-left"
            placeholder="admin"
            required
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="password">{t.login.password}</Label>
          <div className="relative mt-1.5">
            <Input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="pe-16 text-left"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-semibold text-white/50 hover:text-[var(--obx-yellow)]"
            >
              {showPw ? t.login.hide : t.login.show}
            </button>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t.login.submitting : t.login.submit}
        </Button>
      </form>
    </main>
  );
}
