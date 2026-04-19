import { formatINRCompact } from "@stride-os/shared";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stride-os/ui";
import type { DashboardChannelEconomicsRow } from "../_lib/dashboard";

export function ChannelEconomicsTable({ rows }: { rows: DashboardChannelEconomicsRow[] }) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.grossRevenuePaise += row.grossRevenuePaise;
      acc.commissionFeesPaise += row.commissionFeesPaise;
      acc.netToUsPaise += row.netToUsPaise;
      acc.orders += row.orders;
      return acc;
    },
    { grossRevenuePaise: 0, commissionFeesPaise: 0, netToUsPaise: 0, orders: 0 }
  );

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Fees</TableHead>
              <TableHead>Net to us</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>AOV</TableHead>
              <TableHead>Net margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>{formatINRCompact(row.grossRevenuePaise / 100)}</TableCell>
                <TableCell>{formatINRCompact(row.commissionFeesPaise / 100)}</TableCell>
                <TableCell>{formatINRCompact(row.netToUsPaise / 100)}</TableCell>
                <TableCell>{row.orders.toLocaleString("en-IN")}</TableCell>
                <TableCell>{formatINRCompact(row.aovPaise / 100)}</TableCell>
                <TableCell>{row.netMarginPct.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="font-semibold">
                {formatINRCompact(totals.grossRevenuePaise / 100)}
              </TableCell>
              <TableCell className="font-semibold">
                {formatINRCompact(totals.commissionFeesPaise / 100)}
              </TableCell>
              <TableCell className="font-semibold">
                {formatINRCompact(totals.netToUsPaise / 100)}
              </TableCell>
              <TableCell className="font-semibold">
                {totals.orders.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="font-semibold">
                {totals.orders > 0
                  ? formatINRCompact(Math.round(totals.grossRevenuePaise / totals.orders) / 100)
                  : "—"}
              </TableCell>
              <TableCell className="font-semibold">
                {totals.grossRevenuePaise > 0
                  ? `${((totals.netToUsPaise / totals.grossRevenuePaise) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
