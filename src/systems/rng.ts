let seededState: number | null = null;

/** Set a deterministic seed for tests. Production code never calls this. */
export function seed(value: number): void {
  seededState = value >>> 0;
}

/** Return to crypto.getRandomValues. */
export function unseed(): void {
  seededState = null;
}

/** True if the RNG is currently in seeded (deterministic) mode. */
export function isSeeded(): boolean {
  return seededState !== null;
}

/** Returns a uniformly-distributed integer in [min, max], both inclusive. */
export function randomInt(minInclusive: number, maxInclusive: number): number {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
    throw new TypeError('randomInt requires integer bounds');
  }
  if (maxInclusive < minInclusive) {
    throw new RangeError('randomInt: max must be >= min');
  }
  const range = maxInclusive - minInclusive + 1;
  return minInclusive + boundedRandom(range);
}

/** Fisher–Yates shuffle (in-place). Returns the same array for chaining. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Uniform random element. Throws if the array is empty. */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new RangeError('pick: array is empty');
  return arr[randomInt(0, arr.length - 1)]!;
}

// --- internals ---------------------------------------------------------------

function boundedRandom(range: number): number {
  if (seededState !== null) {
    return Math.floor(prng() * range);
  }
  // Crypto path with rejection sampling to avoid modulo bias.
  const maxUint32 = 0xff_ff_ff_ff;
  const cutoff = maxUint32 - (maxUint32 % range);
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const n = buf[0]!;
    if (n < cutoff) return n % range;
  }
}

/** mulberry32 — fast, deterministic, statistically OK for tests. */
function prng(): number {
  let s = seededState!;
  s = (s + 0x6d_2b_79_f5) >>> 0;
  seededState = s;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}
