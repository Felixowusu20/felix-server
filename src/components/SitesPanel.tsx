"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Site } from "@/lib/types";
import { isRunningStatus } from "@/lib/statusCodes";
import { ProjectList } from "./ProjectList";

type Filter = "all" | "up" | "down";

function isUp(site: Site) {
  return site.lastStatus === "UP" || isRunningStatus(site.lastCode);
}

export function SitesPanel() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sites", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sites");
      setSites(data.sites);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 12_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...sites];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q),
      );
    }
    if (filter === "up") list = list.filter(isUp);
    if (filter === "down") list = list.filter((s) => !isUp(s));
    list.sort((a, b) => {
      const rank = (s: Site) =>
        isUp(s) ? 2 : s.lastStatus === "UNKNOWN" ? 1 : 0;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
    return list;
  }, [sites, query, filter]);

  const up = sites.filter(isUp).length;
  const down = sites.length - up;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Felix Server</p>
          <h1 className="mt-1 text-[1.35rem] font-semibold tracking-[-0.03em] sm:text-[1.75rem]">
            Monitored sites
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {sites.length} projects · {up} up · {down} down
          </p>
        </div>
        <div className="desktop-nav-only flex flex-wrap gap-2">
          <Link
            href="/"
            className="toolbar-btn border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]"
          >
            ← Dashboard
          </Link>
          <Link href="/admin" className="btn-primary">
            Add site
          </Link>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-[12px] border border-[var(--down-border)] bg-[var(--down-soft)] px-4 py-3 text-sm text-[var(--down)]">
          {error}
        </div>
      ) : null}

      <section className="panel p-3.5 sm:p-5">
        <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                ["all", "All"],
                ["up", "Up"],
                ["down", "Down"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`chip ${filter === key ? "chip-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sites…"
            className="field sm:max-w-[14rem]"
          />
        </div>

        <ProjectList sites={filtered} loading={loading} />
      </section>
    </div>
  );
}
