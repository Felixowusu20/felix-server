"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MonitorState, Site, SiteStats } from "@/lib/types";
import { isRunningStatus } from "@/lib/statusCodes";
import {
  AUTO_CHECK_MS,
  LIVE_WINDOW_MS,
  STATS_POLL_MS,
  STATUS_POLL_MS,
  UI_TICK_MS,
} from "@/lib/monitorConfig";
import { ProjectList } from "./ProjectList";
import { CountdownTimer } from "./CountdownTimer";
import { NotificationPrompt } from "./NotificationPrompt";
import { FleetLatencyChart, UptimeDonut } from "./charts";

type Filter = "all" | "up" | "down";

export function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<SiteStats[]>([]);
  const [state, setState] = useState<MonitorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const applyPayload = useCallback(
    (data: {
      sites: Site[];
      stats?: SiteStats[];
      state: MonitorState;
    }, withStats: boolean) => {
      setSites(data.sites);
      setState(data.state);
      if (withStats && data.stats) setStats(data.stats);
      setError(null);
      setLoading(false);
    },
    [],
  );

  const loadLight = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor/status?light=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      applyPayload(data, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, [applyPayload]);

  const loadFull = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      applyPayload(data, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, [applyPayload]);

  const runChecks = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/monitor/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check run failed");
      await loadFull();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check run failed");
    } finally {
      setRunning(false);
    }
  }, [loadFull]);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), UI_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadFull();
    const lightPoll = setInterval(loadLight, STATUS_POLL_MS);
    const statsPoll = setInterval(loadFull, STATS_POLL_MS);
    return () => {
      clearInterval(lightPoll);
      clearInterval(statsPoll);
    };
  }, [mounted, loadFull, loadLight]);

  useEffect(() => {
    if (!mounted) return;
    runChecks();
    const auto = setInterval(runChecks, AUTO_CHECK_MS);
    return () => clearInterval(auto);
  }, [mounted, runChecks]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const statsById = useMemo(() => {
    const map = new Map<string, SiteStats>();
    for (const s of stats) map.set(s.siteId, s);
    return map;
  }, [stats]);

  const isUp = useCallback(
    (site: Site) => site.lastStatus === "UP" || isRunningStatus(site.lastCode),
    [],
  );

  const up = sites.filter(isUp).length;
  const down = sites.filter(
    (s) => !isUp(s) && !(s.lastStatus === "UNKNOWN" && !s.lastChecked),
  ).length;

  const fleetUptime = useMemo(() => {
    const withData = stats.filter((s) => s.uptimePct != null);
    if (!withData.length) return null;
    return (
      Math.round(
        (withData.reduce((a, s) => a + (s.uptimePct as number), 0) /
          withData.length) *
          10,
      ) / 10
    );
  }, [stats]);

  const lastRunAt = state?.lastRunAt ? new Date(state.lastRunAt).getTime() : null;
  const ageMs = lastRunAt ? now - lastRunAt : null;
  const isLive =
    ageMs != null && ageMs < LIVE_WINDOW_MS && state?.lastRunOk !== false;
  const nextInSec = lastRunAt
    ? Math.max(0, Math.ceil((AUTO_CHECK_MS - (ageMs ?? 0)) / 1000))
    : 60;

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
  }, [sites, query, filter, isUp]);

  return (
    <div className="dash mx-auto w-full max-w-7xl overflow-x-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
      <header className="topbar sticky top-0 z-20 mb-4 border-b border-[var(--line)] py-3 sm:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Felix Server</p>
            <h1 className="mt-0.5 text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-[1.5rem]">
              Operations
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CountdownTimer
              seconds={nextInSec}
              checking={running}
              variant="toolbar"
            />
            <nav
              className="toolbar-actions desktop-nav-only"
              aria-label="Main actions"
            >
              <Link href="/sites" className="toolbar-btn">
                Sites
              </Link>
              <Link href="/admin" className="toolbar-btn">
                Add site
              </Link>
              <Link href="/settings" className="toolbar-btn">
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="toolbar-btn toolbar-btn--muted"
              >
                Log out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div
        className={`mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] border px-3 py-2.5 text-sm sm:mb-6 sm:px-3.5 ${
          isLive || running
            ? "border-[#a7f3d0] bg-[var(--up-soft)]"
            : "border-[var(--line)] bg-white"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isLive || running ? "live-pulse bg-[var(--up)]" : "bg-[var(--muted)]"
          }`}
        />
        <p className="min-w-0 flex-1 font-medium">
          {running
            ? "Checking projects…"
            : isLive
              ? "Monitoring live"
              : "Starting monitor…"}
        </p>
        <p className="font-mono text-[11px] text-[var(--muted)]">
          {up} up · {down} down
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[12px] border border-[#fecaca] bg-[var(--down-soft)] px-4 py-3 text-sm text-[var(--down)]">
          {error}
        </div>
      ) : null}

      <NotificationPrompt />

      <section className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:grid-cols-4">
        <Stat label="Projects" value={String(sites.length)} />
        <Stat label="Running" value={String(up)} tone="up" />
        <Stat label="Down" value={String(down)} tone="down" />
        <Stat
          label="Fleet uptime"
          value={fleetUptime != null ? `${fleetUptime}%` : "—"}
          tone={fleetUptime != null && fleetUptime < 99 ? "down" : "up"}
        />
      </section>

      {/* Projects first on mobile, graphs beside list on desktop */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="panel fade-in order-1 p-3.5 sm:p-5 lg:order-2">
          <div className="mb-3 flex flex-col gap-2.5">
            <div>
              <p className="eyebrow">Projects</p>
              <h2 className="mt-1 text-[15px] font-semibold tracking-tight">
                Status list
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Tap a project for latency, history, and details
              </p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="field mb-3"
            enterKeyHint="search"
          />
          <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain pr-0.5 sm:max-h-[28rem]">
            <ProjectList sites={filtered} loading={loading} />
          </div>
        </div>

        <div className="panel fade-in order-2 space-y-4 p-3.5 sm:p-5 lg:order-1">
          <div>
            <p className="eyebrow">Overview</p>
            <h2 className="mt-1 text-[15px] font-semibold tracking-tight">
              Fleet health
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-[132px_1fr] sm:items-center">
            <div className="flex justify-center">
              <UptimeDonut uptimePct={fleetUptime ?? 0} size={120} />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="mb-3 text-xs font-medium text-[var(--muted)]">
                Average latency by project
              </p>
              <FleetLatencyChart
                series={sites.map((s) => ({
                  name: s.name,
                  avgLatencyMs:
                    statsById.get(s.id)?.avgLatencyMs ?? s.lastLatency,
                  up: isUp(s),
                }))}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const color =
    tone === "up"
      ? "var(--up)"
      : tone === "down"
        ? "var(--down)"
        : "var(--ink)";

  return (
    <div className="panel min-w-0 px-3 py-3 sm:px-3.5">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-1.5 truncate font-mono text-[1.1rem] font-semibold tracking-tight sm:text-[1.15rem]"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}
