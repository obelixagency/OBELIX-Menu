"use client";

import { useState } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  label?: string;
};

/** Half-star rating 0.5–5 */
export function StarRating({ value, onChange, label }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const full = value >= star;
          const half = !full && value >= star - 0.5;
          return (
            <div key={star} className="relative h-9 w-9 touch-manipulation">
              <button
                type="button"
                className="absolute inset-y-0 start-0 z-10 w-1/2"
                aria-label={`${star - 0.5}`}
                onClick={() => onChange(star - 0.5)}
              />
              <button
                type="button"
                className="absolute inset-y-0 end-0 z-10 w-1/2"
                aria-label={`${star}`}
                onClick={() => onChange(star)}
              />
              <svg viewBox="0 0 24 24" className="h-9 w-9 pointer-events-none">
                <defs>
                  <linearGradient id={`half-${star}-${value}`}>
                    <stop offset="50%" stopColor="var(--brand-accent, #D4A017)" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.8 6.2 20.3l1.1-6.4L2.6 9.3l6.5-.9L12 2.5z"
                  fill={
                    full
                      ? "var(--brand-accent, #D4A017)"
                      : half
                        ? `url(#half-${star}-${value})`
                        : "none"
                  }
                  stroke="var(--brand-accent, #D4A017)"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-black/70" dir="ltr">
        {value.toFixed(1)} / 5
      </span>
    </div>
  );
}
