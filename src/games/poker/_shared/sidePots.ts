export interface SidePot {
  amount: number;
  eligibleSeatIds: number[];
}

export interface Contribution {
  seatId: number;
  committed: number;
  folded: boolean;
}

/** Build ordered pots (main first) from each seat's total hand contribution.
 *  Folded players' chips stay in the pots but they are never eligible to win. */
export function computeSidePots(contributions: Contribution[]): SidePot[] {
  const pots: SidePot[] = [];
  // distinct positive commitment levels, ascending
  const levels = [...new Set(contributions.map((c) => c.committed).filter((x) => x > 0))].sort(
    (a, b) => a - b,
  );
  let prev = 0;
  for (const level of levels) {
    const layer = level - prev;
    let amount = 0;
    const eligible: number[] = [];
    for (const c of contributions) {
      if (c.committed >= level) {
        amount += layer; // this seat contributes a full layer
        if (!c.folded) eligible.push(c.seatId);
      } else if (c.committed > prev) {
        amount += c.committed - prev; // partial (this seat is all-in below the level)
      }
    }
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligibleSeatIds: eligible });
    } else if (amount > 0 && eligible.length === 0) {
      // everyone at this layer folded — fold the chips into the previous pot
      if (pots.length > 0) pots[pots.length - 1]!.amount += amount;
    }
    prev = level;
  }
  return pots;
}
