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
  return [
    r.storeName,
    sep,
    `Code: ${r.code}`,
    when.toLocaleString(locale),
    sep,
    lines,
    sep,
    `TOTAL: ${r.total.toFixed(2)} ${r.currency}`,
    `Pay: ${r.method.toUpperCase()}`,
    r.note ? `Note: ${r.note}` : "",
    sep,
    "Powered by OBELIX",
    "\n\n\n",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Open a print window sized for 80mm thermal paper. */
export function printThermalReceipt(r: ThermalReceiptInput): void {
  if (typeof window === "undefined") return;
  const dir = r.dir || (r.locale === "ar" ? "rtl" : "ltr");
  const locale = r.locale || "en";
  const when = r.when || new Date();
  const codeLabel = locale === "ar" ? "الكود" : "Code";
  const totalLabel = locale === "ar" ? "الإجمالي" : "Total";
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
    color: #000;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { font-size: 15px; margin: 0 0 4px; text-align: center; font-weight: 800; }
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
  }
  .pay { margin-top: 6px; text-align: center; font-size: 11px; }
  .cut { margin-top: 10px; text-align: center; font-size: 10px; color: #444; }
  @media print {
    html, body { width: 72mm; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <h1>${esc(r.storeName)}</h1>
  <p class="muted">${codeLabel}: ${esc(r.code)}</p>
  <p class="muted">${esc(when.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB"))}</p>
  <table>${rows}</table>
  <div class="total"><span>${totalLabel}</span><span>${r.total.toFixed(2)} ${esc(r.currency)}</span></div>
  <p class="pay">${esc(r.method.toUpperCase())}</p>
  ${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}
  <p class="cut">— OBELIX —</p>
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
