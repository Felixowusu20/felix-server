"use client";

import Link from "next/link";
import type { Site } from "@/lib/types";
import { isRunningStatus } from "@/lib/statusCodes";

function isUp(site: Site) {
  return site.lastStatus === "UP" || isRunningStatus(site.lastCode);
}

export function ProjectList({
  sites,
  loading,
}: {
  sites: Site[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[10px] bg-[#eef0f3]"
          />
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
        No projects yet.{" "}
        <Link href="/admin" className="font-medium text-[var(--accent)] underline">
          Add one
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sites.map((site, index) => {
        const up = isUp(site);
        const down =
          !up &&
          !(site.lastStatus === "UNKNOWN" && site.lastCode == null && !site.lastError);

        return (
          <li
            key={site.id}
            className="project-row"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <Link
              href={`/projects/${site.id}`}
              className={`group flex items-center justify-between gap-3 rounded-[10px] border bg-white px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                down
                  ? "border-[#fecaca] hover:border-[var(--down)]"
                  : up
                    ? "border-[#a7f3d0] hover:border-[var(--up)]"
                    : "border-[var(--line)] hover:border-[var(--line-strong)]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`status-dot h-2.5 w-2.5 shrink-0 rounded-full ${
                    up ? "live-pulse bg-[var(--up)]" : down ? "bg-[var(--down)]" : "bg-[var(--muted)]"
                  }`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight group-hover:text-[var(--accent)]">
                    {site.name}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                    {site.url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-white"
                  style={{
                    background: up
                      ? "var(--up)"
                      : down
                        ? "var(--down)"
                        : "#6b7280",
                  }}
                >
                  {up ? "UP" : down ? "DOWN" : "…"}
                </span>
                <span className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                  →
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
