import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ClientRecord, CreateClientInput, OrderingFeatures } from "./types";
import { normalizeOrderingFeatures } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CLIENTS_FILE = path.join(DATA_DIR, "clients.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(CLIENTS_FILE);
  } catch {
    await fs.writeFile(CLIENTS_FILE, "[]", "utf8");
  }
}

export async function listClients(): Promise<ClientRecord[]> {
  await ensureDataFiles();
  const raw = await fs.readFile(CLIENTS_FILE, "utf8");
  const clients = (JSON.parse(raw) as ClientRecord[]).map((c) => ({
    ...c,
    languages:
      c.languages === "ar" || c.languages === "en" || c.languages === "both"
        ? c.languages
        : ("both" as const),
    menuBackgroundPath: c.menuBackgroundPath ?? null,
    ordering: normalizeOrderingFeatures(c.ordering),
  }));
  return clients.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const clients = await listClients();
  return clients.find((c) => c.id === id) ?? null;
}

export async function getClientBySlug(slug: string): Promise<ClientRecord | null> {
  const clients = await listClients();
  return clients.find((c) => c.slug === slug) ?? null;
}

async function saveClients(clients: ClientRecord[]) {
  await ensureDataFiles();
  await fs.writeFile(CLIENTS_FILE, JSON.stringify(clients, null, 2), "utf8");
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/[^\w-]/g, "")
    .slice(0, 48);
}

export function normalizeSlug(input: string): string {
  const s = slugify(input);
  // Prefer ASCII slugs for domains; if empty after strip, use random
  const ascii = s.replace(/[^a-z0-9-]/g, "");
  return ascii || `client-${Date.now().toString(36)}`;
}

export async function createClient(
  input: CreateClientInput
): Promise<ClientRecord> {
  const clients = await listClients();
  const slug = normalizeSlug(input.slug || input.name);
  if (clients.some((c) => c.slug === slug)) {
    throw new Error("هذا الـ slug مستخدم بالفعل");
  }

  const now = new Date().toISOString();
  const client: ClientRecord = {
    id: randomUUID(),
    name: input.name.trim(),
    slug,
    displayName: (input.displayName || input.name).trim(),
    logoPath: null,
    colors: {
      primary: input.primaryColor || "#1B5E4A",
      accent: input.accentColor || "#C4A35A",
      surface: input.surfaceColor || "#F4F7F5",
    },
    font: input.font || "Cairo",
    currency: input.currency || "EGP",
    domain: input.domain || `${slug}.example.com`,
    dashboardPassword: input.dashboardPassword || "obelix123",
    languages: input.languages === "en" || input.languages === "ar" || input.languages === "both"
      ? input.languages
      : "both",
    menuBackgroundPath: null,
    ordering: normalizeOrderingFeatures(input.ordering),
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    packagePath: null,
  };

  clients.push(client);
  await saveClients(clients);
  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientRecord> & { ordering?: Partial<OrderingFeatures> }
): Promise<ClientRecord> {
  const clients = await listClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("العميل غير موجود");
  const nextOrdering = patch.ordering
    ? normalizeOrderingFeatures({
        ...clients[idx].ordering,
        ...patch.ordering,
      })
    : clients[idx].ordering;
  clients[idx] = {
    ...clients[idx],
    ...patch,
    ordering: nextOrdering,
    id: clients[idx].id,
    updatedAt: new Date().toISOString(),
  };
  await saveClients(clients);
  return clients[idx];
}

export async function saveClientLogo(
  clientId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  await ensureDataFiles();
  const client = await getClient(clientId);
  if (!client) throw new Error("العميل غير موجود");

  const ext = path.extname(fileName).toLowerCase() || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)
    ? ext
    : ".png";
  const destName = `${client.slug}-logo${safeExt}`;
  const dest = path.join(UPLOADS_DIR, destName);
  await fs.writeFile(dest, buffer);
  const relative = path.join("uploads", destName).replace(/\\/g, "/");
  await updateClient(clientId, { logoPath: relative });
  return relative;
}

export function getUploadsDir() {
  return UPLOADS_DIR;
}

export function getDataDir() {
  return DATA_DIR;
}
