/**
 * Canonical chip palette — single source of truth for every game's chip
 * picker. Hex values (rather than Tailwind tokens) because the chip face,
 * border, and inner ring all need to compose against arbitrary game
 * backdrops, and tailwind-merge cannot resolve the `inset` boxShadow trick.
 *
 * Keep this record dense and uncluttered: each entry is the visual identity
 * of a single denomination. If a new game introduces a new denomination,
 * add its style here — DO NOT branch on game name.
 *
 * Imported by `<ChipDenominationButton />` (and its tests). Splitting the
 * record out of the component file keeps Vite's react-refresh boundary
 * clean (the component file exports only components).
 */
export const CHIP_STYLES: Record<
  number,
  { bg: string; border: string; text: string; inner?: string }
> = {
  1: { bg: '#fff', border: '#fff', text: '#06120c', inner: '#06120c' },
  5: { bg: '#e85d75', border: '#e85d75', text: '#fff', inner: '#fff' },
  25: { bg: '#27c4d6', border: '#27c4d6', text: '#fff', inner: '#fff' },
  100: { bg: '#3dd17a', border: '#3dd17a', text: '#fff', inner: '#fff' },
  // 250 — gold/brass mid-tier chip (roulette only). Brass face, ivory border,
  // ivory text, brass inner ring. Lives in the same Velvet Deco family as
  // the 1000 high-roller chip.
  250: { bg: '#c79a4b', border: '#f2e7cc', text: '#06120c', inner: '#f2e7cc' },
  500: { bg: '#1a1a1a', border: '#d4af37', text: '#ffe066' },
  // 1000 — the high-roller chip. Velvet (oxblood) face with a brass border
  // and ivory text, slotting into the MASQUER Velvet Deco palette while
  // staying visually distinct from the black-and-gold 500.
  1000: { bg: '#5a1320', border: '#c79a4b', text: '#f2e7cc', inner: '#c79a4b' },
};

/** Display label — `1000` is rendered as `1K` to fit the chip face. */
export function chipLabel(denomination: number): string {
  return denomination >= 1000 ? `${denomination / 1000}K` : String(denomination);
}
