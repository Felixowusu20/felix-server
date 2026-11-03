"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.replace(search.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="login-hero relative hidden items-center justify-center p-10 text-white lg:flex">
        <div className="relative z-10 max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
            <Image
              src="/icon-192.png"
              alt="Felix Server"
              width={96}
              height={96}
              className="h-full w-full rounded-2xl object-cover"
              priority
            />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-100/90">
            Felix Server
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            Calm visibility for every deployment.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-teal-50/80">
            Live status, latency charts, and alerts in one operations board.
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12 sm:px-8">
        <div className="relative w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--shadow)]">
              <Image
                src="/icon-192.png"
                alt="Felix Server"
                width={64}
                height={64}
                className="rounded-xl"
                priority
              />
            </div>
          </div>

          <p className="eyebrow text-center lg:text-left">Secure access</p>
          <h1 className="mt-2 text-center text-[2rem] font-semibold tracking-[-0.035em] text-[var(--ink)] lg:text-left">
            Sign in
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-[var(--muted)] lg:text-left">
            Enter your dashboard password to open the live monitoring feed.
          </p>

          <form onSubmit={onSubmit} className="panel mt-8 space-y-5 p-5 sm:p-6">
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
            />

            {error ? (
              <div className="rounded-lg border border-[var(--down-border)] bg-[var(--down-soft)] px-3 py-2 text-sm text-[var(--down)]">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end">
              <ThemeToggle compact />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? "Signing in…" : "Enter dashboard"}
            </button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Protected workspace · authorized access only
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--muted)]">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
