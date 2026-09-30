"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withBasePath } from "@/lib/base-path";

type BrandInfo = {
  displayName: string;
  logoUrl: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(withBasePath("/api/brand"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.brand) {
          setBrand({
            displayName: d.brand.displayName || "Dashboard",
            logoUrl: d.brand.logoUrl || null,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      const dest =
        typeof data.redirect === "string" ? data.redirect : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const logoSrc = brand?.logoUrl
    ? brand.logoUrl.startsWith("http")
      ? brand.logoUrl
      : withBasePath(brand.logoUrl)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FACF1C] text-2xl font-black text-black">
              {(brand?.displayName || "O").slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-white">
              {brand?.displayName || "Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-white/45">
              Sign in with username and password
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:p-7"
          autoComplete="on"
        >
          <div>
            <Label htmlFor="username" className="text-white/80">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              className="mt-1.5 border-white/15 bg-[#1a1a1a] text-left text-white placeholder:text-white/30"
              placeholder="owner"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-white/80">
              Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="border-white/15 bg-[#1a1a1a] pe-16 text-left text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-semibold text-white/45 hover:text-[#FACF1C]"
              >
                {showPw ? "Hide" : "Show"}
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
          <Button
            type="submit"
            className="h-11 w-full bg-[#FACF1C] font-bold text-black hover:bg-[#e0b918]"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-[10px] text-white/30">
            Powered by OBELIX
          </p>
        </form>
      </div>
    </div>
  );
}
