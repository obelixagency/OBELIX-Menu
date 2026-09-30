export type AgencyLocale = "en" | "ar";

export const AGENCY_LANG_COOKIE = "obelix_agency_lang";
export const DEFAULT_AGENCY_LOCALE: AgencyLocale = "en";

export const dictionaries = {
  en: {
    meta: {
      title: "OBELIX Menu — Agency Dashboard",
      description: "Multi-client menu generation with Brand Kit — OBELIX Menu",
    },
    header: {
      tagline: "Agency dashboard · menu generation",
      clients: "Clients",
      newClient: "New client",
      logout: "Log out",
      loggingOut: "Signing out…",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      langEn: "EN",
      langAr: "ع",
      switchToEn: "Switch to English",
      switchToAr: "Switch to Arabic",
    },
    login: {
      subtitle: "Agency dashboard sign-in",
      username: "Username",
      password: "Password",
      show: "Show",
      hide: "Hide",
      submit: "Sign in",
      submitting: "Signing in…",
      failed: "Sign-in failed",
      error: "Something went wrong",
    },
    home: {
      title: "Clients",
      subtitle:
        "Each client = a menu package + dashboard ready to deploy on its own domain",
      create: "Create client",
      loading: "Loading…",
      loadError: "Could not load clients",
      emptyTitle: "No clients yet",
      emptyDesc:
        "Start by creating a client with logo and colors, then export the package.",
      createFirst: "Create first client",
      lastExport: "Last export",
      neverExported: "Not exported yet",
    },
    newClient: {
      title: "New client + Brand Kit",
      subtitle:
        "Name, slug, logo, and colors — then generate the package from the client page.",
      name: "Client name",
      namePlaceholder: "e.g. House Coffee",
      slug: "Slug (subdomain / folder)",
      domain: "Target domain",
      logo: "Logo",
      background: "Public menu background (optional)",
      backgroundHint:
        "Full-bleed image behind the menu — with a readable overlay on mobile and desktop.",
      primary: "Primary",
      accent: "Accent",
      surface: "Surface",
      preview: "Quick preview",
      previewName: "Client name",
      previewBadge: "Featured",
      languages: "Public menu language",
      languagesAr: "Arabic only",
      languagesEn: "English only",
      languagesBoth: "Arabic + English (toggle on menu)",
      languagesHint:
        "Controls name/description fields in the client dashboard and the public menu language switch.",
      currency: "Currency",
      currencyCustom: "Other…",
      password: "Client dashboard password",
      save: "Save client",
      saving: "Saving…",
      cancel: "Cancel",
      createFailed: "Could not create client",
      logoFailed: "Logo upload failed",
      bgFailed: "Background upload failed",
      unexpected: "Unexpected error",
    },
    clientDetail: {
      back: "Back to clients",
      loading: "Loading…",
      loadError: "Could not load",
      menuLanguage: "Menu language",
      langAr: "Arabic only",
      langEn: "English only",
      langBoth: "Arabic + English",
      currency: "Currency",
      dashPassword: "Dashboard password",
      font: "Font",
      lastExport: "Last export",
      packagePath: "Package path",
      bgTitle: "Public menu background",
      bgHint:
        "Optional — exported with the package. Without an image, Brand Kit surface color is used.",
      uploading: "Uploading…",
      saveFlags: "Save ordering features",
      savingFlags: "Saving features…",
      export: "Generate / export package",
      exporting: "Generating…",
      downloadZip: "Download ZIP",
      flagsSaved:
        "Ordering features saved — re-export the package to apply on the client",
      bgUpdated:
        "Menu background updated — re-export to include it in the package",
      saveFailed: "Save failed",
      exportFailed: "Export failed",
      bgFailed: "Background upload failed",
      afterExport: "After export",
      after1a: "Copy the folder",
      after1b: "or download the ZIP.",
      after2a: "Upload it to the client host and point the domain (",
      after2b: ").",
      after3a: "Run",
      after3b: "or",
      after4a: "Menu at",
      after4b: ", dashboard at",
    },
    ordering: {
      title: "Ordering features — what the client buys",
      hintBefore: "After changes: save, then re-export the package. On the live server keep",
      hintAfter: "(tables/orders).",
      flags: {
        orderFromMenu: {
          label: "Order from menu (master)",
          hint: "When off, no ordering UI — no table or delivery",
        },
        tableOrderingEnabled: {
          label: "Table / dine-in ordering",
          hint: "Guest picks a table from the owner’s list",
        },
        deliveryEnabled: {
          label: "Delivery",
          hint: "Guest enters phone + address — pay on delivery",
        },
        zonesIndoorOutdoor: {
          label: "Indoor / outdoor zones",
          hint: "Only shown with table ordering",
        },
        cashierScreen: {
          label: "Cashier screen",
          hint: "Route /cashier + sound alert",
        },
        kitchenScreen: {
          label: "Kitchen screen",
          hint: "Route /kitchen — items routed by category",
        },
        baristaScreen: {
          label: "Barista screen",
          hint: "Route /bar — items routed by category",
        },
        posEnabled: {
          label: "POS (cashier sell)",
          hint: "Full POS at /pos on the client package — uses that client’s logo, colors, and menu language (ar/en/both). Requires master ON.",
        },
        staffAccountsEnabled: {
          label: "Staff accounts",
          hint: "Multi-user login on the client (owner / cashier / kitchen / barista). When off, one shared password.",
        },
        inventoryEnabled: {
          label: "Inventory",
          hint: "Track stock per product; deduct on menu and POS orders; low-stock alerts for the owner.",
        },
        multiBranchEnabled: {
          label: "Multi-branch",
          hint: "Shared menu catalog with per-branch stock and optional price overrides. Manage branches on the client dashboard.",
        },
      },
    },
  },
  ar: {
    meta: {
      title: "OBELIX Menu — داشبورد الوكالة",
      description: "توليد منيوهات متعددة العملاء مع Brand Kit — OBELIX Menu",
    },
    header: {
      tagline: "داشبورد الوكالة · توليد منيوهات",
      clients: "العملاء",
      newClient: "عميل جديد",
      logout: "خروج",
      loggingOut: "جاري الخروج…",
      openMenu: "فتح القائمة",
      closeMenu: "إغلاق القائمة",
      langEn: "EN",
      langAr: "ع",
      switchToEn: "التبديل إلى الإنجليزية",
      switchToAr: "التبديل إلى العربية",
    },
    login: {
      subtitle: "دخول داشبورد الوكالة",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      show: "إظهار",
      hide: "إخفاء",
      submit: "دخول",
      submitting: "جاري الدخول…",
      failed: "فشل الدخول",
      error: "خطأ",
    },
    home: {
      title: "العملاء",
      subtitle:
        "كل عميل = حزمة منيو + داشبورد قابلة للرفع على دومين منفصل",
      create: "إنشاء عميل",
      loading: "جاري التحميل…",
      loadError: "تعذّر تحميل العملاء",
      emptyTitle: "لا يوجد عملاء بعد",
      emptyDesc:
        "ابدأ بإنشاء أول عميل مع اللوجو والألوان، ثم صدّر الحزمة.",
      createFirst: "إنشاء أول عميل",
      lastExport: "آخر تصدير",
      neverExported: "لم يُصدَّر بعد",
    },
    newClient: {
      title: "عميل جديد + Brand Kit",
      subtitle:
        "الاسم، الـ slug، اللوجو، والألوان — ثم تولّد الحزمة من صفحة العميل.",
      name: "اسم العميل",
      namePlaceholder: "مثال: قهوة البيت",
      slug: "Slug (دومين فرعي / مجلد)",
      domain: "الدومين المستهدف",
      logo: "اللوجو",
      background: "خلفية المنيو العام (اختياري)",
      backgroundHint:
        "صورة كاملة العرض خلف المنيو — مع طبقة شفافة للقراءة على الموبايل والكمبيوتر.",
      primary: "أساسي",
      accent: "تمييز",
      surface: "سطح",
      preview: "معاينة سريعة",
      previewName: "اسم العميل",
      previewBadge: "مميز",
      languages: "لغة المنيو العام",
      languagesAr: "عربي فقط",
      languagesEn: "English only",
      languagesBoth: "عربي + English (تبديل في المنيو)",
      languagesHint:
        "يحدد حقول الأسماء/الأوصاف في داشبورد العميل وتبديل اللغة في المنيو العام.",
      currency: "العملة",
      currencyCustom: "أخرى / Other…",
      password: "كلمة مرور داشبورد العميل",
      save: "حفظ العميل",
      saving: "جاري الحفظ…",
      cancel: "إلغاء",
      createFailed: "فشل الإنشاء",
      logoFailed: "فشل رفع اللوجو",
      bgFailed: "فشل رفع خلفية المنيو",
      unexpected: "خطأ غير متوقع",
    },
    clientDetail: {
      back: "العودة للعملاء",
      loading: "جاري التحميل…",
      loadError: "تعذّر التحميل",
      menuLanguage: "لغة المنيو",
      langAr: "عربي فقط",
      langEn: "English only",
      langBoth: "عربي + English",
      currency: "العملة",
      dashPassword: "كلمة مرور الداشبورد",
      font: "الخط",
      lastExport: "آخر تصدير",
      packagePath: "مسار الحزمة",
      bgTitle: "خلفية المنيو العام",
      bgHint:
        "اختياري — تُصدَّر مع الحزمة. بدون صورة يُستخدم لون السطح من Brand Kit.",
      uploading: "جاري الرفع…",
      saveFlags: "حفظ ميزات الطلب",
      savingFlags: "جاري حفظ الميزات…",
      export: "توليد / تصدير الحزمة",
      exporting: "جاري التوليد…",
      downloadZip: "تحميل ZIP",
      flagsSaved:
        "تم حفظ ميزات الطلب — أعد تصدير الحزمة لتطبيقها على العميل",
      bgUpdated:
        "تم تحديث خلفية المنيو — أعد التصدير لتضمينها في الحزمة",
      saveFailed: "فشل الحفظ",
      exportFailed: "فشل التصدير",
      bgFailed: "فشل رفع الخلفية",
      afterExport: "بعد التصدير",
      after1a: "انسخ مجلد",
      after1b: "أو حمّل الـ ZIP.",
      after2a: "ارفعه على هوست العميل ونِشّط الدومين (",
      after2b: ").",
      after3a: "شغّل",
      after3b: "أو",
      after4a: "المنيو على",
      after4b: "، الداشبورد على",
    },
    ordering: {
      title: "ميزات الطلب — ما يشتريه العميل",
      hintBefore:
        "بعد التعديل: احفظ ثم أعد تصدير الحزمة. على السيرفر الحي احتفظ بملف",
      hintAfter: "(طاولات/طلبات).",
      flags: {
        orderFromMenu: {
          label: "الطلب من المنيو (ماستر)",
          hint: "لو مطفّى مفيش أي واجهة طلب — لا طاولة ولا دليفري",
        },
        tableOrderingEnabled: {
          label: "طلب الطاولة / داين-إن",
          hint: "الزائر يختار طاولة من قائمة المالك",
        },
        deliveryEnabled: {
          label: "التوصيل",
          hint: "الزائر يدخل موبايل + عنوان — الدفع عند الاستلام",
        },
        zonesIndoorOutdoor: {
          label: "مناطق داخلي / خارجي",
          hint: "يظهر فقط مع طلب الطاولة",
        },
        cashierScreen: {
          label: "شاشة الكاشير",
          hint: "مسار /cashier + تنبيه صوتي",
        },
        kitchenScreen: {
          label: "شاشة المطبخ",
          hint: "مسار /kitchen — أصناف موجّهة للمطبخ حسب الفئة",
        },
        baristaScreen: {
          label: "شاشة الباريستا",
          hint: "مسار /bar — أصناف موجّهة للبار حسب الفئة",
        },
        posEnabled: {
          label: "POS (بيع الكاشير)",
          hint: "شاشة /pos على حزمة العميل — لوجو وألوان ولغة المنيو (عربي/إنجليزي/الاتنين). يشترط الماستر.",
        },
        staffAccountsEnabled: {
          label: "حسابات الفريق",
          hint: "دخول متعدد على العميل (مالك / كاشير / مطبخ / بار). لو مطفّى يبقى باسورد واحد.",
        },
        inventoryEnabled: {
          label: "المخازن",
          hint: "تتبع كمية كل صنف؛ خصم عند طلب المنيو والـ POS؛ تنبيه نقص للمالك.",
        },
        multiBranchEnabled: {
          label: "فروع متعددة",
          hint: "منيو مشترك مع مخزون وسعر اختياري لكل فرع. إدارة الفروع من داشبورد العميل.",
        },
      },
    },
  },
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? DeepStringify<T[K]>
      : T[K];
};

export type AgencyDictionary = DeepStringify<(typeof dictionaries)["en"]>;

export function isAgencyLocale(value: unknown): value is AgencyLocale {
  return value === "en" || value === "ar";
}

export function dirForLocale(locale: AgencyLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function parseAgencyLocale(value: string | undefined | null): AgencyLocale {
  if (isAgencyLocale(value)) return value;
  return DEFAULT_AGENCY_LOCALE;
}

export function getDictionary(locale: AgencyLocale): AgencyDictionary {
  return dictionaries[locale] as AgencyDictionary;
}
