import Link from "next/link";
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
import type { CustomerProfileRow } from "../actions";
import { CustomerChannelIcons } from "./CustomerChannelIcons";
import { SegmentBadge } from "./SegmentBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  return days === 0 ? "today" : `${days}d ago`;
}

export function CustomerListTable({ rows }: { rows: CustomerProfileRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>First seen</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{row.primary_identifier}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.identity_count} identit{row.identity_count === 1 ? "y" : "ies"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <SegmentBadge segment={row.highest_segment} />
                </TableCell>
                <TableCell>{row.total_orders.toLocaleString("en-IN")}</TableCell>
                <TableCell>{formatINRCompact(row.total_spend_paise / 100)}</TableCell>
                <TableCell>
                  <CustomerChannelIcons
                    hasAggregatorOrders={row.has_aggregator_orders}
                    hasDineIn={row.has_dine_in}
                  />
                </TableCell>
                <TableCell>{formatDate(row.first_seen_at)}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p>{formatDate(row.last_seen_at)}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelative(row.last_seen_at)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/customers/${row.id}`} className="text-primary text-sm font-medium">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
