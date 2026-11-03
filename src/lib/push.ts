import webpush from "web-push";
import { listPushSubscriptions, deletePushSubscription } from "./db";

function configured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function setup() {
  if (!configured()) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (!configured()) {
    console.warn("Skipping push: VAPID not configured");
    return { sent: 0 };
  }

  setup();
  const subs = await listPushSubscriptions();
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscription(sub.endpoint).catch(() => {});
        } else {
          console.error("Push failed", err);
        }
      }
    }),
  );

  return { sent };
}
