"use client";

export function CountdownTimer({
  seconds,
  checking,
  label = "Next check",
  size = "md",
  variant = "card",
}: {
  seconds: number;
  checking?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "card" | "toolbar";
}) {
  const display = checking ? 0 : Math.max(0, seconds);
  const progress =
    checking || display <= 0
      ? 100
      : Math.min(100, ((60 - display) / 60) * 100);

  if (variant === "toolbar") {
    return (
      <div className="toolbar-timer" title={checking ? "Checking now" : label}>
        <span className="toolbar-timer__label">
          {checking ? "Checking" : "Next"}
        </span>
        <span key={checking ? "go" : display} className="toolbar-timer__value">
          {checking ? "…" : `${String(display).padStart(2, "0")}s`}
        </span>
        <span className="toolbar-timer__track" aria-hidden>
          <span
            className="toolbar-timer__fill"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>
    );
  }

  const dim =
    size === "lg"
      ? { wrap: "min-w-[7.5rem]", num: "text-4xl", label: "text-xs" }
      : size === "sm"
        ? { wrap: "min-w-[4.5rem]", num: "text-xl", label: "text-[10px]" }
        : { wrap: "min-w-[5.5rem]", num: "text-2xl", label: "text-[11px]" };

  return (
    <div
      className={`countdown-shell relative overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--panel)] ${dim.wrap} px-3 py-2.5 text-center`}
    >
      <div
        className="countdown-bar absolute inset-x-0 bottom-0 h-1 origin-left bg-[var(--accent)] transition-transform duration-1000 ease-linear"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <p className={`eyebrow ${dim.label}`}>{checking ? "Checking" : label}</p>
      <p
        key={checking ? "go" : display}
        className={`countdown-digit mt-1 font-mono font-semibold tracking-tight text-[var(--ink)] ${dim.num}`}
      >
        {checking ? (
          <span className="inline-flex items-center gap-1">
            <span className="live-pulse inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
            …
          </span>
        ) : (
          <>
            {String(display).padStart(2, "0")}
            <span className="ml-0.5 text-[0.55em] font-medium text-[var(--muted)]">
              s
            </span>
          </>
        )}
      </p>
    </div>
  );
}
