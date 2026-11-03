import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  CheckPoint,
  MonitorState,
  PushSubscriptionRecord,
  Site,
  SiteRow,
  SiteStats,
} from "./types";

// Reuse one Neon client per serverless isolate
let sqlClient: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (sqlClient) return sqlClient;

  let url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1);
  }
  url = url
    .replace(/[&?]channel_binding=require/g, "")
    .replace("?&", "?")
    .replace(/\?$/, "");
  sqlClient = neon(url);
  return sqlClient;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function mapSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    lastStatus: row.last_status ?? "UNKNOWN",
    lastCode: row.last_code,
    lastLatency: row.last_latency,
    lastError: row.last_error,
    lastChecked: toIso(row.last_checked),
    lastChange: toIso(row.last_change),
  };
}

export async function listSites(): Promise<Site[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM sites
    ORDER BY name ASC
  `) as SiteRow[];
  return rows.map(mapSite);
}

export async function getSite(id: string): Promise<Site | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM sites WHERE id = ${id} LIMIT 1
  `) as SiteRow[];
  return rows[0] ? mapSite(rows[0]) : null;
}

export async function createSite(name: string, url: string): Promise<Site> {
  const sql = getSql();
  const id = crypto.randomUUID();
  const rows = (await sql`
    INSERT INTO sites (id, name, url)
    VALUES (${id}, ${name}, ${url})
    RETURNING *
  `) as SiteRow[];
  return mapSite(rows[0]);
}

export async function updateSite(
  id: string,
  name: string,
  url: string,
): Promise<Site | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE sites
    SET name = ${name}, url = ${url}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as SiteRow[];
  return rows[0] ? mapSite(rows[0]) : null;
}

