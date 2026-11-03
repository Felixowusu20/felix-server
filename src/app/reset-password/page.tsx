"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[var(--down)]">Missing reset token.</p>
        <Link href="/forgot-password" className="btn-secondary mt-4 inline-block">
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[var(--shadow)]">
          <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" />
        </div>
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-5">
        <PasswordField
          id="new-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <PasswordField
          id="confirm-password"
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Repeat new password"
        />
        {error ? (
          <div className="rounded-lg border border-[#fecaca] bg-[var(--down-soft)] px-3 py-2 text-sm text-[var(--down)]">
            {error}
          </div>
        ) : null}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-[var(--muted)]">Loading…</main>}>
      <ResetForm />
    </Suspense>
  );
}
