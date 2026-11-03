import { NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { runChecks } from "@/lib/monitor";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const site = await getSite(id);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [result] = await runChecks([site]);
  return NextResponse.json({ result });
}
