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

type StaffRow = {
  id: string;
  username: string;
  role: "owner" | "cashier" | "kitchen" | "barista";
  active: boolean;
};

const ROLES: StaffRow["role"][] = ["owner", "cashier", "kitchen", "barista"];

export function StaffClient() {
  const [users, setUsers] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRow["role"]>("cashier");
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState<string | null>(null);
  const [resetValues, setResetValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setUsername("");
      setPassword("");
      setMessage("User created");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: StaffRow) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    await load();
  }

  async function resetPassword(u: StaffRow) {
    setError(null);
    setMessage(null);
    const pw = (resetValues[u.id] || "").trim();
    if (pw.length < 8) {
      setError("الباسورد لازم 8 حروف على الأقل");
      return;
    }
    const res = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, password: pw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "حصلت مشكلة");
      return;
    }
    setResetValues((v) => ({ ...v, [u.id]: "" }));
    setResetOpen(null);
    setMessage(`اتغيّر باسورد ${u.username}`);
  }

  async function removeUser(u: StaffRow) {
    if (!confirm(`Delete ${u.username}?`)) return;
    setError(null);
    const res = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-8">الموظفون</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          المالك والكاشير والمطبخ والبار — كل شخص يدخل بيوزرنيم خاص.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add user</CardTitle>
          <CardDescription>Passwords are hashed on the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="staff-user">Username</Label>
              <Input
                id="staff-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                dir="ltr"
                className="text-left"
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-pass">Password</Label>
              <Input
                id="staff-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-left"
                required
                minLength={4}
              />
            </div>
            <div>
              <Label htmlFor="staff-role">Role</Label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as StaffRow["role"])
                }
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving…" : "Add user"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-black/50">Loading…</p>}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium" dir="ltr">
                {u.username}
              </p>
              <p className="text-xs text-black/45">
                {u.role}
                {!u.active ? " · inactive" : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setResetOpen(resetOpen === u.id ? null : u.id)}
            >
              تغيير الباسورد
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => toggleActive(u)}
            >
              {u.active ? "Disable" : "Enable"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => removeUser(u)}
            >
              Delete
            </Button>
            {resetOpen === u.id && (
              <div className="flex w-full flex-wrap items-center gap-2 pt-2">
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="باسورد جديد (8 حروف على الأقل)"
                  value={resetValues[u.id] || ""}
                  onChange={(e) => setResetValues((v) => ({ ...v, [u.id]: e.target.value }))}
                  className="max-w-xs"
                />
                <Button type="button" size="sm" onClick={() => resetPassword(u)}>
                  حفظ
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
