import { NextResponse } from "next/server";
import { runChecks } from "@/lib/monitor";
import { markMonitorRun } from "@/lib/db";

export async function POST() {
  try {
    const results = await runChecks();
    await markMonitorRun({
      ok: true,
      count: results.length,
      error: null,
    });
    return NextResponse.json({
      ok: true,
      checked: results.length,
      results,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    await markMonitorRun({ ok: false, count: 0, error: message }).catch(() => {});
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
