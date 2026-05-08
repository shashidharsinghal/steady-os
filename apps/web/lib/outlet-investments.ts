import { createClient } from "@/lib/supabase/server";

export type OutletInvestmentRecovery = {
  configured: boolean;
  openedOn: string | null;
  investedPaise: number | null;
  recoveredPaise: number;
  remainingPaise: number | null;
  recoveredPct: number | null;
  monthsToBreakEven: number | null;
  last30dProfitPaise: number;
  projectedBreakevenDate: string | null;
  paceVsPlanMonths: number | null;
  monthlyHistory: Array<{
    month: string;
    profitPaise: number;
    cumulativePaise: number;
  }>;
  bestMonth: { month: string; profitPaise: number } | null;
  avgMonthlyPaise: number | null;
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function diffMonths(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00+05:30`);
  const to = new Date(`${toDate}T00:00:00+05:30`);
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  );
}

export async function getInvestmentRecovery(outletId: string): Promise<OutletInvestmentRecovery> {
  const supabase = await createClient();
  const [{ data: outlet }, { data: rows }] = await Promise.all([
    supabase
      .from("outlets")
      .select("opened_on, total_invested_paise, projected_breakeven_date")
      .eq("id", outletId)
      .single(),
    supabase
      .from("outlet_monthly_profit")
      .select("month, net_profit_paise")
      .eq("outlet_id", outletId)
      .order("month", { ascending: true }),
  ]);

  const monthlyHistory = ((rows ?? []) as Array<{ month: string; net_profit_paise: number }>).map(
    (row) => ({
      month: row.month,
      profitPaise: Number(row.net_profit_paise ?? 0),
      cumulativePaise: 0,
    })
  );

  let cumulative = 0;
  for (const row of monthlyHistory) {
    cumulative += row.profitPaise;
    row.cumulativePaise = cumulative;
  }

  const recoveredPaise = cumulative;
  const investedPaise = outlet?.total_invested_paise ?? null;
  const remainingPaise = investedPaise != null ? Math.max(investedPaise - recoveredPaise, 0) : null;
  const recoveredPct =
    investedPaise != null && investedPaise > 0 ? (recoveredPaise / investedPaise) * 100 : null;
  const avgMonthlyPaise =
    monthlyHistory.length > 0
      ? Math.round(
          monthlyHistory.reduce((sum, row) => sum + row.profitPaise, 0) / monthlyHistory.length
        )
      : null;
  const monthsToBreakEven =
    investedPaise != null &&
    remainingPaise != null &&
    avgMonthlyPaise != null &&
    avgMonthlyPaise > 0
      ? remainingPaise / avgMonthlyPaise
      : null;

  const last30dProfitPaise = monthlyHistory.slice(-1)[0]?.profitPaise ?? 0;
  const bestMonth = monthlyHistory.reduce<{ month: string; profitPaise: number } | null>(
    (best, row) => (best == null || row.profitPaise > best.profitPaise ? row : best),
    null
  );

  let paceVsPlanMonths: number | null = null;
  if (outlet?.projected_breakeven_date && monthsToBreakEven != null && outlet.opened_on) {
    const targetMonths = diffMonths(outlet.opened_on, outlet.projected_breakeven_date);
    paceVsPlanMonths = Number((targetMonths - monthsToBreakEven).toFixed(1));
  }

  return {
    configured: Boolean(outlet?.opened_on && investedPaise != null),
    openedOn: outlet?.opened_on ?? null,
    investedPaise,
    recoveredPaise,
    remainingPaise,
    recoveredPct,
    monthsToBreakEven,
    last30dProfitPaise,
    projectedBreakevenDate: outlet?.projected_breakeven_date ?? null,
    paceVsPlanMonths,
    monthlyHistory: monthlyHistory.map((row) => ({
      month: monthKey(row.month),
      profitPaise: row.profitPaise,
      cumulativePaise: row.cumulativePaise,
    })),
    bestMonth: bestMonth
      ? { month: monthKey(bestMonth.month), profitPaise: bestMonth.profitPaise }
      : null,
    avgMonthlyPaise,
  };
}
