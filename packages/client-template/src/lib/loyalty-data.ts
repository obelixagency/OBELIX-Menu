import { promises as fs } from "fs";
import path from "path";

type StampRow = { phone: string; stamps: number; rewards: number };

type File = { rows: StampRow[] };

const FILE = path.join(process.cwd(), "data", "loyalty.json");

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-11);
}

async function load(): Promise<File> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as File;
    return { rows: Array.isArray(raw.rows) ? raw.rows : [] };
  } catch {
    return { rows: [] };
  }
}

async function save(data: File) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function addStamp(
  phone: string,
  needed = 10
): Promise<{ stamps: number; rewardEarned: boolean; rewards: number }> {
  const key = normalizePhone(phone);
  if (key.length < 8) {
    return { stamps: 0, rewardEarned: false, rewards: 0 };
  }
  const data = await load();
  let row = data.rows.find((r) => r.phone === key);
  if (!row) {
    row = { phone: key, stamps: 0, rewards: 0 };
    data.rows.push(row);
  }
  row.stamps += 1;
  let rewardEarned = false;
  const n = Math.max(2, Math.min(50, Number(needed) || 10));
  if (row.stamps >= n) {
    row.stamps -= n;
    row.rewards += 1;
    rewardEarned = true;
  }
  await save(data);
  return { stamps: row.stamps, rewardEarned, rewards: row.rewards };
}

export async function peekStamps(phone: string): Promise<number> {
  const key = normalizePhone(phone);
  const data = await load();
  return data.rows.find((r) => r.phone === key)?.stamps || 0;
}
