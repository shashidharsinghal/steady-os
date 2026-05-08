import { NextResponse } from "next/server";
import { generateRecurringExpenses } from "@/lib/expenses";

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
    const result = await generateRecurringExpenses();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("expenses-recurring cron failed", error);
    return NextResponse.json({ error: "Recurring expense generation failed" }, { status: 500 });
  }
}
