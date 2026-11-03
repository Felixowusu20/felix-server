import { NextResponse } from "next/server";
import { markMonitorRun } from "@/lib/db";
import { runChecks } from "@/lib/monitor";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
