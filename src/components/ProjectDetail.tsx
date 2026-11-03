"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Site, SiteStats } from "@/lib/types";
import { formatStatusLine, isRunningStatus } from "@/lib/statusCodes";
import {
  AUTO_CHECK_MS,
  LIVE_WINDOW_MS,
  STATUS_POLL_MS,
  UI_TICK_MS,
} from "@/lib/monitorConfig";
import { CountdownTimer } from "./CountdownTimer";
import { LatencySparkline, UptimeBars, UptimeDonut } from "./charts";

function formatLatency(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatClock(iso: string | null, now: number) {
  if (!iso) return "Never checked";
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ${diff % 60}s ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function ProjectDetail({ id }: { id: string }) {
  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [stateRunAt, setStateRunAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    try {
      const [siteRes, statusRes] = await Promise.all([
        fetch(`/api/sites/${id}`, { cache: "no-store" }),
        fetch("/api/monitor/status", { cache: "no-store" }),
      ]);
      const siteData = await siteRes.json();
      if (!siteRes.ok) throw new Error(siteData.error || "Failed to load");
      setSite(siteData.site);
      setStats(siteData.stats);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStateRunAt(statusData.state?.lastRunAt ?? null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      await fetch(`/api/sites/${id}/check`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }, [id, load]);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), UI_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
    // Detail page: poll less often; full check still runs on interval
    const poll = setInterval(load, Math.max(STATUS_POLL_MS, 10_000));
    return () => clearInterval(poll);
  }, [mounted, load]);

  useEffect(() => {
    if (!mounted) return;
    runCheck();
    const auto = setInterval(runCheck, AUTO_CHECK_MS);
    return () => clearInterval(auto);
  }, [mounted, runCheck]);

  if (loading && !site) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-[#eef0f3]" />
        <div className="mt-6 h-48 animate-pulse rounded-[12px] bg-[#eef0f3]" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-10 sm:px-6">
        <p className="text-[var(--down)]">{error || "Project not found"}</p>
        <Link href="/" className="btn-secondary mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const running = site.lastStatus === "UP" || isRunningStatus(site.lastCode);
  const down = !running && !(site.lastStatus === "UNKNOWN" && !site.lastChecked);
  const lastRunMs = stateRunAt ? new Date(stateRunAt).getTime() : null;
  const ageMs = lastRunMs ? now - lastRunMs : null;
  const nextInSec = lastRunMs
    ? Math.max(0, Math.ceil((AUTO_CHECK_MS - (ageMs ?? 0)) / 1000))
    : 60;
  const isLive = ageMs != null && ageMs < LIVE_WINDOW_MS;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-12 pt-3 sm:px-6 sm:pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="btn-secondary">
          ← Dashboard
        </Link>
        <CountdownTimer
          seconds={nextInSec}
          checking={checking}
          label="Next check"
          size="lg"
        />
      </div>

      <header
        className={`fade-in mb-5 overflow-hidden rounded-[12px] border ${
          down
            ? "site-card-down border-[#fecaca]"
            : running
              ? "site-card-up border-[#a7f3d0]"
              : "border-[var(--line)] bg-white"
        }`}
      >
        <div className="flex">
          <div
            className={`status-rail w-1.5 shrink-0 ${
              running ? "bg-[var(--up)]" : down ? "bg-[var(--down)]" : "bg-[var(--line-strong)]"
            }`}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="eyebrow">Project detail</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {site.name}
              </h1>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block truncate font-mono text-xs text-[var(--muted)] hover:text-[var(--accent)]"
              >
                {site.url}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-white ${
                  running ? "status-badge-pulse" : ""
                }`}
                style={{
                  background: running
                    ? "var(--up)"
                    : down
                      ? "var(--down)"
                      : "#6b7280",
                }}
              >
                {running ? "RUNNING" : down ? "DOWN" : "UNKNOWN"}
              </span>
              <span
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${
                  isLive || checking
                    ? "border-[#a7f3d0] bg-[var(--up-soft)] text-[var(--up)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {checking ? "Checking now" : isLive ? "Live feed on" : "Waiting"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-[12px] border border-[#fecaca] bg-[var(--down-soft)] px-4 py-3 text-sm text-[var(--down)]">
          {error}
        </div>
      ) : null}

      <div
        className={`fade-in mb-5 rounded-[12px] border px-4 py-3 ${
          down
            ? "border-[#fecaca] bg-[var(--down-soft)] text-[var(--down)]"
            : "border-[#a7f3d0] bg-[var(--up-soft)] text-[var(--up)]"
        }`}
        style={{ animationDelay: "40ms" }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] opacity-70">
          HTTP status
        </p>
        <p className="mt-1 font-mono text-sm font-semibold sm:text-base">
          {formatStatusLine(site.lastCode)}
        </p>
      </div>

      <section
        className="fade-in mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: "80ms" }}
      >
        <MetricCard label="Current latency" value={formatLatency(site.lastLatency)} />
        <MetricCard
          label="Average latency"
          value={formatLatency(stats?.avgLatencyMs ?? null)}
        />
        <MetricCard
          label="Uptime"
          value={stats?.uptimePct != null ? `${stats.uptimePct}%` : "—"}
        />
        <MetricCard
          label="Incidents"
          value={stats ? String(stats.incidents) : "—"}
        />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[200px_1fr]">
        <div
          className="panel fade-in flex flex-col items-center justify-center gap-3 p-5"
          style={{ animationDelay: "120ms" }}
        >
          <UptimeDonut uptimePct={stats?.uptimePct ?? 0} />
          <p className="text-center text-xs text-[var(--muted)]">
            Based on recent checks
          </p>
        </div>
        <div
          className="panel fade-in space-y-5 p-4 sm:p-5"
          style={{ animationDelay: "160ms" }}
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
                Latency trend
              </p>
              <p className="font-mono text-[11px] text-[var(--muted)]">
                live · {formatLatency(site.lastLatency)}
              </p>
            </div>
            <div className="rounded-lg bg-[#fafafa] p-3">
              <LatencySparkline
                history={stats?.history ?? []}
                stroke={down ? "var(--down)" : "var(--accent)"}
                height={56}
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
              Check history
            </p>
            <div className="rounded-lg bg-[#fafafa] p-3">
              <UptimeBars history={stats?.history ?? []} />
            </div>
          </div>
        </div>
      </section>

      <div
        className="fade-in panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        style={{ animationDelay: "200ms" }}
      >
        <div>
          <p className="eyebrow">Last checked</p>
          <p
            key={site.lastChecked ?? "none"}
            className="countdown-digit mt-1 font-mono text-lg font-semibold"
          >
            {formatClock(site.lastChecked, now)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
            Clock {new Date(now || Date.now()).toLocaleTimeString()}
          </p>
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="btn-primary disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check now"}
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-3.5 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}
