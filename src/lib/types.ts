export type SiteStatus = "UP" | "DOWN" | "UNKNOWN";

export type Site = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  lastStatus: SiteStatus;
  lastCode: number | null;
  lastLatency: number | null;
  lastError: string | null;
  lastChecked: string | null;
  lastChange: string | null;
};

export type CheckResult = {
  status: "UP" | "DOWN";
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
};

export type MonitorState = {
  lastRunAt: string | null;
  lastRunOk: boolean | null;
  lastRunCount: number | null;
  lastError: string | null;
  lastStatusEmailAt: string | null;
};

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
};

export type CheckPoint = {
  status: "UP" | "DOWN";
  statusCode: number | null;
  latencyMs: number | null;
  checkedAt: string;
};

export type SiteStats = {
  siteId: string;
  uptimePct: number | null;
  avgLatencyMs: number | null;
  checks: number;
  incidents: number;
  history: CheckPoint[];
};

export type SiteRow = {
  id: string;
  name: string;
  url: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_status: SiteStatus | null;
  last_code: number | null;
  last_latency: number | null;
  last_error: string | null;
  last_checked: Date | string | null;
  last_change: Date | string | null;
};
