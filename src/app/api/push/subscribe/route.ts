import { NextResponse } from "next/server";
import { deletePushSubscription, savePushSubscription } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: Boolean(getVapidPublicKey()),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;

  const endpoint = body?.endpoint?.trim();
  const p256dh = body?.keys?.p256dh?.trim();
  const auth = body?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  if (!getVapidPublicKey()) {
    return NextResponse.json(
      { error: "Push is not configured on the server" },
      { status: 503 },
    );
  }

  await savePushSubscription({ endpoint, p256dh, auth });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  const endpoint = body?.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  await deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
