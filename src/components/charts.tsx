"use client";

import type { CheckPoint } from "@/lib/types";

export function LatencySparkline({
  history,
  stroke = "var(--accent)",
  height = 40,
}: {
  history: CheckPoint[];
  stroke?: string;
  height?: number;
}) {
  const values = history
    .map((h) => h.latencyMs)
    .filter((n): n is number => n != null);

  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-[var(--muted)]"
        style={{ height }}
      >
        Collecting samples…
      </div>
    );
  }

  const width = 280;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Latency trend"
    >
      <polygon points={area} fill={stroke} opacity="0.1" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UptimeBars({ history }: { history: CheckPoint[] }) {
  const points = history.slice(-40);
  if (points.length === 0) {
    return (
      <div className="text-[11px] text-[var(--muted)]">No samples yet</div>
    );
  }

  return (
    <div className="flex h-7 items-end gap-px" aria-label="Uptime history">
      {points.map((p, i) => (
        <span
          key={`${p.checkedAt}-${i}`}
          className="min-w-0 flex-1 rounded-[2px]"
          title={`${p.status} · ${p.statusCode ?? "n/a"}`}
          style={{
            height: p.status === "UP" ? "100%" : "40%",
            background: p.status === "UP" ? "var(--up)" : "var(--down)",
            opacity: p.status === "UP" ? 0.8 : 1,
          }}
        />
      ))}
    </div>
  );
}

export function FleetLatencyChart({
  series,
}: {
  series: { name: string; avgLatencyMs: number | null; up: boolean }[];
}) {
  const usable = series.filter((s) => s.avgLatencyMs != null);
  if (usable.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-sm text-[var(--muted)]">
        Latency chart appears after a few checks
      </div>
    );
  }

  const max = Math.max(...usable.map((s) => s.avgLatencyMs as number), 1);

  return (
    <div className="space-y-3.5">
      {usable.map((s) => {
        const pct = Math.max(4, ((s.avgLatencyMs as number) / max) * 100);
        return (
          <div key={s.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-[var(--ink)]">
                {s.name}
              </span>
              <span className="shrink-0 font-mono text-[var(--muted)]">
                {s.avgLatencyMs} ms
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--soft-strong)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: s.up ? "var(--accent)" : "var(--down)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UptimeDonut({
  uptimePct,
  size = 124,
}: {
  uptimePct: number;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, uptimePct));
  const offset = c - (clamped / 100) * c;
  const color =
    clamped >= 99
      ? "var(--up)"
      : clamped >= 95
        ? "var(--unknown)"
        : "var(--down)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--soft-strong)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p
          className="font-mono text-[1.35rem] font-semibold tracking-tight"
          style={{ color }}
        >
          {clamped.toFixed(1)}%
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
          Uptime
        </p>
      </div>
    </div>
  );
}
