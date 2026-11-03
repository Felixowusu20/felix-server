"use client";

import { useTheme, type ThemeMode } from "@/lib/theme";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, resolved, setMode, toggle } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="theme-toggle-btn"
        aria-label={
          resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
        title={resolved === "dark" ? "Light mode" : "Dark mode"}
      >
        {resolved === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <div
      className="theme-segment"
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`theme-segment__btn ${
            mode === opt.value ? "theme-segment__btn--active" : ""
          }`}
          onClick={() => setMode(opt.value)}
          aria-pressed={mode === opt.value}
        >
          {opt.value === "light" ? (
            <SunIcon />
          ) : opt.value === "dark" ? (
            <MoonIcon />
          ) : (
            <SystemIcon />
          )}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M3 12h1.5M19.5 12H21M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
      <path d="M8 19.5h8" />
      <path d="M12 16.5v3" />
    </svg>
  );
}
