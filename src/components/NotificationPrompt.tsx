"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setEnabled(Boolean(sub)))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const keyRes = await fetch("/api/push/subscribe");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        throw new Error("Push notifications are not configured on the server");
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("Notification permission was denied");
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save subscription");

      setEnabled(true);
      setMessage("Alerts enabled. You’ll be notified when a project goes down.");
      await reg.showNotification("Felix Server", {
        body: "Live alerts are active for your monitored projects.",
        icon: "/icon-192.png",
        tag: "monitor-enabled",
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enable alerts");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMessage("Alerts turned off.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not disable alerts");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <section className="mb-5 overflow-hidden rounded-[14px] border border-[var(--line)] bg-white shadow-[var(--shadow)] sm:mb-6">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[#f8faf9] p-1.5">
            <Image
              src="/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                enabled ? "live-pulse bg-[var(--up)]" : "bg-[#d1d5db]"
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Live alerts
              </h2>
              <span
                className="rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
                style={{
                  background: enabled ? "var(--up-soft)" : "#f3f4f6",
                  color: enabled ? "var(--up)" : "var(--muted)",
                }}
              >
                {enabled ? "ON" : "OFF"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Get instant device notifications when a Felix Server project goes
              down or recovers.
            </p>
            {message ? (
              <p className="mt-2 text-xs font-medium text-[var(--accent)]">
                {message}
              </p>
            ) : null}
            {permission === "denied" ? (
              <p className="mt-2 text-xs text-[var(--down)]">
                Notifications are blocked in browser settings.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={busy || permission === "denied"}
          onClick={enabled ? disable : enable}
          className={enabled ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
        >
          {busy ? "Please wait…" : enabled ? "Turn off" : "Turn on alerts"}
        </button>
      </div>
    </section>
  );
}
