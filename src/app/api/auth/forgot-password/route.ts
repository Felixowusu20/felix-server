import { NextResponse } from "next/server";
import {
  getAdminPasswordHash,
  setAdminPasswordHash,
  setPasswordResetToken,
} from "@/lib/db";
import { appBaseUrl, sendPasswordResetEmail } from "@/lib/mail";
import { createResetToken, hashPassword } from "@/lib/password";

export async function POST() {
  try {
    // Ensure an auth row exists (bootstrap from env if needed)
    const existing = await getAdminPasswordHash();
    if (!existing) {
      const bootstrap = process.env.DASHBOARD_PASSWORD;
      if (bootstrap) {
        await setAdminPasswordHash(hashPassword(bootstrap));
      } else {
        return NextResponse.json(
          { error: "Admin password is not configured yet" },
          { status: 400 },
        );
      }
    }

    const token = createResetToken();
    const expires = new Date(Date.now() + 30 * 60_000);
    await setPasswordResetToken(token, expires);

    const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
    await sendPasswordResetEmail({ resetUrl });

    // Always generic response (no account enumeration)
    return NextResponse.json({
      ok: true,
      message: "If email is configured, a reset link was sent.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not send reset email. Check SMTP settings." },
      { status: 500 },
    );
  }
}
