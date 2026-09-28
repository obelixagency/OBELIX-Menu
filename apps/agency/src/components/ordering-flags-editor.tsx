"use client";

import type { OrderingFeatures } from "@/lib/types";
import { DEFAULT_ORDERING_FEATURES } from "@/lib/types";

type Props = {
  value: OrderingFeatures;
  onChange: (next: OrderingFeatures) => void;
};

const FLAGS: {
  key: keyof OrderingFeatures;
  label: string;
  hint: string;
  needsMaster?: boolean;
  needsTable?: boolean;
}[] = [
  {
    key: "orderFromMenu",
    label: "الطلب من المنيو (ماستر)",
    hint: "لو مطفّى مفيش أي واجهة طلب — لا طاولة ولا دليفري",
  },
  {
    key: "tableOrderingEnabled",
    label: "طلب الطاولة / داين-إن",
    hint: "الزائر يختار طاولة من قائمة المالك",
    needsMaster: true,
  },
  {
    key: "deliveryEnabled",
    label: "التوصيل",
    hint: "الزائر يدخل موبايل + عنوان — الدفع عند الاستلام",
    needsMaster: true,
  },
  {
    key: "zonesIndoorOutdoor",
    label: "مناطق داخلي / خارجي",
    hint: "يظهر فقط مع طلب الطاولة",
    needsMaster: true,
    needsTable: true,
  },
  {
    key: "cashierScreen",
    label: "شاشة الكاشير",
    hint: "مسار /cashier + تنبيه صوتي",
    needsMaster: true,
  },
  {
    key: "kitchenScreen",
    label: "شاشة المطبخ",
    hint: "مسار /kitchen — أصناف موجّهة للمطبخ حسب الفئة",
    needsMaster: true,
  },
  {
    key: "baristaScreen",
    label: "شاشة الباريستا",
    hint: "مسار /bar — أصناف موجّهة للبار حسب الفئة",
    needsMaster: true,
  },
];

export function OrderingFlagsEditor({ value, onChange }: Props) {
  const v = { ...DEFAULT_ORDERING_FEATURES, ...value };

  function toggle(key: keyof OrderingFeatures, checked: boolean) {
    const next = { ...v, [key]: checked };
    if (key === "orderFromMenu" && !checked) {
      // keep stored flags; UX ignores them when master off
    }
    if (key === "tableOrderingEnabled" && !checked) {
      next.zonesIndoorOutdoor = false;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--obx-yellow)]">
          ميزات الطلب — ما يشتريه العميل
        </p>
        <p className="mt-1 text-xs text-white/45">
          بعد التعديل: احفظ ثم أعد تصدير الحزمة. على السيرفر الحي احتفظ بملف{" "}
          <code className="rounded bg-white/10 px-1" dir="ltr">
            data/ordering.json
          </code>{" "}
          (طاولات/طلبات).
        </p>
      </div>
      <ul className="space-y-3">
        {FLAGS.map((f) => {
          const disabled =
            (f.needsMaster && !v.orderFromMenu) ||
            (f.needsTable && !v.tableOrderingEnabled);
          const checked = Boolean(v[f.key]);
          return (
            <li key={f.key}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border border-white/5 p-2 ${
                  disabled ? "opacity-40" : "hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--obx-yellow)]"
                  checked={checked && !disabled}
                  disabled={disabled && f.key !== "orderFromMenu"}
                  onChange={(e) => toggle(f.key, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm text-white">{f.label}</span>
                  <span className="block text-xs text-white/45">{f.hint}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
