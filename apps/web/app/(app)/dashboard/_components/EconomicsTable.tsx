import { formatINRCompact } from "@stride-os/shared";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stride-os/ui";
import type { ChannelEconomicsRow } from "../_lib/dashboard";

const UNSETTLED_TITLE = "Awaiting settlement file. Upload Swiggy/Zomato annexure in /ingest.";

function formatNetPer100(value: number | null) {
  if (value == null) return "—";
  return `₹${Math.round(value)}`;
}

function renderNullableMoney(value: number | null) {
  if (value == null) {
    return (
      <span title={UNSETTLED_TITLE} className="cursor-help">
        —
      </span>
    );
  }

  return formatINRCompact(value / 100);
}

function SettlementBadge({ row }: { row: ChannelEconomicsRow }) {
  if (row.ordersTotal === 0) return null;

  if (row.ordersSettled === row.ordersTotal) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
      </div>
    );
  }

  if (row.ordersSettled === 0) {
    return (
      <Badge variant="secondary" className="bg-amber-500/12 text-amber-800 dark:text-amber-200">
        Awaiting settlement
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      {row.ordersSettled}/{row.ordersTotal} settled
    </Badge>
  );
}

export function EconomicsTable({ rows }: { rows: ChannelEconomicsRow[] }) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.ordersTotal += row.ordersTotal;
      acc.ordersSettled += row.ordersSettled;
      acc.ordersPending += row.ordersPending;
      acc.gross += row.grossPaise;
      acc.commission += row.commissionPaise ?? 0;
      acc.fees += row.feesPaise ?? 0;
      acc.net += row.netPaise ?? 0;
      acc.channelsWithSettled += row.ordersSettled > 0 ? 1 : 0;
      return acc;
    },
    {
      ordersTotal: 0,
      ordersSettled: 0,
      ordersPending: 0,
      gross: 0,
      commission: 0,
      fees: 0,
      net: 0,
      channelsWithSettled: 0,
    }
  );

  return (
    <div className="overflow-hidden rounded-[24px] border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Channel</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Gross</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Fees</TableHead>
            <TableHead>Net to us</TableHead>
            <TableHead>Net per ₹100</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.channel}>
              <TableCell className="font-medium">
                <div className="space-y-1.5">
                  <p>{row.label}</p>
                  <SettlementBadge row={row} />
                </div>
              </TableCell>
              <TableCell>{row.ordersTotal.toLocaleString("en-IN")}</TableCell>
              <TableCell>{formatINRCompact(row.grossPaise / 100)}</TableCell>
              <TableCell>{renderNullableMoney(row.commissionPaise)}</TableCell>
              <TableCell>{renderNullableMoney(row.feesPaise)}</TableCell>
              <TableCell>{renderNullableMoney(row.netPaise)}</TableCell>
              <TableCell className="font-mono text-base font-semibold">
                {row.netPerRs100 == null ? (
                  <span title={UNSETTLED_TITLE} className="cursor-help">
                    —
                  </span>
                ) : (
                  formatNetPer100(row.netPerRs100)
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="font-semibold">
              {totals.ordersTotal.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="font-semibold">{formatINRCompact(totals.gross / 100)}</TableCell>
            <TableCell className="font-semibold">
              {totals.channelsWithSettled > 0 ? formatINRCompact(totals.commission / 100) : "—"}
            </TableCell>
            <TableCell className="font-semibold">
              {totals.channelsWithSettled > 0 ? formatINRCompact(totals.fees / 100) : "—"}
            </TableCell>
            <TableCell className="font-semibold">
              {totals.channelsWithSettled > 0 ? formatINRCompact(totals.net / 100) : "—"}
            </TableCell>
            <TableCell className="font-mono text-base font-semibold">
              {totals.ordersSettled > 0 && totals.ordersPending === 0 && totals.gross > 0
                ? `₹${Math.round((totals.net / totals.gross) * 100)}`
                : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
