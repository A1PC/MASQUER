/**
 * Shared session-bootstrap helpers for all poker variants.
 *
 * Hold'em, 5-Card-Draw and Omaha all need the same per-session RNG, seed-from-id
 * derivation, archetype picker, machine-input builder, session-id generator and
 * win-tier classifier. Prior to this module each variant carried byte-identical
 * copies (audit §2.10 P1). Centralising here removes ~100 LOC from each variant
 * page and prevents drift in the shared poker language (PRs G10/G11/G12).
 *
 * No game-rule logic lives here — only seeding, naming and tier classification.
 */
import type { Archetype } from './ai/archetypes';
import { assignMaskName } from './maskNames';

/** Stakes shape — small/big blind ints, in chips. */
export interface Stakes {
  sb: number;
  bb: number;
}

/** Mask-name'd AI seat used to bootstrap the per-variant machine. */
export interface AiArchetypeSeat {
  archetype: Archetype;
  name: string;
  stack: number;
}

/** Machine input shape shared by all three poker variant machines. */
export interface SessionMachineInput {
  sessionId: string;
  buyIn: number;
  tableSize: number;
  stakes: Stakes;
  aiArchetypes: AiArchetypeSeat[];
}

/** Win-tier classification for ShowdownReveal — duplicated WinTier-compatible. */
export type SessionWinTier = 'loss' | 'small' | 'medium' | 'jackpot';

/** Variant prefix used in `makeSessionId`. */
export type PokerVariant = 'poker' | 'draw' | 'omaha';

// ── Seeded mulberry32 (same algo as deck.ts, but per-session) ────────────────
//
// Each session derives its RNG from a fresh `sessionId` so that hands within a
// session replay deterministically given the id, but a brand-new sit-down gets
// a brand-new sequence. Identical to deck.ts's mulberry32 — kept inline rather
// than re-exported so this module has no system-level dependencies.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** DJB2-style hash → uint32 seed for `mulberry32`. */
export function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Pick one of the four canonical archetypes uniformly via the supplied RNG. */
export function pickArchetype(rng: () => number): Archetype {
  const archetypes: Archetype[] = ['rock', 'station', 'maniac', 'shark'];
  return archetypes[Math.floor(rng() * archetypes.length)]!;
}

/**
 * Build the initial machine input — mask names hide the AI archetype from the
 * player; the variant's `decide*()` still gets the real archetype internally,
 * the UI only ever sees the mask name. AI stack defaults to `bb * 80`.
 */
export function buildMachineInput(
  sessionId: string,
  buyIn: number,
  tableSize: number,
  stakes: Stakes,
  rng: () => number,
): SessionMachineInput {
  const maskNames = assignMaskName(rng, tableSize);
  const aiArchetypes: AiArchetypeSeat[] = Array.from({ length: tableSize - 1 }, (_, i) => {
    const archetype = pickArchetype(rng);
    const name = maskNames[i]!;
    const stack = stakes.bb * 80;
    return { archetype, name, stack };
  });
  return { sessionId, buyIn, tableSize, stakes, aiArchetypes };
}

/**
 * Generate a fresh session id of the form `<variant>-<ms>-<u32>`. The u32 is
 * pulled from `crypto.getRandomValues` (NOT `Math.random` — that's banned by
 * the codebase's lint rule per CLAUDE.md). Variant prefix lets log-grep
 * disambiguate replays across the three poker games.
 */
export function makeSessionId(variant: PokerVariant): string {
  const seedBuf = new Uint32Array(1);
  crypto.getRandomValues(seedBuf);
  return `${variant}-${Date.now()}-${seedBuf[0]!}`;
}

/**
 * Win-tier classification per Phase 15 spec §4.4. Tiers feed ShowdownReveal
 * to pick between the small / medium / jackpot reveal animations.
 */
export function pickWinTier(wonAmount: number, committed: number): SessionWinTier {
  if (wonAmount <= 0) return 'loss';
  const ratio = wonAmount / Math.max(1, committed);
  if (ratio >= 20) return 'jackpot';
  if (ratio >= 2) return 'medium';
  return 'small';
}
