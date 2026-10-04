/** Miss counts: target item id → id of the item actually typed → count. */
export type Confusions = Record<string, Record<string, number>>;

export interface Confusion {
  target: string;
  typed: string;
  count: number;
}

export function addConfusion(c: Confusions, target: string, typed: string): Confusions {
  if (target === typed) return c;
  const row = c[target] ?? {};
  return { ...c, [target]: { ...row, [typed]: (row[typed] ?? 0) + 1 } };
}

/**
 * Typing the target right first time cancels one recorded mistake for each key it was confused with.
 * Pairs at zero are removed, so the list shrinks as you improve.
 */
export function clearConfusion(c: Confusions, target: string): Confusions {
  const row = c[target];
  if (!row) return c;
  const rest = Object.fromEntries(
    Object.entries(row)
      .map(([typed, count]) => [typed, count - 1] as const)
      .filter(([, count]) => count > 0),
  );
  const { [target]: _, ...others } = c;
  return Object.keys(rest).length ? { ...others, [target]: rest } : others;
}

/** Most frequent first; ties keep a stable order so the list doesn't jump around. */
export function topConfusions(c: Confusions, limit = Infinity): Confusion[] {
  const all = Object.entries(c).flatMap(([target, row]) =>
    Object.entries(row).map(([typed, count]) => ({ target, typed, count })),
  );
  all.sort((a, b) => b.count - a.count || a.target.localeCompare(b.target) || a.typed.localeCompare(b.typed));
  return all.slice(0, limit);
}

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** Unordered pairs with their combined counts, so "B for C" and "C for B" drill as one pair. */
export function confusedPairs(c: Confusions, limit = 8): { a: string; b: string; count: number }[] {
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const { target, typed, count } of topConfusions(c)) {
    const key = pairKey(target, typed);
    const p = pairs.get(key);
    if (p) p.count += count;
    else pairs.set(key, { a: target, b: typed, count });
  }
  return [...pairs.values()].sort((x, y) => y.count - x.count).slice(0, limit);
}

/** Every item that appears in a drilled pair. */
export function confusionItems(c: Confusions, limit = 8): string[] {
  return [...new Set(confusedPairs(c, limit).flatMap((p) => [p.a, p.b]))];
}

/**
 * The next two prompts for the confusions drill: one pair, shown back to back so you have to
 * tell the two chords apart. More frequent pairs come up more often; the last pair is skipped.
 */
export function nextPair(c: Confusions, lastKey: string | undefined, rng: () => number = Math.random): { key: string; ids: [string, string] } | undefined {
  const all = confusedPairs(c);
  const pool = all.length > 1 ? all.filter((p) => pairKey(p.a, p.b) !== lastKey) : all;
  if (!pool.length) return undefined;
  let r = rng() * pool.reduce((sum, p) => sum + p.count, 0);
  let chosen = pool[pool.length - 1];
  for (const p of pool) {
    r -= p.count;
    if (r < 0) {
      chosen = p;
      break;
    }
  }
  const ids: [string, string] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a];
  return { key: pairKey(chosen.a, chosen.b), ids };
}
