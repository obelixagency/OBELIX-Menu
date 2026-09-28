/**
 * Staff accounts — optional multi-user login for client packages.
 * When staffAccountsEnabled is OFF, brand dashboardPassword still works alone.
 */

import { promises as fs } from "fs";
import path from "path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "crypto";

export type StaffRole = "owner" | "cashier" | "kitchen" | "barista";

export type StaffUser = {
  id: string;
  username: string;
  /** scrypt hash: scrypt$saltHex$hashHex */
  passwordHash: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsersFile = {
  users: StaffUser[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const ROLES: StaffRole[] = ["owner", "cashier", "kitchen", "barista"];

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && ROLES.includes(value as StaffRole);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPasswordHash(
  password: string,
  stored: string
): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  try {
    const hash = scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    if (hash.length !== expected.length) return false;
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

async function readRaw(): Promise<UsersFile> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw) as UsersFile;
    return { users: Array.isArray(parsed.users) ? parsed.users : [] };
  } catch {
    return { users: [] };
  }
}

async function writeRaw(data: UsersFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, USERS_FILE);
}

export async function listUsers(): Promise<StaffUser[]> {
  const data = await readRaw();
  return data.users;
}

export async function findUserByUsername(
  username: string
): Promise<StaffUser | null> {
  const needle = username.trim().toLowerCase();
  const data = await readRaw();
  return (
    data.users.find((u) => u.username.toLowerCase() === needle) || null
  );
}

export async function findUserById(id: string): Promise<StaffUser | null> {
  const data = await readRaw();
  return data.users.find((u) => u.id === id) || null;
}

/** Ensure at least one owner exists when staff accounts are first turned on. */
export async function ensureSeedOwner(
  dashboardPassword: string
): Promise<StaffUser> {
  const data = await readRaw();
  const owner = data.users.find((u) => u.role === "owner" && u.active);
  if (owner) return owner;
  const now = new Date().toISOString();
  const seed: StaffUser = {
    id: randomUUID(),
    username: "owner",
    passwordHash: hashPassword(dashboardPassword || "obelix123"),
    role: "owner",
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  data.users.push(seed);
  await writeRaw(data);
  return seed;
}

export async function createUser(input: {
  username: string;
  password: string;
  role: StaffRole;
}): Promise<StaffUser> {
  const username = input.username.trim().toLowerCase();
  if (!username || username.length < 2) {
    throw new Error("Username too short");
  }
  if (!input.password || input.password.length < 4) {
    throw new Error("Password too short");
  }
  if (!isStaffRole(input.role)) {
    throw new Error("Invalid role");
  }
  const data = await readRaw();
  if (data.users.some((u) => u.username.toLowerCase() === username)) {
    throw new Error("Username already exists");
  }
  const now = new Date().toISOString();
  const user: StaffUser = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  data.users.push(user);
  await writeRaw(data);
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<{
    password: string;
    role: StaffRole;
    active: boolean;
  }>
): Promise<StaffUser> {
  const data = await readRaw();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const current = data.users[idx];
  if (patch.role && !isStaffRole(patch.role)) {
    throw new Error("Invalid role");
  }
  if (patch.password !== undefined) {
    if (patch.password.length < 4) throw new Error("Password too short");
    current.passwordHash = hashPassword(patch.password);
  }
  if (patch.role) current.role = patch.role;
  if (typeof patch.active === "boolean") current.active = patch.active;
  // Keep at least one active owner
  if (
    current.role === "owner" &&
    current.active === false &&
    !data.users.some(
      (u) => u.id !== id && u.role === "owner" && u.active
    )
  ) {
    throw new Error("Cannot disable the last owner");
  }
  current.updatedAt = new Date().toISOString();
  data.users[idx] = current;
  await writeRaw(data);
  return current;
}

export async function deleteUser(id: string): Promise<void> {
  const data = await readRaw();
  const target = data.users.find((u) => u.id === id);
  if (!target) throw new Error("User not found");
  if (
    target.role === "owner" &&
    !data.users.some((u) => u.id !== id && u.role === "owner" && u.active)
  ) {
    throw new Error("Cannot delete the last owner");
  }
  data.users = data.users.filter((u) => u.id !== id);
  await writeRaw(data);
}

export function publicUser(u: StaffUser) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** Role → which staff screens they may open */
export function roleHomePath(role: StaffRole): string {
  switch (role) {
    case "cashier":
      return "/cashier";
    case "kitchen":
      return "/kitchen";
    case "barista":
      return "/bar";
    default:
      return "/dashboard";
  }
}

export function canAccessPath(role: StaffRole, pathname: string): boolean {
  if (role === "owner") return true;
  if (role === "cashier") {
    return (
      pathname.startsWith("/cashier") ||
      pathname.startsWith("/pos") ||
      pathname.startsWith("/dashboard/orders") ||
      pathname.startsWith("/dashboard/login") ||
      pathname === "/dashboard"
    );
  }
  if (role === "kitchen") {
    return (
      pathname.startsWith("/kitchen") ||
      pathname.startsWith("/dashboard/login")
    );
  }
  if (role === "barista") {
    return (
      pathname.startsWith("/bar") || pathname.startsWith("/dashboard/login")
    );
  }
  return false;
}

export function canManageStaff(role: StaffRole): boolean {
  return role === "owner";
}

export function canMutateMenu(role: StaffRole): boolean {
  return role === "owner";
}

export function canMutateOrders(role: StaffRole): boolean {
  return role === "owner" || role === "cashier";
}
