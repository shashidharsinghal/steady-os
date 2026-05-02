import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@stride-os/ui";
import { formatINRCompact } from "@stride-os/shared";

type RankingRow = {
  key: string;
  value: number;
  count: number;
};

type PaymentPreviewPayload = {
  sourceType: "petpooja_payment_summary";
  businessDate: string | null;
  invoiceCount: number;
  successfulCount: number;
  cancelledCount: number;
  revenuePaise: number;
  paymentMix: RankingRow[];
  cancelledInvoices: Array<{ invoiceNo: string; amountPaise: number; method: string }>;
  settlementSummary: { settledCount: number; pendingCount: number };
  warning: string | null;
};

type ItemPreviewPayload = {
  sourceType: "petpooja_item_bill";
  businessDate: string | null;
  invoiceCount: number;
  lineItemCount: number;
  linkedLineItemCount: number;
  missingOrderCount: number;
  warning: string | null;
  topCategories: RankingRow[];
  topItems: RankingRow[];
};

type Payload = PaymentPreviewPayload | ItemPreviewPayload;

function formatBusinessDate(value: string | null): string {
  if (!value) return "Business date pending";
  return new Date(`${value}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(value: string): string {
  return value
    .replace("online_aggregator", "online")
    .replace("not_paid", "not paid")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RankingList({ title, rows }: { title: string; rows: RankingRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold uppercase">{title}</p>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No rows yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 truncate">{methodLabel(row.key)}</span>
              <span className="shrink-0 font-medium">{formatINRCompact(row.value / 100)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PetpoojaDailyPreviewCard({ payload }: { payload: Payload }) {
  if (payload.sourceType === "petpooja_payment_summary") {
    return (
      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <p className="text-sm font-semibold">
              Petpooja Payment Summary — {formatBusinessDate(payload.businessDate)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {payload.invoiceCount} invoices: {payload.successfulCount} successful ·{" "}
              {payload.cancelledCount} cancelled
            </p>
          </div>

          {payload.warning ? <Warning text={payload.warning} /> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[16px] border p-4">
              <p className="text-muted-foreground text-xs">Revenue</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatINRCompact(payload.revenuePaise / 100)}
              </p>
            </div>
            <div className="rounded-[16px] border p-4">
              <p className="text-muted-foreground text-xs">Settlement status</p>
              <p className="mt-1 text-sm font-medium">
                {payload.settlementSummary.settledCount} settled ·{" "}
                {payload.settlementSummary.pendingCount} pending
              </p>
            </div>
          </div>

          <RankingList title="Payment mix" rows={payload.paymentMix} />

          {payload.cancelledInvoices.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              Cancelled:{" "}
              {payload.cancelledInvoices
                .map(
                  (invoice) =>
                    `Invoice ${invoice.invoiceNo} (${methodLabel(invoice.method)} ${formatINRCompact(invoice.amountPaise / 100)})`
                )
                .join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="text-sm font-semibold">
            Petpooja Item Wise Bill — {formatBusinessDate(payload.businessDate)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {payload.invoiceCount} invoices · {payload.lineItemCount} line items
          </p>
        </div>

        {payload.warning ? <Warning text={payload.warning} /> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <RankingList title="Top categories" rows={payload.topCategories} />
          <RankingList title="Top items" rows={payload.topItems} />
        </div>
      </CardContent>
    </Card>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}
