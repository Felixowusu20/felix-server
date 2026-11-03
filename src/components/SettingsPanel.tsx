"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PasswordField } from "./PasswordField";

export function SettingsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow)]">
            <Image src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
          </div>
          <div>
            <p className="eyebrow">Settings</p>
            <h1 className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em] sm:text-[1.6rem]">
              Admin security
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Change your dashboard password. Forgot password emails go to your alert inbox.
            </p>
          </div>
        </div>
        <Link href="/" className="btn-secondary desktop-nav-only self-start">
          ← Dashboard
        </Link>
      </header>

      <form onSubmit={onSubmit} className="panel space-y-4 p-5 sm:p-6">
        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <PasswordField
          id="confirm-new-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Repeat new password"
        />

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

        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>

      <section className="panel mt-4 space-y-3 p-5 lg:hidden">
        <p className="eyebrow">Session</p>
        <p className="text-sm text-[var(--muted)]">
          Sign out of Felix Server on this device.
        </p>
        <button type="button" onClick={logout} className="btn-secondary w-full">
          Log out
        </button>
      </section>
    </div>
  );
}