export async function deleteSite(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM sites WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function saveCheck(
  siteId: string,
  result: {
    status: "UP" | "DOWN";
    statusCode: number | null;
    latencyMs: number | null;
    error: string | null;
  },
  previousStatus: string | null,
) {
  const sql = getSql();
  const checkId = crypto.randomUUID();
  const previous = previousStatus ?? "UNKNOWN";
  const statusChanged = previous !== result.status;
  const shouldAlert =
    statusChanged &&
    (previous === "UP" ||
      previous === "DOWN" ||
      (previous === "UNKNOWN" && result.status === "DOWN"));

  // One round-trip for insert + site update (prune occasionally elsewhere)
  await sql`
    WITH inserted AS (
      INSERT INTO checks (id, site_id, status, status_code, latency_ms, error)
      VALUES (
        ${checkId},
        ${siteId},
        ${result.status},
        ${result.statusCode},
        ${result.latencyMs},
        ${result.error}
      )
      RETURNING site_id
    )
    UPDATE sites
    SET
      last_status = ${result.status},
      last_code = ${result.statusCode},
      last_latency = ${result.latencyMs},
      last_error = ${result.error},
      last_checked = NOW(),
      last_change = CASE WHEN ${statusChanged} THEN NOW() ELSE last_change END,
      updated_at = NOW()
    WHERE id = ${siteId}
  `;

  return { changed: shouldAlert };
}

export async function pruneOldChecks() {
  const sql = getSql();
  await sql`
    DELETE FROM checks
    WHERE checked_at < NOW() - INTERVAL '7 days'
  `;
}

export async function getMonitorState(): Promise<MonitorState> {
  const sql = getSql();
  const rows = await sql`
    SELECT last_run_at, last_run_ok, last_run_count, last_error, last_status_email_at
    FROM monitor_state
    WHERE id = 'main'
    LIMIT 1
  `;

  if (!rows[0]) {
    return {
      lastRunAt: null,
      lastRunOk: null,
      lastRunCount: null,
      lastError: null,
      lastStatusEmailAt: null,
    };
  }

  return {
    lastRunAt: toIso(rows[0].last_run_at as Date | string | null),
    lastRunOk: (rows[0].last_run_ok as boolean | null) ?? null,
    lastRunCount: (rows[0].last_run_count as number | null) ?? null,
    lastError: (rows[0].last_error as string | null) ?? null,
    lastStatusEmailAt: toIso(
      rows[0].last_status_email_at as Date | string | null,
    ),
  };
}

export async function markMonitorRun(opts: {
  ok: boolean;
  count: number;
  error: string | null;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO monitor_state (id, last_run_at, last_run_ok, last_run_count, last_error)
    VALUES ('main', NOW(), ${opts.ok}, ${opts.count}, ${opts.error})
    ON CONFLICT (id) DO UPDATE SET
      last_run_at = NOW(),
      last_run_ok = ${opts.ok},
      last_run_count = ${opts.count},
      last_error = ${opts.error}
  `;
}

function buildStatsFromRows(
  siteId: string,
  rows: Record<string, unknown>[],
): SiteStats {
  const history: CheckPoint[] = rows
    .map((row) => ({
      status: row.status as "UP" | "DOWN",
      statusCode: (row.status_code as number | null) ?? null,
      latencyMs: (row.latency_ms as number | null) ?? null,
      checkedAt: toIso(row.checked_at as Date | string)!,
    }))
    .reverse();

  const checks = history.length;
  const upCount = history.filter((h) => h.status === "UP").length;
  const latencies = history
    .map((h) => h.latencyMs)
    .filter((n): n is number => n != null);
  let incidents = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1].status === "UP" && history[i].status === "DOWN") {
      incidents += 1;
    }
  }

  return {
    siteId,
    uptimePct: checks ? Math.round((upCount / checks) * 1000) / 10 : null,
    avgLatencyMs: latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null,
    checks,
    incidents,
    history,
  };
}

export async function getStatsForSite(
  siteId: string,
  limit = 48,
): Promise<SiteStats> {
  const sql = getSql();
  const rows = await sql`
    SELECT status, status_code, latency_ms, checked_at
    FROM checks
    WHERE site_id = ${siteId}
    ORDER BY checked_at DESC
    LIMIT ${limit}
  `;
  return buildStatsFromRows(siteId, rows as Record<string, unknown>[]);
}

/** Batch history for many sites in one query (avoids N+1). */
export async function getSiteStatsForIds(
  siteIds: string[],
  limitPerSite = 36,
): Promise<SiteStats[]> {
  if (siteIds.length === 0) return [];
  const sql = getSql();

  const rows = (await sql`
    SELECT site_id, status, status_code, latency_ms, checked_at
    FROM (
      SELECT
        site_id,
        status,
        status_code,
        latency_ms,
        checked_at,
        ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY checked_at DESC) AS rn
      FROM checks
      WHERE site_id = ANY(${siteIds})
    ) ranked
    WHERE rn <= ${limitPerSite}
    ORDER BY site_id, checked_at DESC
  `) as Array<Record<string, unknown>>;

  const bySite = new Map<string, Record<string, unknown>[]>();
  for (const id of siteIds) bySite.set(id, []);
  for (const row of rows) {
    const id = row.site_id as string;
    const bucket = bySite.get(id);
    if (bucket) bucket.push(row);
  }

  return siteIds.map((id) => buildStatsFromRows(id, bySite.get(id) ?? []));
}

export async function getSiteStats(limitPerSite = 36): Promise<SiteStats[]> {
  const sites = await listSites();
  return getSiteStatsForIds(
    sites.map((s) => s.id),
    limitPerSite,
  );
}

export async function markStatusEmailSent() {
  const sql = getSql();
  await sql`
    INSERT INTO monitor_state (id, last_status_email_at)
    VALUES ('main', NOW())
    ON CONFLICT (id) DO UPDATE SET last_status_email_at = NOW()
  `;
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const sql = getSql();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO push_subscriptions (id, endpoint, p256dh, auth)
    VALUES (${id}, ${input.endpoint}, ${input.p256dh}, ${input.auth})
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh = ${input.p256dh},
      auth = ${input.auth}
  `;
}

export async function deletePushSubscription(endpoint: string) {
  const sql = getSql();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, endpoint, p256dh, auth, created_at
    FROM push_subscriptions
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    id: row.id as string,
    endpoint: row.endpoint as string,
    p256dh: row.p256dh as string,
    auth: row.auth as string,
    createdAt: toIso(row.created_at as Date | string)!,
  }));
}

export async function getAdminPasswordHash(): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT password_hash FROM admin_auth WHERE id = 'main' LIMIT 1
  `;
  return (rows[0]?.password_hash as string | undefined) ?? null;
}

export async function setAdminPasswordHash(passwordHash: string) {
  const sql = getSql();
  await sql`
    INSERT INTO admin_auth (id, password_hash, updated_at)
    VALUES ('main', ${passwordHash}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      password_hash = ${passwordHash},
      reset_token = NULL,
      reset_expires = NULL,
      updated_at = NOW()
  `;
}

export async function setPasswordResetToken(token: string, expiresAt: Date) {
  const sql = getSql();
  // Ensure row exists first
  await sql`
    INSERT INTO admin_auth (id, password_hash, updated_at)
    VALUES ('main', '', NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    UPDATE admin_auth
    SET reset_token = ${token}, reset_expires = ${expiresAt.toISOString()}, updated_at = NOW()
    WHERE id = 'main'
  `;
}

export async function getPasswordResetToken(): Promise<{
  passwordHash: string | null;
  resetToken: string | null;
  resetExpires: string | null;
} | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT password_hash, reset_token, reset_expires
    FROM admin_auth WHERE id = 'main' LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    passwordHash: (rows[0].password_hash as string) || null,
    resetToken: (rows[0].reset_token as string | null) ?? null,
    resetExpires: toIso(rows[0].reset_expires as Date | string | null),
  };
}
