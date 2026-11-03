import type { CheckResult } from "./types";
import { describeStatusCode, isRunningStatus } from "./statusCodes";

const TIMEOUT_MS = 8_000;
const RETRIES = 1;
const RETRY_DELAY_MS = 350;

async function once(url: string): Promise<CheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "FelixServer/1.0 (+uptime-check)",
        Accept: "*/*",
      },
    });

    // Drain body quickly so sockets free up (don't need HTML)
    try {
      await res.arrayBuffer();
    } catch {
      // ignore body read errors
    }

    const latencyMs = Date.now() - started;
    const up = isRunningStatus(res.status);

    return {
      status: up ? "UP" : "DOWN",
      statusCode: res.status,
      latencyMs,
      error: up ? null : describeStatusCode(res.status),
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout after ${TIMEOUT_MS}ms — site down`
          : err.message
        : "Unknown error — site down";

    return {
      status: "DOWN",
      statusCode: null,
      latencyMs,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(url: string): Promise<CheckResult> {
  let last = await once(url);
  if (last.status === "UP") return last;

  for (let i = 0; i < RETRIES; i++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    last = await once(url);
    if (last.status === "UP") return last;
  }

  return last;
}

/** Run async tasks with a concurrency cap. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const agents = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => run(),
  );
  await Promise.all(agents);
  return results;
}
