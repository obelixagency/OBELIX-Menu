"use client";
import { mediaUrl } from "@/lib/base-path";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";
import { pickLocalized, type Locale } from "@/lib/i18n";

/**
 * Swipeable promo strip. Native scroll-snap does the swiping (works with touch,
 * trackpad and keyboard); the scroller is forced LTR so scroll offsets behave
 * the same in Arabic. Text is drawn over the photo instead of baked into it, so
 * nothing gets cropped on narrow phones.
 */
export function PromoBannerCarousel({
  banners,
  locale = "ar",
}: {
  banners: Banner[];
  locale?: Locale;
}) {
  const active = banners.filter((b) => b.active && b.imageUrl);
  const [idx, setIdx] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (active.length <= 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => {
      if (paused.current) return;
      const el = scroller.current;
      if (!el) return;
      const cur = Math.round(el.scrollLeft / el.clientWidth);
      goTo((cur + 1) % active.length);
    }, 5000);
    return () => clearInterval(t);
  }, [active.length]);

  if (active.length === 0) return null;

  return (
    <section
      className="relative"
      aria-roledescription="carousel"
      onPointerDown={() => (paused.current = true)}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div
        ref={scroller}
        dir="ltr"
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {active.map((b, i) => {
          const title = pickLocalized(locale, b.title, b.titleEn);
          const subtitle = pickLocalized(locale, b.subtitle, b.subtitleEn);
          const body = (
            <div className="relative aspect-[2/1] w-full overflow-hidden bg-black/5 sm:aspect-[3/1]">
              <picture>
                {b.imageUrlMobile ? (
                  <source
                    media="(max-width: 639px)"
                    srcSet={mediaUrl(b.imageUrlMobile) ?? undefined}
                  />
                ) : null}
                <img
                  src={mediaUrl(b.imageUrl) ?? undefined}
                  alt={title || ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </picture>
              {(title || subtitle) && (
                <div
                  dir={locale === "en" ? "ltr" : "rtl"}
                  className="absolute inset-0 flex flex-col justify-end p-4 text-white sm:p-6"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,0) 75%)",
                  }}
                >
                  {title && (
                    <p className="text-lg font-extrabold leading-tight sm:text-2xl">
                      {title}
                    </p>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/85 sm:text-sm">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
          return (
            <div
              key={b.id}
              className="w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${active.length}`}
            >
              {b.productId ? (
                <Link href={`/item/${b.productId}`} className="block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>
      {active.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" dir="ltr">
          {active.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`banner ${i + 1}`}
              aria-current={i === idx}
              onClick={() => goTo(i)}
              className="flex h-6 items-center touch-manipulation"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === idx
                    ? "w-5 bg-[var(--brand-primary)]"
                    : "w-1.5 bg-black/20"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
