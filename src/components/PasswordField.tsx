"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "./icons";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete = "current-password",
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="text-sm font-medium text-[var(--ink)]" htmlFor={id}>
        {label}
      </label>
      <div className="password-field mt-1.5">
        <span className="password-field__icon" aria-hidden>
          <LockIcon className="h-4 w-4" />
        </span>
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="password-field__input"
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
