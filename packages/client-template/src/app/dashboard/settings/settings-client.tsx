"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withBasePath } from "@/lib/base-path";

export default function SettingsClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState("EGP");
  const [slogan, setSlogan] = useState("");
  const [sloganEn, setSloganEn] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertOnDelivery, setAlertOnDelivery] = useState(true);
  const [alertOnDineIn, setAlertOnDineIn] = useState(false);
  const [alertOnPos, setAlertOnPos] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [callMeBotApiKey, setCallMeBotApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [payEnabled, setPayEnabled] = useState(false);
  const [payProvider, setPayProvider] = useState("none");
  const [paySaving, setPaySaving] = useState(false);
  const [taxPercent, setTaxPercent] = useState("0");
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [taxNumber, setTaxNumber] = useState("");
  const [loyaltyOn, setLoyaltyOn] = useState(false);
  const [stampsFor, setStampsFor] = useState("10");
  const [seasonalNote, setSeasonalNote] = useState("");
  const [seasonalNoteEn, setSeasonalNoteEn] = useState("");
  const [alertOnPickup, setAlertOnPickup] = useState(true);
  const [commerceSaving, setCommerceSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(withBasePath("/api/brand")).then((r) => r.json()),
      fetch(withBasePath("/api/ordering/config")).then((r) => r.json()),
    ]).then(([brandData, cfg]) => {
      setEmail(brandData.brand?.notificationEmail || "");
      setBgUrl(brandData.brand?.menuBackgroundUrl || null);
      setCurrency(brandData.brand?.currency || "EGP");
      setSlogan(brandData.brand?.slogan || "");
      setSloganEn(brandData.brand?.sloganEn || "");
      setTaxPercent(String(brandData.brand?.taxPercent || 0));
      setTaxInclusive(brandData.brand?.taxInclusive !== false);
      setTaxNumber(brandData.brand?.taxNumber || "");
      setLoyaltyOn(Boolean(cfg.settings?.loyaltyEnabled));
      setStampsFor(String(cfg.settings?.stampsForReward || 10));
      setSeasonalNote(cfg.settings?.seasonalNote || "");
      setSeasonalNoteEn(cfg.settings?.seasonalNoteEn || "");
      const a = cfg.settings?.alerts;
      if (a) {
        setAlertOnDelivery(a.alertOnDelivery !== false);
        setAlertOnDineIn(Boolean(a.alertOnDineIn));
        setAlertOnPos(Boolean(a.alertOnPos));
        setAlertOnPickup(a.alertOnPickup !== false);
        setWhatsappPhone(a.whatsappPhone || "");
        setCallMeBotApiKey(a.callMeBotApiKey || "");
        setWebhookUrl(a.webhookUrl || "");
      }
      const pay = brandData.brand?.extensions?.payments;
      if (pay) {
        setPayEnabled(Boolean(pay.enabled));
        setPayProvider(pay.provider || "none");
      }
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(withBasePath("/api/brand"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationEmail: email,
          menuBackgroundUrl: bgUrl,
          slogan,
          sloganEn,
          taxPercent: Number(taxPercent) || 0,
          taxInclusive,
          taxNumber,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "فشل");
      setMsg("تم الحفظ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function saveAlerts(e: FormEvent) {
    e.preventDefault();
    setAlertSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(withBasePath("/api/ordering/config"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts: {
            alertOnDelivery,
            alertOnDineIn,
            alertOnPos,
            alertOnPickup,
            whatsappPhone,
            callMeBotApiKey,
            webhookUrl,
          },
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "فشل");
      setMsg("تم حفظ تنبيهات الطلبات");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setAlertSaving(false);
    }
  }

  async function savePayments(e: FormEvent) {
    e.preventDefault();
    setPaySaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(withBasePath("/api/brand"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: {
            enabled: payEnabled,
            provider: payProvider,
          },
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "فشل");
      setMsg("تم حفظ إعدادات الدفع (بدون تفعيل بوابة بعد)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setPaySaving(false);
    }
  }

  async function saveCommerce(e: FormEvent) {
    e.preventDefault();
    setCommerceSaving(true);
    setError(null);
    setMsg(null);
    try {
      const brandRes = await fetch(withBasePath("/api/brand"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxPercent: Number(taxPercent) || 0,
          taxInclusive,
          taxNumber,
        }),
      });
      const brandData = await brandRes.json();
      if (brandRes.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!brandRes.ok) throw new Error(brandData.error || "فشل الضريبة");
      const cfgRes = await fetch(withBasePath("/api/ordering/config"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyEnabled: loyaltyOn,
          stampsForReward: Number(stampsFor) || 10,
          seasonalNote,
          seasonalNoteEn,
        }),
      });
      const cfgData = await cfgRes.json();
      if (!cfgRes.ok) throw new Error(cfgData.error || "فشل الولاء / الموسم");
      setMsg("تم حفظ الضريبة والولاء والملاحظة الموسمية");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setCommerceSaving(false);
    }
  }

  async function onBgUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(withBasePath("/api/upload"), {
        method: "POST",
        body: fd,
      });
      const upData = await up.json();
      if (up.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!up.ok) throw new Error(upData.error || "فشل الرفع");
      setBgUrl(upData.url);
      await fetch(withBasePath("/api/brand"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuBackgroundUrl: upData.url }),
      });
      setMsg("تم تحديث خلفية المنيو");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold leading-8">الإعدادات</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">شعار المنيو</CardTitle>
          <CardDescription>
            يظهر تحت اسم المكان عندما لا يوجد بانر عروض.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="slogan">سطر عربي</Label>
            <Input
              id="slogan"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="اطلب من الموبايل"
            />
          </div>
          <div>
            <Label htmlFor="sloganEn">English line</Label>
            <Input
              id="sloganEn"
              value={sloganEn}
              onChange={(e) => setSloganEn(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void save({ preventDefault() {} } as FormEvent)}>
              حفظ الشعار
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ضريبة · ولاء · ملاحظة موسمية</CardTitle>
          <CardDescription>
            تظهر الضريبة على المنيو والإيصال. أختام الولاء تُحتسب من رقم الموبايل
            في التوصيل أو الاستلام. الملاحظة الموسمية سطر أعلى المنيو (رمضان /
            عرض محدود).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveCommerce} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="taxp">نسبة الضريبة %</Label>
              <Input
                id="taxp"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div>
              <Label htmlFor="taxn">الرقم الضريبي (إيصال)</Label>
              <Input
                id="taxn"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="VAT / TRN"
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
              />
              الأسعار شاملة الضريبة (VAT inclusive)
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={loyaltyOn}
                onChange={(e) => setLoyaltyOn(e.target.checked)}
              />
              تفعيل أختام الولاء (ختم لكل طلب توصيل/استلام)
            </label>
            <div>
              <Label htmlFor="stamps">أختام للهديّة</Label>
              <Input
                id="stamps"
                type="number"
                min="2"
                max="50"
                value={stampsFor}
                onChange={(e) => setStampsFor(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="season">ملاحظة موسمية (عربي)</Label>
              <Input
                id="season"
                value={seasonalNote}
                onChange={(e) => setSeasonalNote(e.target.value)}
                placeholder="عرض رمضان حتى نهاية الشهر"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="seasonEn">Seasonal note (EN)</Label>
              <Input
                id="seasonEn"
                value={seasonalNoteEn}
                onChange={(e) => setSeasonalNoteEn(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={commerceSaving}>
                {commerceSaving ? "…" : "حفظ الضريبة والولاء"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تنبيهات الطلبات (واتساب)</CardTitle>
          <CardDescription>
            عند طلب توصيل جديد: إرسال رسالة واتساب عبر CallMeBot و/أو Webhook
            (n8n / Make). من غير مفتاح CallMeBot تقدر تفتح واتساب يدوي من شاشة
            الكاشير.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveAlerts} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alertOnDelivery}
                onChange={(e) => setAlertOnDelivery(e.target.checked)}
              />
              تنبيه عند طلب توصيل
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alertOnDineIn}
                onChange={(e) => setAlertOnDineIn(e.target.checked)}
              />
              تنبيه عند طلب طاولة من المنيو
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alertOnPos}
                onChange={(e) => setAlertOnPos(e.target.checked)}
              />
              تنبيه عند إقفال تذكرة من الـ POS
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alertOnPickup}
                onChange={(e) => setAlertOnPickup(e.target.checked)}
              />
              تنبيه عند طلب استلام من الفرع
            </label>
            <div>
              <Label htmlFor="wa">رقم واتساب المطعم</Label>
              <Input
                id="wa"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="2010xxxxxxxx"
              />
              <p className="mt-1 text-[11px] text-black/45">
                صيغة دولية بدون + (مصر: 20 ثم الرقم بدون صفر)
              </p>
            </div>
            <div>
              <Label htmlFor="cmb">مفتاح CallMeBot (اختياري)</Label>
              <Input
                id="cmb"
                value={callMeBotApiKey}
                onChange={(e) => setCallMeBotApiKey(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="apikey"
              />
              <p className="mt-1 text-[11px] text-black/45">
                من callmebot.com — بعد تفعيل البوت على رقمك يوصل التنبيه تلقائي
              </p>
            </div>
            <div>
              <Label htmlFor="hook">Webhook URL (اختياري)</Label>
              <Input
                id="hook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="https://hooks.example.com/obelix-order"
              />
            </div>
            <Button type="submit" disabled={alertSaving}>
              {alertSaving ? "…" : "حفظ التنبيهات"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الدفع الأونلاين (جاهز للربط)</CardTitle>
          <CardDescription>
            من غير ربط ببوابة دلوقتي. اختار المزود المفضّل للعميل لاحقًا
            (Paymob / Fawry / Stripe / مخصص) وهنوصل المفاتيح لما يشترك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePayments} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payEnabled}
                onChange={(e) => setPayEnabled(e.target.checked)}
              />
              تفعيل خانة الدفع الأونلاين لهذا العميل (بدون تحصيل فعلي بعد)
            </label>
            <div>
              <Label htmlFor="prov">المزود المتوقع</Label>
              <select
                id="prov"
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
                value={payProvider}
                onChange={(e) => setPayProvider(e.target.value)}
              >
                <option value="none">لم يُحدد</option>
                <option value="paymob">Paymob</option>
                <option value="fawry">Fawry</option>
                <option value="tap">Tap (خليج)</option>
                <option value="moyasar">Moyasar (سعودية)</option>
                <option value="stripe">Stripe</option>
                <option value="custom">مخصص / أخرى</option>
              </select>
            </div>
            <p className="text-[11px] text-black/45">
              الكود جاهز بواجهة موحّدة — التحصيل الفعلي يتفعل بعد المفاتيح حسب
              اختيار العميل.
            </p>
            <Button type="submit" disabled={paySaving}>
              {paySaving ? "…" : "حفظ الدفع"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إيميل إشعارات Rate Form</CardTitle>
          <CardDescription>
            يُرسل كل تقييم جديد لهذا العنوان إن وُجدت إعدادات SMTP / Resend على
            السيرفر. بدونها تُحفظ التقييمات في لوحة التحكم فقط.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label htmlFor="email">البريد</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="owner@cafe.com"
              />
            </div>
            <p className="text-xs text-black/45">
              العملة الحالية من الوكالة: <strong dir="ltr">{currency}</strong>
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? "…" : "حفظ"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">خلفية المنيو</CardTitle>
          <CardDescription>
            اختياري — صورة خلفية كاملة مع طبقة شفافة للقراءة. اتركها فارغة لاستخدام
            لون السطح من البراند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bgUrl}
              alt=""
              className="aspect-video w-full max-w-md rounded-lg object-cover"
            />
          )}
          <Input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onBgUpload(f);
            }}
          />
          {bgUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setBgUrl(null);
                await fetch(withBasePath("/api/brand"), {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ menuBackgroundUrl: null }),
                });
                setMsg("أُزيلت الخلفية");
              }}
            >
              إزالة الخلفية
            </Button>
          )}
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
