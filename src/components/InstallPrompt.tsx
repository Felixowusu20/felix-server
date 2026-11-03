"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DownloadIcon } from "./icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      if (localStorage.getItem("felix-install-dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) {
      setIosHint(true);
      setVisible(true);
    }

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || dismissed || isStandalone()) return null;

  async function install() {
    if (!deferred) {
      setIosHint(true);
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setVisible(false);
  }

  function dismiss() {
    setDismissed(true);
    setVisible(false);
    try {
      localStorage.setItem("felix-install-dismissed", "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="install-banner">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[var(--line)] bg-white p-1 shadow-[var(--shadow)]">
          <Image
            src="/icon-192.png"
            alt=""
            width={36}
            height={36}
            className="rounded-[9px]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            Install Felix Server
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
            {iosHint
              ? "Tap Share, then Add to Home Screen for the full app experience."
              : "Add to your home screen — full-screen app look, still powered by the web."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!iosHint || deferred ? (
          <button type="button" className="btn-primary flex-1" onClick={install}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <DownloadIcon className="h-4 w-4" />
              Install app
            </span>
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={dismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
