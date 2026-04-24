import { getLapsedRegulars } from "../actions";
import { LapsedRegularsTable } from "../_components/LapsedRegularsTable";

export default async function LapsedCustomersPage() {
  const rows = await getLapsedRegulars();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Lapsed regulars</h1>
        <p className="text-muted-foreground text-sm">
          Customers who were valuable and have gone quiet. Sorted by lifetime spend.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground rounded-[20px] border border-dashed py-16 text-center">
          No lapsed regulars yet.
        </div>
      ) : (
        <LapsedRegularsTable rows={rows} />
      )}
    </div>
  );
}
