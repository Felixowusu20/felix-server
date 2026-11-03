"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const MIN_MS = 1700;
const FADE_MS = 420;
const SESSION_KEY = "felix-splash-seen";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // keep splash
    }

    let cancelled = false;
    let fadeTimer: number | undefined;
    let hideTimer: number | undefined;
    let minTimer: number | undefined;
    let loaded = document.readyState === "complete";
    let minElapsed = false;

    const tryDismiss = () => {
      if (cancelled || !loaded || !minElapsed) return;
      setLeaving(true);
      hideTimer = window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          // ignore
        }
      }, FADE_MS);
    };

    const onLoad = () => {
      loaded = true;
      tryDismiss();
    };

    minTimer = window.setTimeout(() => {
      minElapsed = true;
      tryDismiss();
    }, MIN_MS);

    if (!loaded) {
      window.addEventListener("load", onLoad, { once: true });
    }

    // Safety: never stick forever
    fadeTimer = window.setTimeout(() => {
      loaded = true;
      minElapsed = true;
      tryDismiss();
    }, MIN_MS + 2500);

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      if (minTimer) window.clearTimeout(minTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`splash-screen ${leaving ? "splash-screen--out" : ""}`}
      aria-hidden={leaving}
      role="presentation"
    >
      <div className="splash-screen__glow" />
      <div className="splash-mark">
        <span className="splash-ring splash-ring--a" />
        <span className="splash-ring splash-ring--b" />
        <span className="splash-ring splash-ring--c" />
        <div className="splash-logo">
          <Image
            src="/icon-192.png"
            alt=""
            width={96}
            height={96}
            priority
            className="splash-logo__img"
          />
          <span className="splash-logo__pulse" />
        </div>
      </div>
      <div className="splash-copy">
        <p className="splash-copy__brand">Felix Server</p>
        <p className="splash-copy__status">
          <span className="splash-dot" />
          Bringing monitors online
        </p>
      </div>
    </div>
  );
}
