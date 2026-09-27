import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createContact, listContacts } from "@/lib/menu-data";
import type { ContactType } from "@/lib/types";

export async function GET() {
  const contacts = await listContacts();
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.type || !body.value) {
      return NextResponse.json(
        { error: "النوع والقيمة مطلوبان" },
        { status: 400 }
      );
    }
    const contact = await createContact({
      type: body.type as ContactType,
      label: body.label,
      value: String(body.value),
      active: body.active ?? true,
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
