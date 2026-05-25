import type { JSX } from 'react';
import MaskMark from './MaskMark';
import { cn } from '@/components/ui';

export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type CardSize = 'sm' | 'md' | 'lg';

interface PlayingCardProps {
  rank: Rank;
  suit: Suit;
  faceDown?: boolean;
  size?: CardSize;
  className?: string;
}

const SUIT_GLYPH: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_RED = new Set<Suit>(['h', 'd']);

const SIZE_PX: Record<
  CardSize,
  { w: number; h: number; corner: number; pip: number; cinzel: number }
> = {
  sm: { w: 64, h: 90, corner: 12, pip: 26, cinzel: 11 },
  md: { w: 100, h: 140, corner: 18, pip: 44, cinzel: 14 },
  lg: { w: 130, h: 182, corner: 22, pip: 54, cinzel: 18 },
};

function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

/**
 * MasquerCard — the shared playing card used by every card game in MASQUER.
 *
 * Visual: porcelain face (ivory linear gradient) + inset gold border + Cormorant
 * Garamond corner ranks + suit glyphs / royal silhouettes in the centre.
 * Backface: oxblood weave with a Colombina mask centrepiece and a Cinzel "M".
 *
 * Colour notes: the card's brand colours (porcelain gradient stops, oxblood
 * weave, gold border, suit ink) are intrinsic to the playing-card artwork and
 * appear as documented inline literals — they mirror the token values in
 * `src/theme/tokens.ts` (porcelain `#ffffff` → `#f6efde` → `#e2d4b6`, velvet
 * `#5a1320` / velvet-deep, gold `#e6c068`, brass `#c79a4b`, jewel-ruby for the
 * red suits, bg-surface `#0c1711` for the black suits). Per the plan, Tailwind
 * tokens are used wherever a class can express the value (`border-gold`,
 * `border-brass`, `text-gold`), and inline literals are used only for the
 * gradient / repeating-pattern / inset-shadow expressions Tailwind can't model.
 */
