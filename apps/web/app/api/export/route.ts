import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";

const datasetTables: Record<string, string> = {
  sales: "sales_orders",
  expenses: "expenses",
  customers: "customers",
  inventory: "inventory_items",
};

export async function GET(request: Request) {
  const role = await getRole();
  if (role !== "partner") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const outletId = url.searchParams.get("outletId");
  const dataset = url.searchParams.get("dataset") ?? "";
  const table = datasetTables[dataset];
  if (!outletId || !table) return NextResponse.json({ error: "Invalid export" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .eq("outlet_id", outletId)
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dataset}.csv"`,
    },
  });
}
