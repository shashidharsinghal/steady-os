export type MergeSuggestionInput = {
  id: string;
  name: string | null;
  primaryIdentifier: string;
  totalOrders: number;
  totalSpendPaise: number;
  lastSeenAt: string;
  identityCount: number;
  vpas: string[];
};

export type MergeSuggestion = {
  primaryCustomerId: string;
  secondaryCustomerId: string;
  confidence: number;
  reason: string;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9@.\s]/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeName(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function tokenizeVpa(vpa: string): string[] {
  const localPart = vpa.split("@")[0] ?? "";
  return normalizeText(localPart)
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function computeNameScore(name: string, vpa: string): number {
  const nameTokens = tokenizeName(name);
  const vpaTokens = tokenizeVpa(vpa);
  if (nameTokens.length === 0 || vpaTokens.length === 0) return 0;

  const overlap = nameTokens.filter((token) =>
    vpaTokens.some((candidate) => {
      if (candidate.includes(token) || token.includes(candidate)) return true;
      return token.slice(0, 3) !== "" && candidate.slice(0, 3) === token.slice(0, 3);
    })
  ).length;

  return overlap / Math.max(nameTokens.length, vpaTokens.length);
}

export function buildMergeSuggestions(
  customers: MergeSuggestionInput[],
  dismissedPairs: Set<string>
): MergeSuggestion[] {
  const suggestions = new Map<string, MergeSuggestion>();

  for (const left of customers) {
    if (!left.name) continue;

    for (const right of customers) {
      if (left.id === right.id) continue;
      if (right.vpas.length === 0) continue;

      const pairKey = [left.id, right.id].sort().join(":");
      if (dismissedPairs.has(pairKey)) continue;

      let bestScore = 0;
      let bestVpa: string | null = null;
      for (const vpa of right.vpas) {
        const score = computeNameScore(left.name, vpa);
        if (score > bestScore) {
          bestScore = score;
          bestVpa = vpa;
        }
      }

      if (bestScore < 0.8 || !bestVpa) continue;

      const primary =
        left.identityCount > right.identityCount ||
        (left.identityCount === right.identityCount &&
          left.totalSpendPaise >= right.totalSpendPaise)
          ? left
          : right;
      const secondary = primary.id === left.id ? right : left;

      const existing = suggestions.get(pairKey);
      if (!existing || existing.confidence < bestScore) {
        suggestions.set(pairKey, {
          primaryCustomerId: primary.id,
          secondaryCustomerId: secondary.id,
          confidence: Math.round(bestScore * 100),
          reason: `Name match against ${bestVpa}`,
        });
      }
    }
  }

  return Array.from(suggestions.values()).sort((a, b) => b.confidence - a.confidence);
}
