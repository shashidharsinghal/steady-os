import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@stride-os/ui";
import type { EmployeeSalaryHistoryEntry } from "@stride-os/shared";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalaryHistoryTable({ history }: { history: EmployeeSalaryHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-muted-foreground text-sm">No salary history recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Effective from</TableHead>
          <TableHead>Effective to</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Monthly salary</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.effective_from}</TableCell>
            <TableCell>{entry.effective_to ?? "Current"}</TableCell>
            <TableCell className="capitalize">{entry.reason}</TableCell>
            <TableCell className="text-right">{formatCurrency(entry.monthly_salary)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
