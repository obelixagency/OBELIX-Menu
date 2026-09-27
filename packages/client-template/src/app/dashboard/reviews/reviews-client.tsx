"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewOverall, type Review } from "@/lib/types";

export default function ReviewsClient() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/reviews?all=1");
    if (res.status === 401) {
      router.push("/dashboard/login");
      return;
    }
    const data = await res.json();
    setReviews(data.reviews || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(r: Review) {
    await fetch(`/api/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !r.visible }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("حذف التقييم؟")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-black/50">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">نماذج التقييم (Rate Form)</h1>
        <p className="text-sm text-black/50">
          كل إرسال يظهر هنا. اضبط إيميل الإشعار من الإعدادات. بدون SMTP/Resend
          تُحفظ التقييمات فقط.
        </p>
      </div>
      <ul className="space-y-2">
        {reviews.map((r) => {
          const open = expanded === r.id;
          return (
            <li
              key={r.id}
              className="rounded-lg border border-black/8 bg-white px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => setExpanded(open ? null : r.id)}
                >
                  <p className="text-[var(--brand-accent)]">
                    {"★".repeat(Math.round(reviewOverall(r) || 0))}
                    <span className="ms-2 text-xs text-black/45">
                      {r.name || "زائر"} ·{" "}
                      {new Date(r.createdAt).toLocaleString("ar-EG")}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">
                    {r.anythingElse || r.comment || "—"}
                  </p>
                </button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(r)}>
                    {r.visible ? "إخفاء" : "إظهار"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => remove(r.id)}
                  >
                    حذف
                  </Button>
                </div>
              </div>
              {open && (
                <dl className="mt-3 grid gap-1 border-t border-black/5 pt-3 text-xs text-black/70 sm:grid-cols-2">
                  <div>أول زيارة: {r.firstVisit ? "نعم" : "لا"}</div>
                  <div>رضا عام: {r.overall ?? "—"}</div>
                  <div>نظافة: {r.hygiene ?? "—"}</div>
                  <div>طعم: {r.taste ?? "—"}</div>
                  <div>سيعود: {r.comeBack ? "نعم" : "لا"}</div>
                  <div dir="ltr">Mobile: {r.mobile || "—"}</div>
                  <div dir="ltr">Email: {r.email || "—"}</div>
                  <div>سمع عنّا: {r.heardAbout || "—"}</div>
                </dl>
              )}
            </li>
          );
        })}
        {reviews.length === 0 && (
          <p className="text-sm text-black/45">لا توجد تقييمات بعد</p>
        )}
      </ul>
    </div>
  );
}
