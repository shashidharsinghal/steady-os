import { Card, CardContent, CardHeader, CardTitle } from "@stride-os/ui";
import type { CustomerIdentityRow } from "../actions";

export function CustomerIdentitiesCard({ identities }: { identities: CustomerIdentityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Known identities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {identities.length === 0 ? (
          <p className="text-muted-foreground text-sm">No linked identities yet.</p>
        ) : (
          identities.map((identity) => (
            <div key={identity.id} className="bg-background/60 rounded-[16px] border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    {identity.kind.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {identity.display_value ?? identity.value}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">{identity.observation_count} seen</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
