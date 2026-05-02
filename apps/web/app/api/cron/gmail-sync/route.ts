import { NextResponse } from "next/server";
import { syncAllGmailConnections } from "@/lib/gmail/sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === secret || headerSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllGmailConnections("cron_primary");
    return NextResponse.json({
      ok: true,
      trigger: "cron_primary",
      syncedConnections: result.results.length,
      results: result.results.map((entry) => ({
        status: entry.status,
        syncRunId: entry.syncRunId,
        emailsFound: entry.emailsFound,
        emailsProcessed: entry.emailsProcessed,
        emailsSkipped: entry.emailsSkipped,
        ingestionRunIds: entry.ingestionRunIds,
      })),
    });
  } catch (error) {
    console.error("gmail-sync cron failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
