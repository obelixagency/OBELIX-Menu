"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type Tab = "suppliers" | "pos" | "books";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  openingBalance: number;
  active: boolean;
};

type Line = {
  id?: string;
  productId: string | null;
  description: string;
  qty: number;
  unitCost: number;
};

type Purchase = {
  id: string;
  supplierId: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  branchId: string;
  notes: string;
  lines: (Line & { lineTotal: number })[];
  total: number;
  createdAt: string;
  receivedAt: string | null;
};

type Balance = {
  supplier: Supplier;
  purchases: number;
  payments: number;
  balance: number;
};

const STATUS_AR: Record<Purchase["status"], string> = {
  draft: "مسودة",
  ordered: "مطلوب",
  received: "مستلم",
  cancelled: "ملغى",
};

function todayCairoYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function money(n: number, currency: string) {
  return `${Number(n || 0).toFixed(2)} ${currency}`;
}

export function PurchasingClient() {
  const today = todayCairoYmd();
  const [tab, setTab] = useState<Tab>("suppliers");
  const [currency, setCurrency] = useState("EGP");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [multiBranch, setMultiBranch] = useState(false);

  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sNotes, setSNotes] = useState("");
  const [sOpen, setSOpen] = useState("0");
  const [saving, setSaving] = useState(false);

  const [poSupplier, setPoSupplier] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poBranch, setPoBranch] = useState("");
  const [poLines, setPoLines] = useState<Line[]>([
    { productId: null, description: "", qty: 1, unitCost: 0 },
  ]);

  const [fromDay, setFromDay] = useState(shiftYmd(today, -6));
  const [toDay, setToDay] = useState(today);
  const [pnl, setPnl] = useState<{
    sales: number;
    purchasesReceived: number;
    payments: number;
    gross: number;
    orderCount: number;
  } | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [paySupplier, setPaySupplier] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const loadSuppliers = useCallback(async () => {
    const res = await fetch(withBasePath("/api/suppliers"), {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل الموردين");
    setAllSuppliers(data.suppliers || []);
  }, []);

  const loadPurchases = useCallback(async () => {
    const res = await fetch(withBasePath("/api/purchases"), {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل أوامر الشراء");
    setPurchases(data.purchases || []);
    setSuppliers(data.suppliers || []);
    setProducts(data.products || []);
    setBranches(data.branches || []);
    setMultiBranch(Boolean(data.multiBranch));
    setCurrency(data.currency || "EGP");
    if (data.defaultBranchId) {
      setPoBranch((cur) => cur || data.defaultBranchId);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    const qs = new URLSearchParams({ from: fromDay, to: toDay });
    const res = await fetch(
      withBasePath(`/api/purchasing/report?${qs}`),
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل التقرير");
    setPnl(data.pnl);
    setBalances(data.balances || []);
    setCurrency(data.currency || "EGP");
  }, [fromDay, toDay]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadSuppliers();
      await loadPurchases();
      await loadBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [loadBooks, loadPurchases, loadSuppliers]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addSupplier(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/suppliers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sName,
          phone: sPhone,
          notes: sNotes,
          openingBalance: Number(sOpen) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      setSName("");
      setSPhone("");
      setSNotes("");
      setSOpen("0");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSupplier(id: string, active: boolean) {
    setError(null);
    const res = await fetch(withBasePath("/api/suppliers"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "فشل");
    else await reload();
  }

  async function createPo(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/purchases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poSupplier,
          notes: poNotes,
          branchId: poBranch || undefined,
          lines: poLines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الأمر");
      setPoNotes("");
      setPoLines([{ productId: null, description: "", qty: 1, unitCost: 0 }]);
      await reload();
      setTab("pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function poAction(id: string, action: string, status?: string) {
    setError(null);
    const res = await fetch(withBasePath("/api/purchases"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, status }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "فشل");
    else await reload();
  }

  async function paySupplierFn(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/purchases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          supplierId: paySupplier,
          amount: Number(payAmount),
          method: "cash",
          note: payNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الدفع");
      setPayAmount("");
      setPayNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  const supplierName = (id: string) =>
    allSuppliers.find((s) => s.id === id)?.name ||
    suppliers.find((s) => s.id === id)?.name ||
    id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["suppliers", "الموردون"],
            ["pos", "أوامر الشراء"],
            ["books", "محاسبة"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-black/50">جارٍ التحميل…</p>}

      {tab === "suppliers" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مورد جديد</CardTitle>
              <CardDescription>الاسم مطلوب. الرصيد الافتتاحي اختياري.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addSupplier} className="space-y-3">
                <div>
                  <Label htmlFor="s-name">الاسم</Label>
                  <Input
                    id="s-name"
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s-phone">موبايل</Label>
                  <Input
                    id="s-phone"
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    dir="ltr"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s-open">رصيد افتتاحي</Label>
                  <Input
                    id="s-open"
                    type="number"
                    step="0.01"
                    value={sOpen}
                    onChange={(e) => setSOpen(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s-notes">ملاحظات</Label>
                  <Input
                    id="s-notes"
                    value={sNotes}
                    onChange={(e) => setSNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "جارٍ الحفظ…" : "حفظ المورد"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">القائمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allSuppliers.length === 0 && (
                <p className="text-sm text-black/45">لا يوجد موردون بعد.</p>
              )}
              {allSuppliers.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-black/45">
                      {s.phone || "بدون موبايل"}
                      {s.openingBalance
                        ? ` · افتتاحي ${money(s.openingBalance, currency)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toggleSupplier(s.id, !s.active)}
                  >
                    {s.active ? "إيقاف" : "تفعيل"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "pos" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">أمر شراء جديد</CardTitle>
              <CardDescription>
                اربط سطراً بصنف منيو أو اكتب وصفاً حرّاً (مكوّن). الاستلام يزيد مخزون أصناف المنيو فقط.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPo} className="space-y-3">
                <div>
                  <Label>المورد</Label>
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3"
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    required
                  >
                    <option value="">— اختر —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {multiBranch && branches.length > 0 && (
                  <div>
                    <Label>الفرع</Label>
                    <select
                      className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3"
                      value={poBranch}
                      onChange={(e) => setPoBranch(e.target.value)}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {poLines.map((line, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-md border border-black/10 p-3 sm:grid-cols-2"
                  >
                    <div className="sm:col-span-2">
                      <Label>صنف منيو (اختياري)</Label>
                      <select
                        className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3"
                        value={line.productId || ""}
                        onChange={(e) => {
                          const next = [...poLines];
                          const id = e.target.value || null;
                          const p = products.find((x) => x.id === id);
                          next[i] = {
                            ...next[i],
                            productId: id,
                            description: p?.name || next[i].description,
                          };
                          setPoLines(next);
                        }}
                      >
                        <option value="">— وصف حر —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>الوصف</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => {
                          const next = [...poLines];
                          next[i] = { ...next[i], description: e.target.value };
                          setPoLines(next);
                        }}
                        className="mt-1"
                        required={!line.productId}
                      />
                    </div>
                    <div>
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={line.qty}
                        onChange={(e) => {
                          const next = [...poLines];
                          next[i] = {
                            ...next[i],
                            qty: Number(e.target.value) || 0,
                          };
                          setPoLines(next);
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>تكلفة الوحدة</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => {
                          const next = [...poLines];
                          next[i] = {
                            ...next[i],
                            unitCost: Number(e.target.value) || 0,
                          };
                          setPoLines(next);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPoLines([
                      ...poLines,
                      { productId: null, description: "", qty: 1, unitCost: 0 },
                    ])
                  }
                >
                  + سطر
                </Button>
                <div>
                  <Label>ملاحظات</Label>
                  <Input
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={saving || !poSupplier}>
                  {saving ? "جارٍ الحفظ…" : "حفظ كمسودة"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">السجل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {purchases.length === 0 && (
                <p className="text-sm text-black/45">لا أوامر شراء بعد.</p>
              )}
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="space-y-2 rounded-md border border-black/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{supplierName(p.supplierId)}</p>
                      <p className="text-xs text-black/45">
                        {STATUS_AR[p.status]} · {money(p.total, currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.status === "draft" && (
                        <>
                          <Button
                            type="button"
                            onClick={() => poAction(p.id, "status", "ordered")}
                          >
                            طلب
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => poAction(p.id, "status", "cancelled")}
                          >
                            إلغاء
                          </Button>
                        </>
                      )}
                      {p.status === "ordered" && (
                        <>
                          <Button
                            type="button"
                            onClick={() => poAction(p.id, "receive")}
                          >
                            استلام
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => poAction(p.id, "status", "cancelled")}
                          >
                            إلغاء
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="text-xs text-black/60">
                    {p.lines.map((l) => (
                      <li key={l.id || l.description}>
                        {l.description} × {l.qty} @ {l.unitCost}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "books" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مبيعات مقابل مشتريات</CardTitle>
              <CardDescription>
                المبيعات من الطلبات غير الملغاة. المشتريات = أوامر مستلمة في الفترة (تكلفة الاستلام، مش ERP كامل).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label>من</Label>
                  <Input
                    type="date"
                    value={fromDay}
                    onChange={(e) => setFromDay(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>إلى</Label>
                  <Input
                    type="date"
                    value={toDay}
                    onChange={(e) => setToDay(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="button" onClick={() => void loadBooks()}>
                  تحديث
                </Button>
              </div>
              {pnl && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="مبيعات" value={money(pnl.sales, currency)} />
                  <Stat
                    label="مشتريات مستلمة"
                    value={money(pnl.purchasesReceived, currency)}
                  />
                  <Stat
                    label="مدفوعات موردين"
                    value={money(pnl.payments, currency)}
                  />
                  <Stat
                    label="الفرق (مبيعات − مشتريات)"
                    value={money(pnl.gross, currency)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">أرصدة الموردين</CardTitle>
              <CardDescription>
                افتتاحي + أوامر مطلوبة/مستلمة − مدفوعات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {balances.length === 0 && (
                <p className="text-sm text-black/45">لا أرصدة بعد.</p>
              )}
              {balances.map((b) => (
                <div
                  key={b.supplier.id}
                  className="flex flex-wrap justify-between gap-2 rounded-md border border-black/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{b.supplier.name}</span>
                  <span>
                    مستحق {money(b.balance, currency)} · مشتريات{" "}
                    {money(b.purchases, currency)} · مدفوع{" "}
                    {money(b.payments, currency)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">دفعة لمورد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={paySupplierFn} className="space-y-3">
                <select
                  className="h-11 w-full rounded-md border border-black/15 bg-white px-3"
                  value={paySupplier}
                  onChange={(e) => setPaySupplier(e.target.value)}
                  required
                >
                  <option value="">— مورد —</option>
                  {allSuppliers
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="المبلغ"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                <Input
                  placeholder="ملاحظة"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
                <Button type="submit" disabled={saving}>
                  تسجيل الدفعة
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <p className="text-xs text-black/45">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
