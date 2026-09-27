"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { StarRating } from "./star-rating";
import type { Locale } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  onSubmitted?: () => void;
};

const L = {
  title: { ar: "نموذج التقييم", en: "Rate Form" },
  q1: {
    ar: "١ — هل هذه أول مرة تزور مطعمنا؟",
    en: "1 — Is this your first time at our restaurant?",
  },
  q2: {
    ar: "٢ — ما مدى رضاك العام عن المطعم؟",
    en: "2 — What is your overall satisfaction with our restaurant?",
  },
  q3: {
    ar: "٣ — كيف تقيّم النظافة؟",
    en: "3 — How would you rate the hygiene?",
  },
  q4: {
    ar: "٤ — كيف تقيّم طعم الأكل؟",
    en: "4 — How would you rate the taste of our food?",
  },
  q5: {
    ar: "٥ — هل ستعود لتأكل معنا مرة أخرى؟",
    en: "5 — Would you come back to eat with us again?",
  },
  q6: {
    ar: "٦ — هل تريد أن تخبرنا بشيء آخر؟",
    en: "6 — Is there anything else you want to tell us?",
  },
  q7: { ar: "٧ — الاسم", en: "7 — Name" },
  q8: { ar: "٨ — رقم الموبايل", en: "8 — Mobile Number" },
  q9: { ar: "٩ — البريد الإلكتروني", en: "9 — Email" },
  q10: {
    ar: "١٠ — كيف سمعت عنّا؟",
    en: "10 — How did you hear about us?",
  },
  placeholder: { ar: "اكتب إجابتك هنا", en: "Add Your answer here" },
  submit: { ar: "إرسال", en: "Submit" },
  thanks: { ar: "شكراً لتقييمك!", en: "Thanks for your feedback!" },
  close: { ar: "إغلاق", en: "Close" },
};

export function RateFormModal({ open, onClose, locale, onSubmitted }: Props) {
  const t = (k: keyof typeof L) => L[k][locale];
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const [overall, setOverall] = useState(3.5);
  const [hygiene, setHygiene] = useState(3.5);
  const [taste, setTaste] = useState(3.5);
  const [comeBack, setComeBack] = useState(false);
  const [anythingElse, setAnythingElse] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const tClose = panelRef.current?.querySelector<HTMLElement>(
      "button[data-close]"
    );
    tClose?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstVisit,
          overall,
          hygiene,
          taste,
          comeBack,
          anythingElse,
          name,
          mobile,
          email,
          heardAbout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h2
            id={titleId}
            className="text-lg font-bold text-[var(--brand-ink)]"
          >
            {t("title")}
          </h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-xl touch-manipulation hover:bg-black/10"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-[var(--brand-primary)]">
              {t("thanks")}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-12 w-full rounded-full text-sm font-bold text-white touch-manipulation"
              style={{ background: "var(--brand-primary)" }}
            >
              OK
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex-1 space-y-5 overflow-y-auto px-4 py-4"
          >
            <label className="flex min-h-11 items-start gap-3 text-sm font-semibold text-[var(--brand-ink)]">
              <input
                type="checkbox"
                checked={firstVisit}
                onChange={(e) => setFirstVisit(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--brand-primary)]"
              />
              <span>{t("q1")}</span>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">{t("q2")}</legend>
              <StarRating value={overall} onChange={setOverall} label={t("q2")} />
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">{t("q3")}</legend>
              <StarRating value={hygiene} onChange={setHygiene} label={t("q3")} />
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">{t("q4")}</legend>
              <StarRating value={taste} onChange={setTaste} label={t("q4")} />
            </fieldset>

            <label className="flex min-h-11 items-start gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={comeBack}
                onChange={(e) => setComeBack(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--brand-primary)]"
              />
              <span>{t("q5")}</span>
            </label>

            <Field
              label={t("q6")}
              value={anythingElse}
              onChange={setAnythingElse}
              placeholder={t("placeholder")}
              multiline
            />
            <Field
              label={t("q7")}
              value={name}
              onChange={setName}
              placeholder={t("placeholder")}
            />
            <Field
              label={t("q8")}
              value={mobile}
              onChange={setMobile}
              placeholder={t("placeholder")}
              inputMode="tel"
              dir="ltr"
            />
            <Field
              label={t("q9")}
              value={email}
              onChange={setEmail}
              placeholder={t("placeholder")}
              inputMode="email"
              dir="ltr"
            />
            <Field
              label={t("q10")}
              value={heardAbout}
              onChange={setHeardAbout}
              placeholder={t("placeholder")}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-full text-sm font-bold uppercase tracking-wide text-white touch-manipulation disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {busy ? "…" : t("submit")}
            </button>
            <div className="h-2" />
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  inputMode,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  dir?: "ltr" | "rtl";
}) {
  const cls =
    "mt-1.5 w-full rounded-md border-0 bg-[#f5f5f5] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";
  return (
    <label className="block text-sm font-semibold text-[var(--brand-ink)]">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          dir={dir}
        />
      )}
    </label>
  );
}
