/**
 * Thermal (80mm) receipt helpers for browser print + ESC/POS text export.
 * USB thermal printers in Egypt usually appear as a normal Windows/macOS printer —
 * CSS @page width 80mm is the practical path. ESC/POS text is for future bridge apps.
 */

export type ThermalLine = {
  name: string;
  qty: number;
  unitPrice: number;
};

export type ClientPrintBrand = {
  /** Client logo URL (Brand Kit) — shown on paper */
  logoUrl?: string | null;
  /** Client primary from Brand Kit */
  primary?: string;
  /** Client accent from Brand Kit */
  accent?: string;
};

export type ThermalReceiptInput = {
  storeName: string;
  code: string;
  currency: string;
  method: string;
  total: number;
  lines: ThermalLine[];
  locale?: "ar" | "en";
  dir?: "rtl" | "ltr";
  /** Optional footer note */
  note?: string;
  when?: Date;
  /** Client Brand Kit for paper — not OBELIX chrome */
  brand?: ClientPrintBrand;
  tax?: number;
  taxInclusive?: boolean;
  taxNumber?: string | null;
  deliveryFee?: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build ESC/POS-friendly plain text (CP437-ish ASCII + Arabic as UTF-8 for modern printers). */
export function buildEscPosText(r: ThermalReceiptInput): string {
  const when = r.when || new Date();
  const locale = r.locale === "ar" ? "ar-EG" : "en-GB";
  const sep = "--------------------------------";
  const lines = r.lines
    .map((l) => {
      const left = `${l.name} x${l.qty}`;
      const right = (l.unitPrice * l.qty).toFixed(2);
      return `${left}\n  ${right} ${r.currency}`;
    })
    .join("\n");
  const taxLine =
    r.tax && r.tax > 0
      ? r.taxInclusive
        ? `TAX incl.: ${r.tax.toFixed(2)} ${r.currency}`
        : `TAX: ${r.tax.toFixed(2)} ${r.currency}`
      : "";
  const feeLine =
    r.deliveryFee && r.deliveryFee > 0
      ? `Delivery: ${r.deliveryFee.toFixed(2)} ${r.currency}`
      : "";
  const vatLine = r.taxNumber ? `Tax no: ${r.taxNumber}` : "";
  return [
    r.storeName,
    sep,
    `Code: ${r.code}`,
    when.toLocaleString(locale),
    sep,
    lines,
    sep,
    taxLine,
    feeLine,
    `TOTAL: ${r.total.toFixed(2)} ${r.currency}`,
    `Pay: ${r.method.toUpperCase()}`,
    vatLine,
    r.note ? `Note: ${r.note}` : "",
    sep,
    r.storeName,
    "\n\n\n",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Open a print window sized for 80mm thermal paper — client Brand Kit on paper. */
export function printThermalReceipt(r: ThermalReceiptInput): void {
  if (typeof window === "undefined") return;
  const dir = r.dir || (r.locale === "ar" ? "rtl" : "ltr");
  const locale = r.locale || "en";
  const when = r.when || new Date();
  const codeLabel = locale === "ar" ? "الكود" : "Code";
  const totalLabel = locale === "ar" ? "الإجمالي" : "Total";
  const taxLabel =
    locale === "ar"
      ? r.taxInclusive
        ? "شامل الضريبة"
        : "الضريبة"
      : r.taxInclusive
        ? "Tax incl."
        : "Tax";
  const feeLabel = locale === "ar" ? "توصيل" : "Delivery";
  const primary = r.brand?.primary || "#1a1410";
  const accent = r.brand?.accent || "#D4A017";
  const logo = r.brand?.logoUrl
    ? `<img class="logo" src="${esc(r.brand.logoUrl)}" alt=""/>`
    : "";
  const rows = r.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.name)} ×${l.qty}</td><td class="amt">${(l.unitPrice * l.qty).toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8"/>
<title>${esc(r.code)}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    padding: 2mm;
    width: 72mm;
    color: #111;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .logo { display: block; max-height: 28mm; max-width: 40mm; margin: 0 auto 4px; object-fit: contain; }
  h1 { font-size: 15px; margin: 0 0 4px; text-align: center; font-weight: 800; color: ${esc(primary)}; }
  .bar { height: 3px; background: ${esc(accent)}; margin: 4px 0 6px; }
  .muted { color: #222; font-size: 11px; text-align: center; margin: 0 0 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 3px 0; border-bottom: 1px dashed #999; vertical-align: top; word-break: break-word; }
  td.amt { text-align: end; white-space: nowrap; width: 28%; }
  .total {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 800;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: ${esc(primary)};
  }
  .pay { margin-top: 6px; text-align: center; font-size: 11px; color: ${esc(accent)}; font-weight: 700; }
  .cut { margin-top: 10px; text-align: center; font-size: 9px; color: #666; }
  @media print {
    html, body { width: 72mm; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  ${logo}
  <h1>${esc(r.storeName)}</h1>
  <div class="bar"></div>
  <p class="muted">${codeLabel}: ${esc(r.code)}</p>
  <p class="muted">${esc(when.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB"))}</p>
  <table>${rows}</table>
  ${
    r.tax && r.tax > 0
      ? `<p class="muted">${esc(taxLabel)}: ${r.tax.toFixed(2)} ${esc(r.currency)}</p>`
      : ""
  }
  ${
    r.deliveryFee && r.deliveryFee > 0
      ? `<p class="muted">${esc(feeLabel)}: ${r.deliveryFee.toFixed(2)} ${esc(r.currency)}</p>`
      : ""
  }
  <div class="total"><span>${totalLabel}</span><span>${r.total.toFixed(2)} ${esc(r.currency)}</span></div>
  <p class="pay">${esc(r.method.toUpperCase())}</p>
  ${r.taxNumber ? `<p class="muted">${locale === "ar" ? "الرقم الضريبي" : "Tax no."}: ${esc(r.taxNumber)}</p>` : ""}
  ${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}
  <p class="cut">— ${esc(r.storeName)} —</p>
  <script>window.onload=function(){window.focus();window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=320,height=640");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export type KitchenTicketInput = {
  storeName: string;
  code: string;
  channelLabel: string;
  whereLabel: string;
  lines: { name: string; qty: number; station?: string }[];
  note?: string;
  locale?: "ar" | "en";
  dir?: "rtl" | "ltr";
  when?: Date;
  /** Client Brand Kit accents on prep ticket */
  brand?: ClientPrintBrand;
};

/** Compact kitchen / barista ticket (80mm) — client identity on paper. */
export function printKitchenTicket(t: KitchenTicketInput): void {
  if (typeof window === "undefined") return;
  const dir = t.dir || (t.locale === "ar" ? "rtl" : "ltr");
  const locale = t.locale || "ar";
  const when = t.when || new Date();
  const title = locale === "ar" ? "تذكرة تحضير" : "Prep ticket";
  const primary = t.brand?.primary || "#000";
  const logo = t.brand?.logoUrl
    ? `<img class="logo" src="${esc(t.brand.logoUrl)}" alt=""/>`
    : "";
  const rows = t.lines
    .map(
      (l) =>
        `<tr><td class="qty">${l.qty}×</td><td>${esc(l.name)}${
          l.station && l.station !== "unassigned"
            ? ` <span class="st">[${esc(l.station)}]</span>`
            : ""
        }</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8"/>
<title>${esc(t.code)} kitchen</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  body {
    margin: 0 auto; padding: 2mm; width: 72mm; color: #000;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 13px; line-height: 1.35;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .logo { display: block; max-height: 20mm; max-width: 36mm; margin: 0 auto 3px; object-fit: contain; }
  h1 { font-size: 16px; margin: 0 0 4px; text-align: center; font-weight: 900; color: ${esc(primary)}; }
  .meta { text-align: center; font-size: 11px; margin: 0 0 2px; }
  .big { font-size: 18px; font-weight: 900; text-align: center; margin: 6px 0; color: ${esc(primary)}; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 4px 0; border-bottom: 1px dashed #000; vertical-align: top; }
  td.qty { width: 18%; font-weight: 900; font-size: 15px; }
  .st { font-size: 10px; opacity: 0.7; }
  .note { margin-top: 8px; border: 1px solid #000; padding: 4px; font-size: 12px; }
  @media print { html, body { width: 72mm; } body { padding: 0; } }
</style>
</head>
<body>
  ${logo}
  <h1>${esc(title)}</h1>
  <p class="big">#${esc(t.code)}</p>
  <p class="meta">${esc(t.storeName)}</p>
  <p class="meta">${esc(t.channelLabel)} · ${esc(t.whereLabel)}</p>
  <p class="meta">${esc(when.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB"))}</p>
  <table>${rows}</table>
  ${t.note ? `<div class="note">${esc(t.note)}</div>` : ""}
  <script>window.onload=function(){window.focus();window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=320,height=640");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Download plain ESC/POS-ish text file (for bridges / testing). */
export function downloadEscPosFile(r: ThermalReceiptInput, filename?: string): void {
  if (typeof window === "undefined") return;
  const text = buildEscPosText(r);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `receipt-${r.code}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
