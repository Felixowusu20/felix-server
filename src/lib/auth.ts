import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  getAdminPasswordHash,
  setAdminPasswordHash,
} from "./db";
import { hashPassword, verifyPasswordHash } from "./password";
import { SESSION_COOKIE, isValidSessionToken } from "./session";

export {
  SESSION_COOKIE,
  createSessionToken,
  isValidSessionToken,
  sessionCookieOptions,
} from "./session";

function verifyEnvPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = await getAdminPasswordHash().catch(() => null);
  if (stored && stored.length > 0) {
    return verifyPasswordHash(input, stored);
  }
  // Bootstrap from env password until changed in Settings
  return verifyEnvPassword(input);
}

export async function changeAdminPassword(opts: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (opts.newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters" };
  }
  const valid = await verifyPassword(opts.currentPassword);
  if (!valid) return { ok: false, error: "Current password is incorrect" };

  await setAdminPasswordHash(hashPassword(opts.newPassword));
  return { ok: true };
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return isValidSessionToken(jar.get(SESSION_COOKIE)?.value);
}
