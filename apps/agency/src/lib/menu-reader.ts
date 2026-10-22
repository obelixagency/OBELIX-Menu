// Reads a restaurant/cafe menu (photos or PDF) with Gemini and returns rows in the
// OBELIX import-sheet format. Server-only. Needs GEMINI_API_KEY in the agency .env.
//
// Only public menu content (item names, prices, descriptions) is sent — never
// client accounts, customers or orders.

export type MenuRow = {
  parent?: string;
  category?: string;
  categoryEn?: string;
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price?: number | null;
};

export const READER_LIMITS = {
  maxFiles: 10,
  maxTotalBytes: 18 * 1024 * 1024, // Gemini inline-data request limit is ~20MB
  mimes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
};

/** Tried in order; the first model the key can use wins. GEMINI_MODEL goes first. */
function modelCandidates(): string[] {
  const list = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ].filter(Boolean) as string[];
  return [...new Set(list)];
}

const PROMPT = (translate: boolean) => `You are reading a restaurant or cafe menu from the attached photos/PDF pages.
Extract EVERY sellable item exactly once, in the order it appears.

Rules:
- "category" = the section the item is under (e.g. "مشروبات ساخنة"). If the menu has a bigger section above it (e.g. "مشروبات"), put that in "parent"; otherwise leave parent empty.
- Keep Arabic text exactly as written (fix only obvious OCR spacing). Put Arabic in name/category/description and English in nameEn/categoryEn/descriptionEn.
- ${translate ? "If an English (or Arabic) name is missing, translate it naturally (menu style, not literal)." : "Do NOT translate. Leave a language empty if the menu doesn't show it."}
- If the menu is only in English, put the English text in BOTH name and nameEn${translate ? " and translate name to Arabic" : ""}.
- price: a plain number in the menu's currency (convert Arabic digits). If an item has several sizes/prices, output one row per size and add the size to the names, e.g. "لاتيه (كبير)" / "Latte (Large)". If no price is visible, use null.
- Ignore phone numbers, addresses, slogans, taxes/service notes and page headers.
- Never invent items that are not on the menu.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          parent: { type: "STRING" },
          category: { type: "STRING" },
          categoryEn: { type: "STRING" },
          name: { type: "STRING" },
          nameEn: { type: "STRING" },
          description: { type: "STRING" },
          descriptionEn: { type: "STRING" },
          price: { type: "NUMBER", nullable: true },
        },
        required: ["category", "name", "price"],
      },
    },
  },
  required: ["items"],
};

export class MenuReaderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function readMenuWithGemini(
  files: { mime: string; data: Buffer }[],
  opts: { translate?: boolean } = {}
): Promise<{ rows: MenuRow[]; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new MenuReaderError(
      "مفتاح Gemini مش متحط على السيرفر. ضيف GEMINI_API_KEY في ملف .env بتاع الوكالة واعمل ريستارت.",
      503
    );
  }
  const base = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT(Boolean(opts.translate)) },
          ...files.map((f) => ({ inline_data: { mime_type: f.mime, data: f.data.toString("base64") } })),
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  };

  let lastErr = "";
  for (const model of modelCandidates()) {
    const res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(170_000),
    }).catch((e) => {
      throw new MenuReaderError(`مش قادرين نوصل لـ Gemini: ${e instanceof Error ? e.message : e}`, 502);
    });
    const text = await res.text();
    if (res.status === 404 || (res.status === 400 && /not found|not supported|unknown model/i.test(text))) {
      lastErr = `${model}: ${res.status}`;
      continue; // try the next model name
    }
    if (res.status === 401 || res.status === 403) {
      throw new MenuReaderError("مفتاح Gemini مرفوض — اتأكد إنه صح ومفعّل.", 502);
    }
    if (res.status === 429) throw new MenuReaderError("Gemini عليه ضغط أو الحصة خلصت — جرّب كمان دقيقة.", 429);
    if (!res.ok) throw new MenuReaderError(`Gemini رجّع خطأ ${res.status}`, 502);

    let parsed: { items?: MenuRow[] } = {};
    try {
      const json = JSON.parse(text);
      const out = (json.candidates?.[0]?.content?.parts || [])
        .map((p: { text?: string }) => p.text || "")
        .join("");
      parsed = JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      throw new MenuReaderError("Gemini رجّع رد مش مفهوم — جرّب صور أوضح.", 502);
    }
    const rows = (parsed.items || [])
      .map((r) => ({
        parent: str(r.parent),
        category: str(r.category),
        categoryEn: str(r.categoryEn),
        name: str(r.name),
        nameEn: str(r.nameEn),
        description: str(r.description),
        descriptionEn: str(r.descriptionEn),
        price: typeof r.price === "number" && Number.isFinite(r.price) ? r.price : null,
      }))
      .filter((r) => r.name || r.nameEn);
    return { rows, model };
  }
  throw new MenuReaderError(`مفيش موديل Gemini متاح للمفتاح ده (${lastErr}). حط اسم الموديل في GEMINI_MODEL.`, 502);
}

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 300) : "");
