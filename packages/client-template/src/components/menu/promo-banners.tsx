"use client";

import { useEffect, useState } from "react";
import type { Banner } from "@/lib/types";

export function PromoBannerCarousel({ banners }: { banners: Banner[] }) {
  const active = banners.filter((b) => b.active && b.imageUrl);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % active.length);
    }, 4500);
    return () => clearInterval(t);
  }, [active.length]);

  if (active.length === 0) return null;

  const current = active[idx] || active[0];

  return (
    <div className="relative w-full overflow-hidden bg-black">
      <div className="relative aspect-[21/9] w-full max-h-48 sm:max-h-56 md:max-h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.imageUrl}
          alt=""
          className="h-full w-full object-cover animate-soft-in"
        />
      </div>
      {active.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {active.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`banner ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all touch-manipulation ${
                i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
