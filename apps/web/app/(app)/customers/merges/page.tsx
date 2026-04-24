import { getMergeSuggestions } from "../actions";
import { MergeSuggestionCard } from "../_components/MergeSuggestionCard";

export default async function CustomerMergesPage() {
  const suggestions = await getMergeSuggestions();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Suggested merges</h1>
        <p className="text-muted-foreground text-sm">
          Partner-reviewed matches between aggregator names and Pine Labs identities.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-muted-foreground rounded-[20px] border border-dashed py-16 text-center">
          No merge suggestions are queued right now.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <MergeSuggestionCard
              key={`${suggestion.primaryCustomer.id}-${suggestion.secondaryCustomer.id}`}
              suggestion={suggestion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
