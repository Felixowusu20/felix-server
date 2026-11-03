-- Run this once in your Neon SQL editor (or any Postgres client).

CREATE TABLE IF NOT EXISTS sites (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status   TEXT CHECK (last_status IN ('UP', 'DOWN', 'UNKNOWN')) DEFAULT 'UNKNOWN',
  last_code     INTEGER,
  last_latency  INTEGER,
  last_error    TEXT,
  last_checked  TIMESTAMPTZ,
  last_change   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS checks (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('UP', 'DOWN')),
  status_code INTEGER,
  latency_ms  INTEGER,
  error       TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checks_site_checked_idx ON checks (site_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS monitor_state (
  id                   TEXT PRIMARY KEY DEFAULT 'main',
  last_run_at          TIMESTAMPTZ,
  last_run_ok          BOOLEAN,
  last_run_count       INTEGER,
  last_error           TEXT,
  last_status_email_at TIMESTAMPTZ
);

INSERT INTO monitor_state (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_auth (
  id             TEXT PRIMARY KEY DEFAULT 'main',
  password_hash  TEXT NOT NULL DEFAULT '',
  reset_token    TEXT,
  reset_expires  TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
