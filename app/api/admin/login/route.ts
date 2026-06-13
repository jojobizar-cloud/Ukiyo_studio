import { NextResponse } from "next/server";
import {
  isAdminConfigured,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoginBody = {
  password?: unknown;
};

async function readBody(request: Request) {
  try {
    return (await request.json()) as LoginBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin password is not configured. Add ADMIN_PASSWORD to .env.local." },
      { status: 500 },
    );
  }

  const body = await readBody(request);

  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter the admin password." }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  await setAdminSessionCookie();

  return NextResponse.json({ ok: true });
}
