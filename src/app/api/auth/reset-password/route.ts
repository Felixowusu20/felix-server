import { NextResponse } from "next/server";
import { getPasswordResetToken, setAdminPasswordHash } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    password?: string;
  } | null;

  const token = body?.token?.trim() ?? "";
  const password = body?.password ?? "";

  if (!token || password.length < 8) {
    return NextResponse.json(
      { error: "Valid token and password (min 8 chars) are required" },
      { status: 400 },
    );
  }

  const row = await getPasswordResetToken();
  if (!row?.resetToken || row.resetToken !== token) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 },
    );
  }
  if (!row.resetExpires || new Date(row.resetExpires).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Reset link has expired" },
      { status: 400 },
    );
  }

  await setAdminPasswordHash(hashPassword(password));
  return NextResponse.json({ ok: true });
}
