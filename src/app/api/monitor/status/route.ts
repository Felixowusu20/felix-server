import { NextResponse } from "next/server";
import { getMonitorState, getSiteStatsForIds, listSites } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const light = searchParams.get("light") === "1";

    const [state, sites] = await Promise.all([
      getMonitorState(),
      listSites(),
    ]);

    const latestSiteCheck = sites.reduce<string | null>((latest, site) => {
      if (!site.lastChecked) return latest;
      if (!latest || site.lastChecked > latest) return site.lastChecked;
      return latest;
    }, null);

    if (light) {
      return NextResponse.json(
        {
          state,
          siteCount: sites.length,
          latestSiteCheck,
          sites,
          stats: [],
        },
        {
          headers: {
            "Cache-Control": "private, max-age=3",
          },
        },
      );
    }

    const stats = await getSiteStatsForIds(
      sites.map((s) => s.id),
      36,
    );

    return NextResponse.json(
      {
        state,
        siteCount: sites.length,
        latestSiteCheck,
        sites,
        stats,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5",
        },
      },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load monitor status" },
      { status: 500 },
    );
  }
}
