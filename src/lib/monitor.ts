import { checkUrl, mapPool } from "./checker";
import {
  getMonitorState,
  listSites,
  markStatusEmailSent,
  pruneOldChecks,
  saveCheck,
} from "./db";
import {
  sendStatusAlert,
  sendStatusDigest,
  statusEmailIntervalMinutes,
} from "./mail";
import { sendPushToAll } from "./push";
import type { CheckResult, Site } from "./types";

const CHECK_CONCURRENCY = 5;

type AlertJob = {
  site: Site;
  result: CheckResult;
};

export async function runChecks(sites?: Site[]) {
  const targets = sites ?? (await listSites());

  const alertJobs: AlertJob[] = [];

  const results = await mapPool(targets, CHECK_CONCURRENCY, async (site) => {
    const result = await checkUrl(site.url);
    const { changed } = await saveCheck(site.id, result, site.lastStatus);

    if (changed) {
      alertJobs.push({ site, result });
    }

    return {
      id: site.id,
      name: site.name,
      ...result,
      alerted: changed,
    };
  });

  // Fire alerts in parallel so they don't block the next scan cycle
  if (alertJobs.length > 0) {
    await Promise.allSettled(
      alertJobs.map(async ({ site, result }) => {
        const down = result.status === "DOWN";
        await Promise.allSettled([
          sendStatusAlert({
            siteName: site.name,
            siteUrl: site.url,
            status: result.status,
            statusCode: result.statusCode,
            latencyMs: result.latencyMs,
            error: result.error,
          }),
          sendPushToAll({
            title: down
              ? `🔴 ${site.name} is DOWN`
              : `🟢 ${site.name} is back UP`,
            body: down
              ? `${result.error || `HTTP ${result.statusCode ?? "error"}`} · open for details`
              : `Recovered · HTTP ${result.statusCode ?? "ok"} · ${result.latencyMs ?? "n/a"} ms`,
            url: `/projects/${site.id}`,
            tag: `site-${site.id}`,
          }),
        ]);
      }),
    );
  }

  // Digest + occasional prune (non-blocking relative to check latency)
  await Promise.allSettled([
    maybeSendDigestEmail(targets),
    // ~10% of runs prune old history to keep DB lean
    Math.random() < 0.1
      ? pruneOldChecks()
      : Promise.resolve(),
  ]);

  return results;
}

async function maybeSendDigestEmail(knownSites?: Site[]) {
  const intervalMin = statusEmailIntervalMinutes();
  const state = await getMonitorState();
  const last = state.lastStatusEmailAt
    ? new Date(state.lastStatusEmailAt).getTime()
    : 0;
  const due = Date.now() - last >= intervalMin * 60_000;
  if (!due) return;

  const sites = knownSites ?? (await listSites());
  if (sites.length === 0) {
    await markStatusEmailSent();
    return;
  }

  // Prefer freshest status from DB after checks
  const fresh = await listSites();
  await sendStatusDigest(fresh.length ? fresh : sites);

  const up = fresh.filter((s) => s.lastStatus === "UP").length;
  const down = fresh.filter((s) => s.lastStatus === "DOWN").length;
  await sendPushToAll({
    title:
      down > 0
        ? `Monitor digest · ${down} DOWN`
        : `Monitor digest · all clear`,
    body: `${up} up · ${down} down · ${fresh.length} projects · open dashboard`,
    url: "/",
    tag: "status-digest",
  }).catch(() => {});

  await markStatusEmailSent();
}
