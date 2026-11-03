import { NextResponse } from "next/server";
import { createSite, listSites } from "@/lib/db";

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const sites = await listSites();
    return NextResponse.json({ sites });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load sites. Is DATABASE_URL configured and schema applied?" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const existing = await listSites();
  if (existing.length >= 20) {
    return NextResponse.json(
      { error: "Site limit reached (20)" },
      { status: 400 },
    );
  }

  try {
    const site = await createSite(name, url);
    return NextResponse.json({ site }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not create site (URL may already exist)" },
      { status: 400 },
    );
  }
}
