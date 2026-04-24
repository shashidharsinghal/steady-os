import { formatINRCompact } from "@stride-os/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@stride-os/ui";
import type { ChannelEconomicsRow } from "../_lib/dashboard";

function formatNetPer100(value: number | null) {
  if (value == null) return "—";
  return `₹${Math.round(value)}`;
}

export function EconomicsTable({ rows }: { rows: ChannelEconomicsRow[] }) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.orders += row.orders;
      acc.gross += row.grossPaise;
      acc.commission += row.commissionPaise;
      acc.fees += row.feesPaise;
      acc.net += row.netPaise;
      return acc;
    },
    { orders: 0, gross: 0, commission: 0, fees: 0, net: 0 }
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
                <div className="space-y-0.5">
                  <p>{row.label}</p>
                  {row.awaitingParser ? (
                    <p className="text-muted-foreground text-xs">Awaiting parser</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{row.orders.toLocaleString("en-IN")}</TableCell>
              <TableCell>{formatINRCompact(row.grossPaise / 100)}</TableCell>
              <TableCell>
                {row.commissionPaise > 0 ? formatINRCompact(row.commissionPaise / 100) : "—"}
              </TableCell>
              <TableCell>
                {row.feesPaise > 0 ? formatINRCompact(row.feesPaise / 100) : "—"}
              </TableCell>
              <TableCell>
                {row.netPaise > 0
                  ? formatINRCompact(row.netPaise / 100)
                  : row.awaitingParser
                    ? "—"
                    : "₹0"}
              </TableCell>
              <TableCell className="font-mono text-base font-semibold">
                {row.awaitingParser ? "—" : formatNetPer100(row.netPerRs100)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="font-semibold">{totals.orders.toLocaleString("en-IN")}</TableCell>
            <TableCell className="font-semibold">{formatINRCompact(totals.gross / 100)}</TableCell>
            <TableCell className="font-semibold">
              {totals.commission > 0 ? formatINRCompact(totals.commission / 100) : "—"}
            </TableCell>
            <TableCell className="font-semibold">
              {totals.fees > 0 ? formatINRCompact(totals.fees / 100) : "—"}
            </TableCell>
            <TableCell className="font-semibold">{formatINRCompact(totals.net / 100)}</TableCell>
            <TableCell className="font-mono text-base font-semibold">
              {totals.gross > 0 ? `₹${Math.round((totals.net / totals.gross) * 100)}` : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
