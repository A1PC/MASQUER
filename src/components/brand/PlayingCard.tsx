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
/* Royal silhouettes — Jack / Queen / King (filled in by Task A.2)     */
/* ------------------------------------------------------------------ */

interface RoyalArtProps {
  rank: 11 | 12 | 13;
  red: boolean;
  size: { w: number; h: number };
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RoyalArt(_: RoyalArtProps): JSX.Element {
  // Stub — replaced with full SVG silhouettes in Task A.2.
  return <span />;
}
