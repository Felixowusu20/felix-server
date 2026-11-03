"use client";

import type { ReactNode } from "react";

export function IconField({
  id,
  label,
  value,
  onChange,
  icon,
  placeholder,
  type = "text",
  required = false,
  hint,
  mono = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--ink)]" htmlFor={id}>
        {label}
      </label>
      <div className="icon-field mt-1.5">
        <span className="icon-field__icon" aria-hidden>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={`icon-field__input ${mono ? "font-mono text-[13px]" : ""}`}
        />
      </div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
