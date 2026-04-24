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
import { SegmentBadge } from "./SegmentBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LapsedRegularsTable({ rows }: { rows: CustomerProfileRow[] }) {
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
              <TableHead>Last seen</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.primary_identifier}</TableCell>
                <TableCell>
                  <SegmentBadge segment={row.highest_segment} />
                </TableCell>
                <TableCell>{row.total_orders}</TableCell>
                <TableCell>{formatINRCompact(row.total_spend_paise / 100)}</TableCell>
                <TableCell>{formatDate(row.last_seen_at)}</TableCell>
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
