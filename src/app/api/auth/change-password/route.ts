import { NextResponse } from "next/server";
import { changeAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
  } | null;

  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }

  const result = await changeAdminPassword({ currentPassword, newPassword });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
