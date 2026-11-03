"use client";

import type { Site, SiteStats } from "@/lib/types";
import { formatStatusLine, isRunningStatus } from "@/lib/statusCodes";
import { LatencySparkline, UptimeBars } from "./charts";

function formatLatency(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatRelative(iso: string | null, now: number) {
  if (!iso) return "Waiting for first check";
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function SiteCard({
  site,
  stats,
  now,
}: {
  site: Site;
  stats?: SiteStats;
  now: number;
}) {
  const running = site.lastStatus === "UP" || isRunningStatus(site.lastCode);
  const waiting =
    !running &&
    site.lastStatus === "UNKNOWN" &&
    site.lastCode == null &&
    !site.lastError;
  const down = !running && !waiting;

  return (
    <article
      className={`site-card ${down ? "site-card-down" : running ? "site-card-up" : ""}`}
    >
      <div className="flex">
        <div
          className="w-1 shrink-0"
          style={{
            background: running
              ? "var(--up)"
              : down
                ? "var(--down)"
                : "var(--line-strong)",
          }}
        />
        <div className="min-w-0 flex-1 space-y-3.5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--ink)] sm:text-base">
                {site.name}
              </h2>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate font-mono text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"
              >
                {site.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
            <span
              className="shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-white"
              style={{
                background: running
                  ? "var(--up)"
                  : down
                    ? "var(--down)"
                    : "var(--unknown)",
              }}
            >
              {running ? "RUNNING" : down ? "DOWN" : "UNKNOWN"}
            </span>
          </div>

          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              borderColor: down
                ? "#fecaca"
                : running
                  ? "#a7f3d0"
                  : "var(--line)",
              background: down
                ? "var(--down-soft)"
                : running
                  ? "var(--up-soft)"
                  : "#f9fafb",
              color: down
                ? "var(--down)"
                : running
                  ? "var(--up)"
                  : "var(--unknown)",
            }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] opacity-70">
              HTTP status
            </p>
            <p className="mt-0.5 font-mono text-[12px] font-semibold leading-snug sm:text-[13px]">
              {site.lastChecked || site.lastCode != null || site.lastError
                ? formatStatusLine(site.lastCode)
                : "Waiting for first check"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Uptime"
              value={stats?.uptimePct != null ? `${stats.uptimePct}%` : "—"}
            />
            <Metric
              label="Avg"
              value={formatLatency(stats?.avgLatencyMs ?? null)}
            />
            <Metric
              label="Incidents"
              value={stats ? String(stats.incidents) : "—"}
            />
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[#fafafa] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
                Latency
              </p>
              <p className="font-mono text-[10px] text-[var(--muted)]">
                {formatLatency(site.lastLatency)}
              </p>
            </div>
            <LatencySparkline
              history={stats?.history ?? []}
              stroke={down ? "var(--down)" : "var(--accent)"}
            />
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[#fafafa] p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
              Check history
            </p>
            <UptimeBars history={stats?.history ?? []} />
          </div>

          <p className="font-mono text-[11px] text-[var(--muted)]">
            Updated {formatRelative(site.lastChecked, now)}
          </p>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[13px] font-semibold">
        {value}
      </p>
    </div>
  );
}
