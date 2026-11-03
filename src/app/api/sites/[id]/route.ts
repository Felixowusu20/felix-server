import { NextResponse } from "next/server";
import { deleteSite, getSite, getStatsForSite, updateSite } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const site = await getSite(id);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stats = await getStatsForSite(id, 60);
  return NextResponse.json({ site, stats });
}

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    url?: string;
  } | null;

  const name = body?.name?.trim() ?? "";
  const url = body?.url ? normalizeUrl(body.url) : null;

  if (!name || !url) {
    return NextResponse.json(
      { error: "Valid name and http(s) URL are required" },
      { status: 400 },
    );
  }

  const site = await updateSite(id, name, url);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ site });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteSite(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
