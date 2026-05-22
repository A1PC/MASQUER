function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export interface Roll {
  d1: number;
  d2: number;
  total: number;
  isHard: boolean;
}

/** Roll two dice from a seeded rng. Each die uniform 1-6. */
export function rollDice(rng: () => number): Roll {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

/** Seeded rng factory for a session — game code seeds `${sessionId}.${rollNumber}`. */
export function rngFromSeed(seed: string): () => number {
  return mulberry32(stringSeed(seed));
}
