"use client";

import type { OrderingFeatures } from "@/lib/types";
import { DEFAULT_ORDERING_FEATURES } from "@/lib/types";
import { useAgencyLocale } from "@/components/locale-provider";

type Props = {
  value: OrderingFeatures;
  onChange: (next: OrderingFeatures) => void;
};

const FLAG_KEYS: {
  key: keyof OrderingFeatures;
  needsMaster?: boolean;
  needsTable?: boolean;
}[] = [
  { key: "orderFromMenu" },
  { key: "tableOrderingEnabled", needsMaster: true },
  { key: "deliveryEnabled", needsMaster: true },
  { key: "zonesIndoorOutdoor", needsMaster: true, needsTable: true },
  { key: "cashierScreen", needsMaster: true },
  { key: "kitchenScreen", needsMaster: true },
  { key: "baristaScreen", needsMaster: true },
  { key: "posEnabled", needsMaster: true },
  { key: "staffAccountsEnabled" },
];

export function OrderingFlagsEditor({ value, onChange }: Props) {
  const { t } = useAgencyLocale();
  const v = { ...DEFAULT_ORDERING_FEATURES, ...value };
  const flagCopy = t.ordering.flags;

  function toggle(key: keyof OrderingFeatures, checked: boolean) {
    const next = { ...v, [key]: checked };
    if (key === "tableOrderingEnabled" && !checked) {
      next.zonesIndoorOutdoor = false;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--obx-yellow)]">
          {t.ordering.title}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {t.ordering.hintBefore}{" "}
          <code className="rounded bg-white/10 px-1" dir="ltr">
            data/ordering.json
          </code>{" "}
          {t.ordering.hintAfter}
        </p>
      </div>
      <ul className="space-y-3">
        {FLAG_KEYS.map((f) => {
          const disabled =
            (f.needsMaster && !v.orderFromMenu) ||
            (f.needsTable && !v.tableOrderingEnabled);
          const checked = Boolean(v[f.key]);
          const copy = flagCopy[f.key as keyof typeof flagCopy];
          if (!copy) return null;
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
                  <span className="block text-sm text-white">{copy.label}</span>
                  <span className="block text-xs text-white/45">{copy.hint}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