export default function PlayingCard({
  rank,
  suit,
  faceDown = false,
  size = 'md',
  className,
}: PlayingCardProps): JSX.Element {
  const dim = SIZE_PX[size];
  const label = rankLabel(rank);
  const glyph = SUIT_GLYPH[suit];
  const red = SUIT_RED.has(suit);

  if (faceDown) {
    return (
      <div
        role="img"
        aria-label="Face-down card"
        className={cn(
          'relative rounded-[10px] border-2 border-gold',
          'shadow-[0_6px_18px_rgba(0,0,0,0.55)]',
          'bg-[repeating-linear-gradient(45deg,#5a1320_0_7px,#4a0f1a_7px_14px)]',
          'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-[6px] before:border before:border-gold/60',
          className,
        )}
        style={{ width: dim.w, height: dim.h }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <MaskMark variant="simple" size={Math.round(dim.w * 0.5)} title="MASQUER mask" />
          <span
            className="font-display tracking-[0.3em] text-gold"
            style={{ fontSize: dim.cinzel }}
          >
            M
          </span>
        </div>
      </div>
    );
  }

  const color = red ? '#a3122a' : '#0c1711';
  const isRoyal = rank === 11 || rank === 12 || rank === 13;

  return (
    <div
      className={cn(
        'relative rounded-[10px] border border-brass',
        'bg-gradient-to-b from-[#fffcf2] via-[#f6efde] to-[#e2d4b6]',
        'shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_0_0_4px_#fffcf2,inset_0_0_0_5px_#e6c068]',
        'before:pointer-events-none before:absolute before:inset-2 before:rounded-[6px] before:border before:border-brass/45',
        className,
      )}
      style={{ width: dim.w, height: dim.h, color }}
    >
      <Corner top left rank={label} glyph={glyph} size={dim.corner} />
      <div className="absolute inset-0 flex items-center justify-center">
        {isRoyal ? (
          <RoyalArt rank={rank} red={red} size={dim} />
        ) : (
          <span className="font-display" style={{ fontSize: rank === 1 ? dim.pip * 1.4 : dim.pip }}>
            {glyph}
          </span>
        )}
      </div>
      <Corner bottom right rank={label} glyph={glyph} size={dim.corner} />
    </div>
  );
}

interface CornerProps {
  rank: string;
  glyph: string;
  size: number;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}
function Corner({ rank, glyph, size, top, bottom, left, right }: CornerProps): JSX.Element {
  const pos = cn(
    'absolute',
    top && 'top-2.5',
    bottom && 'bottom-2.5',
    left && 'left-3',
    right && 'right-3',
    bottom && 'rotate-180',
  );
  return (
    <div
      className={pos}
      style={{
        fontFamily: '"Cormorant Garamond", serif',
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <div>{rank}</div>
      <div style={{ fontSize: size * 0.8, marginTop: 2 }}>{glyph}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Royal silhouettes — Jack / Queen / King                             */
/*                                                                     */
/* Deco crown + masquerade eye-mask + drape, in gold linework with     */
/* the suit's drape colour (oxblood for red, ink for black). Sized to  */
/* ~74% of the card's inner area. Decorative — `aria-hidden`; the      */
/* card's rank label is exposed via the corner text for screen readers.*/
/* ------------------------------------------------------------------ */

interface RoyalArtProps {
  rank: 11 | 12 | 13;
  red: boolean;
  size: { w: number; h: number };
}
function RoyalArt({ rank, red, size }: RoyalArtProps): JSX.Element {
  const drape = red ? '#5a1320' : '#0c1711';
  const gold = '#c79a4b';
  const face = '#f2e7cc';
  const w = Math.round(size.w * 0.74);
  const h = Math.round(size.h * 0.66);
  return (
    <svg width={w} height={h} viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect
        x="3"
        y="3"
        width="94"
        height="124"
        fill="none"
        stroke={gold}
        strokeWidth="0.9"
        rx="4"
      />
      {rank === 11 && <Jack drape={drape} gold={gold} face={face} />}
      {rank === 12 && <Queen drape={drape} gold={gold} face={face} />}
      {rank === 13 && <King drape={drape} gold={gold} face={face} />}
    </svg>
  );
}

interface FigProps {
  drape: string;
  gold: string;
  face: string;
}
function Jack({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      {/* hooded courtier — pointed cowl */}
      <path
        d="M30,32 L50,18 L70,32 Q72,46 70,68 Q72,84 70,108 L30,108 Q28,84 30,68 Q28,46 30,32 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="60" rx="13" ry="16" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M38,57 C41,54 59,54 62,57 Q59,64 50,64 Q41,64 38,57 Z" fill={gold} />
      <circle cx="44" cy="59" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="59" r="1.2" fill="#0c1711" />
      <path d="M28,108 L72,108 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
    </>
  );
}
function Queen({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      <g fill={gold}>
        <path d="M30,30 L36,18 L42,28 L50,14 L58,28 L64,18 L70,30 Z" />
        <circle cx="50" cy="14" r="2.2" fill="#a3122a" />
        <circle cx="36" cy="18" r="1.6" />
        <circle cx="64" cy="18" r="1.6" />
      </g>
      <path
        d="M28,36 Q26,55 30,70 Q34,80 32,98 L36,108 L64,108 L68,98 Q66,80 70,70 Q74,55 72,36 Q60,44 50,40 Q40,44 28,36 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="58" rx="14" ry="17" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M37,55 C40,52 60,52 63,55 Q60,62 50,62 Q40,62 37,55 Z" fill={gold} />
      <circle cx="44" cy="57" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="57" r="1.2" fill="#0c1711" />
      <path d="M46,68 Q50,71 54,68" stroke="#a3122a" strokeWidth="1.3" fill="none" />
      <path d="M28,108 L72,108 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
      <path d="M48,118 l3,4 l-3,4 l-3,-4 Z" fill={gold} />
    </>
  );
}
function King({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      <g fill={gold}>
        <path d="M28,32 L34,14 L44,28 L50,10 L56,28 L66,14 L72,32 Z" />
        <circle cx="50" cy="10" r="2.4" fill={drape} />
      </g>
      <path
        d="M24,38 Q24,55 28,70 Q32,82 32,102 L36,112 L64,112 L68,102 Q68,82 72,70 Q76,55 76,38 Q60,46 50,42 Q40,46 24,38 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="58" rx="14" ry="17" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M37,55 C40,52 60,52 63,55 Q60,62 50,62 Q40,62 37,55 Z" fill={gold} />
      <circle cx="44" cy="57" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="57" r="1.2" fill="#0c1711" />
      <path d="M44,68 Q50,72 56,68" stroke="#0c1711" strokeWidth="1.4" fill="none" />
      <path d="M42,72 Q46,80 50,72 Q54,80 58,72" fill="none" stroke="#0c1711" strokeWidth="1.2" />
      <path d="M28,112 L72,112 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
    </>
  );
}
