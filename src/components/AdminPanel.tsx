"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Site } from "@/lib/types";
import { GlobeIcon, LinkIcon, TagIcon } from "./icons";
import { IconField } from "./IconField";
import { ConfirmDialog } from "./ConfirmDialog";

export function AdminPanel() {
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Site | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sites", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setSites(data.sites);
    setError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setName("");
      setUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sites/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const usedPct = Math.min(100, (sites.length / 20) * 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow)] sm:flex">
            <Image
              src="/icon-192.png"
              alt=""
              width={40}
              height={40}
              className="rounded-xl"
            />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Felix Server</p>
            <h1 className="mt-1 text-[1.35rem] font-semibold tracking-[-0.03em] sm:text-[1.75rem]">
              Add sites to monitor
            </h1>
          </div>
        </div>
        <div className="desktop-nav-only flex flex-wrap gap-2 self-start">
          <Link
            href="/sites"
            className="toolbar-btn border border-[var(--line)] bg-white shadow-[var(--shadow)] sm:min-h-[2.25rem] sm:px-4"
          >
            ← Sites
          </Link>
          <Link
            href="/"
            className="toolbar-btn border border-[var(--line)] bg-white shadow-[var(--shadow)] sm:min-h-[2.25rem] sm:px-4"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-white">
              <GlobeIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold tracking-tight">
                New project
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Name + public URL
              </p>
            </div>
            <span className="rounded-md bg-[#f3f4f6] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
              {sites.length}/20
            </span>
          </div>

          <form onSubmit={onAdd} className="space-y-4 p-4 sm:p-5">
            <IconField
              id="name"
              label="Project name"
              value={name}
              onChange={setName}
              required
              placeholder="Marketing site"
              icon={<TagIcon className="h-4 w-4" />}
            />

            <IconField
              id="url"
              label="Website URL"
              value={url}
              onChange={setUrl}
              required
              type="url"
              placeholder="https://example.com"
              mono
              hint="Prefer a public homepage or /health endpoint."
              icon={<LinkIcon className="h-4 w-4" />}
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>Capacity</span>
                <span className="font-mono">{sites.length} of 20 used</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f3]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-[#fecaca] bg-[var(--down-soft)] px-3 py-2 text-sm text-[var(--down)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || sites.length >= 20}
              className="btn-primary w-full sm:w-auto"
            >
              {busy ? "Saving…" : "Add to monitor"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
              <h2 className="text-[15px] font-semibold tracking-tight">
                Monitoring tips
              </h2>
            </div>
            <ul className="space-y-3 p-4 text-sm leading-relaxed text-[var(--muted)] sm:p-5">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                Use the final production URL you want watched 24/7.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                HTTP 2xx counts as running; 4xx/5xx mark the project down.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                Email alerts fire only when status changes, not every check.
              </li>
            </ul>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
              <h2 className="text-[15px] font-semibold tracking-tight">
                Monitored sites
              </h2>
              <span className="rounded-md bg-[#f3f4f6] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
                {sites.length}
              </span>
            </div>

            {sites.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f6] text-[var(--muted)]">
                  <GlobeIcon />
                </div>
                <p className="text-sm font-medium text-[var(--ink)]">
                  No sites yet
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Add your first project URL to get started.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {sites.map((site) => (
                  <li
                    key={site.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] text-[var(--muted)]">
                        <GlobeIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{site.name}</p>
                        <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                          {site.url.replace(/^https?:\/\//, "")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(site)}
                      disabled={busy}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--down)] hover:bg-[var(--down-soft)] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this project?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-[var(--ink)]">
                {pendingDelete.name}
              </span>{" "}
              will stop being monitored. You can add it again later anytime.
              <span className="mt-2 block truncate font-mono text-[12px]">
                {pendingDelete.url.replace(/^https?:\/\//, "")}
              </span>
            </>
          ) : null
        }
        confirmLabel="Remove project"
        busy={busy}
        onCancel={() => !busy && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
