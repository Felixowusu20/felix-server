"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(
        "If email is configured, a reset link was sent to your alert inbox. Check your email.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[var(--shadow)]">
          <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" />
        </div>
      </div>
      <p className="eyebrow text-center">Account recovery</p>
      <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight">
        Forgot password
      </h1>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        We’ll email a secure reset link to your configured alert address.
      </p>

      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-5">
        {message ? (
          <div className="rounded-lg border border-[#a7f3d0] bg-[var(--up-soft)] px-3 py-2 text-sm text-[var(--up)]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#fecaca] bg-[var(--down-soft)] px-3 py-2 text-sm text-[var(--down)]">
            {error}
          </div>
        ) : null}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Sending…" : "Email reset link"}
        </button>
        <Link href="/login" className="btn-secondary block w-full text-center">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
