import type { JSX } from 'react';
import { useId } from 'react';
import { SYMBOL_DISPLAY } from './symbols';
import type { Symbol as SymbolType } from './types';

export interface SymbolProps {
  symbol: SymbolType;
  /** Pixel size of the bounding box. Default 64. */
  size?: number;
  /** When true, adds a pulse + brighter glow. */
  winning?: boolean;
}

/**
 * Slots symbol art — inline SVG, one drawing per symbol on a 64×64 viewBox.
 *
 * Phase 15 #7 replaces the original CSS-only `div`-stack symbols with
 * proper SVG drawings (radial-gradient fruit, brushed-brass plating,
 * `feGaussianBlur` neon for the jackpot Seven). The drawings target
 * MasquerCard's RoyalArt quality bar — designed, not coded.
 *
 * Each component receives a unique `gradId` from `useId()` so multiple
 * symbols on the same page don't collide on gradient IDs. The wrapper
 * div keeps the existing `data-symbol` / `data-neon` / `data-winning`
 * test contract.
 */
export default function SymbolView({
  symbol,
  size = 64,
  winning = false,
}: SymbolProps): JSX.Element {
  const display = SYMBOL_DISPLAY[symbol];
  const gradId = useId();
  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: winning ? 'brightness(1.12)' : undefined,
  };

  return (
    <div
      data-symbol={symbol}
      data-neon={display.neon ? 'true' : 'false'}
      {...(winning ? { 'data-winning': 'true' } : {})}
      style={wrapperStyle}
      aria-label={display.label}
      role="img"
    >
      {symbol === 'cherry' && <CherryArt size={size} gradId={gradId} />}
      {symbol === 'lemon' && <LemonArt size={size} gradId={gradId} />}
      {symbol === 'bell' && <BellArt size={size} gradId={gradId} winning={winning} />}
      {symbol === 'bar' && <BarArt size={size} gradId={gradId} winning={winning} />}
      {symbol === 'seven' && <SevenArt size={size} gradId={gradId} winning={winning} />}
    </div>
  );
}

// ─── Per-symbol art (inline SVG, drawn on a 64×64 viewBox) ─────────────────

interface ArtProps {
  size: number;
  gradId: string;
  winning?: boolean;
}

/**
 * Cherry — two glossy cherries with a curved stem and a veined leaf.
 * Radial-gradient fills give the fruit a 3D ball-bearing roundness;
 * a small white ellipse on each adds the gloss highlight.
 */
function CherryArt({ size, gradId }: ArtProps): JSX.Element {
  const fillL = `${gradId}-cherry-l`;
  const fillR = `${gradId}-cherry-r`;
  const fillLeaf = `${gradId}-cherry-leaf`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-art="cherry"
    >
      <defs>
        <radialGradient id={fillL} cx="0.32" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#ff8e95" />
          <stop offset="55%" stopColor="#c91426" />
          <stop offset="100%" stopColor="#5a0610" />
        </radialGradient>
        <radialGradient id={fillR} cx="0.34" cy="0.28" r="0.72">
          <stop offset="0%" stopColor="#ff9aa1" />
          <stop offset="55%" stopColor="#d4172a" />
          <stop offset="100%" stopColor="#62081a" />
        </radialGradient>
        <linearGradient id={fillLeaf} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6cbf3f" />
          <stop offset="100%" stopColor="#2f5e21" />
        </linearGradient>
      </defs>
      {/* Stems — two curves meeting at the leaf */}
      <path
        d="M22 38 C 24 24, 30 16, 34 12"
        stroke="#4a7c2d"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M40 38 C 38 26, 36 18, 36 14"
        stroke="#3d6824"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Leaf with central vein */}
      <path
        d="M36 14 C 46 10, 54 14, 52 22 C 46 22, 40 20, 36 14 Z"
        fill={`url(#${fillLeaf})`}
        stroke="#2f5e21"
        strokeWidth="0.4"
      />
      <path d="M37 15 C 42 17, 47 19, 51 21" stroke="#244818" strokeWidth="0.3" fill="none" />
      {/* Left cherry (slightly behind) */}
      <circle cx="22" cy="44" r="11" fill={`url(#${fillL})`} stroke="#3a050c" strokeWidth="0.6" />
      <ellipse cx="18.5" cy="40.5" rx="3" ry="2" fill="#fff" opacity="0.55" />
      {/* Right cherry (foreground) */}
      <circle cx="42" cy="46" r="12" fill={`url(#${fillR})`} stroke="#3a050c" strokeWidth="0.6" />
      <ellipse cx="38.5" cy="42" rx="3.2" ry="2.2" fill="#fff" opacity="0.6" />
      {/* Soft ground shadow */}
      <ellipse cx="33" cy="60" rx="20" ry="1.6" fill="#000" opacity="0.35" />
    </svg>
  );
}

/**
 * Lemon — an oblong citrus body with peel stippling, leaf-stem nubs at
 * the poles, and a soft drop-shadow. Stipple positions are deterministic
 * (hand-tuned) so renders are stable across test runs.
 */
function LemonArt({ size, gradId }: ArtProps): JSX.Element {
  const fill = `${gradId}-lemon-fill`;
  const shadowFilter = `${gradId}-lemon-shadow`;
  // Hand-placed peel stipples — deterministic, no RNG.
  const STIPPLE: ReadonlyArray<readonly [number, number, number]> = [
    [16, 30, 0.7],
    [21, 38, 0.6],
    [28, 24, 0.7],
    [36, 28, 0.6],
    [44, 34, 0.7],
    [48, 26, 0.6],
    [20, 26, 0.5],
    [32, 38, 0.6],
    [40, 22, 0.5],
    [24, 34, 0.5],
    [44, 40, 0.5],
    [36, 40, 0.6],
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-art="lemon"
    >
      <defs>
        <radialGradient id={fill} cx="0.35" cy="0.32" r="0.72">
          <stop offset="0%" stopColor="#fff7c4" />
          <stop offset="55%" stopColor="#f4c430" />
          <stop offset="100%" stopColor="#8a6300" />
        </radialGradient>
        <filter id={shadowFilter} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Leaf-stem nubs (poles) */}
      <ellipse cx="9" cy="32" rx="4" ry="2.2" fill="#a07a00" />
      <ellipse cx="55" cy="32" rx="4" ry="2.2" fill="#a07a00" />
      {/* Lemon body */}
      <g filter={`url(#${shadowFilter})`}>
        <ellipse
          cx="32"
          cy="32"
          rx="22"
          ry="14"
          fill={`url(#${fill})`}
          stroke="#7a5a00"
          strokeWidth="0.5"
        />
      </g>
      {/* Peel stipples */}
      {STIPPLE.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#a07a00" opacity="0.65" />
      ))}
      {/* Soft highlight crescent */}
      <ellipse cx="22" cy="24" rx="9" ry="3" fill="#fff" opacity="0.4" />
    </svg>
  );
}

/**
 * Bell — gold bell with a brushed-brass body, brass crown/hanger, and
 * a clapper ball with its own highlight. Optional motion flourishes
 * skipped — bells read cleaner without them at the new ~110px cell size.
 */
function BellArt({ size, gradId, winning }: ArtProps): JSX.Element {
  const fillBody = `${gradId}-bell-body`;
  const fillCrown = `${gradId}-bell-crown`;
  const fillClapper = `${gradId}-bell-clapper`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-art="bell"
    >
      <defs>
        <linearGradient id={fillBody} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0a0" />
          <stop offset="40%" stopColor="#ffd24a" />
          <stop offset="85%" stopColor="#b8893a" />
          <stop offset="100%" stopColor="#7a5b1d" />
        </linearGradient>
        <linearGradient id={fillCrown} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6c068" />
          <stop offset="100%" stopColor="#8c6a26" />
        </linearGradient>
        <radialGradient id={fillClapper} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#5e4310" />
        </radialGradient>
      </defs>
      {/* Crown / hanger */}
      <rect x="29" y="7" width="6" height="4" rx="1" fill={`url(#${fillCrown})`} />
      <ellipse cx="32" cy="11" rx="5" ry="1.6" fill="#8c6a26" />
      {/* Bell body — domed silhouette */}
      <path
        d="M16 50
           C 16 32, 22 12, 32 12
           C 42 12, 48 32, 48 50
           Z"
        fill={`url(#${fillBody})`}
        stroke="#5a4218"
        strokeWidth="0.6"
      />
      {/* Bell base flare */}
      <rect x="14" y="48" width="36" height="4" rx="1.4" fill="#a07520" />
      <rect x="14" y="48" width="36" height="1.4" fill="#fff" opacity="0.35" />
      {/* Inner highlight stripe — gives the brushed-brass read */}
      <path
        d="M22 18 C 24 28, 24 36, 24 46"
        stroke="#fff7c4"
        strokeWidth="1.2"
        opacity="0.6"
        fill="none"
      />
      {/* Clapper */}
      <circle
        cx="32"
        cy="56"
        r="3.4"
        fill={`url(#${fillClapper})`}
        stroke="#3e2b08"
        strokeWidth="0.4"
      />
      <ellipse cx="31" cy="55" rx="1" ry="0.6" fill="#fff" opacity="0.7" />
      {/* Winning halo */}
      {winning && (
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#ffe066"
          strokeWidth="0.8"
          opacity="0.5"
        />
      )}
    </svg>
  );
}

/**
 * BAR — chrome nameplate. Brushed-brass plate with bevels on every edge,
 * embossed dark "BAR" lettering, and a top-edge highlight line.
 */
function BarArt({ size, gradId, winning }: ArtProps): JSX.Element {
  const fillPlate = `${gradId}-bar-plate`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-art="bar"
    >
      <defs>
        <linearGradient id={fillPlate} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0a0" />
          <stop offset="35%" stopColor="#e6c068" />
          <stop offset="65%" stopColor="#b8893a" />
          <stop offset="100%" stopColor="#5e4310" />
        </linearGradient>
      </defs>
      {/* Plate */}
      <rect x="6" y="22" width="52" height="20" rx="3" fill={`url(#${fillPlate})`} />
      {/* Bevels — top highlight + bottom shadow */}
      <line x1="8" y1="23.5" x2="56" y2="23.5" stroke="#fff7c4" strokeWidth="0.6" opacity="0.85" />
      <line x1="8" y1="41" x2="56" y2="41" stroke="#3e2b08" strokeWidth="0.6" opacity="0.7" />
      <line x1="7" y1="24" x2="7" y2="40" stroke="#fff7c4" strokeWidth="0.4" opacity="0.55" />
      <line x1="57" y1="24" x2="57" y2="40" stroke="#3e2b08" strokeWidth="0.4" opacity="0.55" />
      {/* Embossed shadow letter */}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="Bungee, system-ui, sans-serif"
        fontWeight="700"
        fontSize="14"
        fill="#3e2b08"
        opacity="0.55"
      >
        BAR
      </text>
      {/* Main letter */}
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontFamily="Bungee, system-ui, sans-serif"
        fontWeight="700"
        fontSize="14"
        fill="#1a1206"
      >
        BAR
      </text>
      {winning && (
        <rect
          x="4"
          y="20"
          width="56"
          height="24"
          rx="4"
          fill="none"
          stroke="#ffe066"
          strokeWidth="0.8"
          opacity="0.6"
        />
      )}
    </svg>
  );
}

/**
 * Seven — magenta neon tubing 7. Real `feGaussianBlur` + `feMerge` glow,
 * outer halo stroke + inner bright stroke + white inner highlight.
 * This is the jackpot signature (ADR-0033).
 */
function SevenArt({ size, gradId, winning }: ArtProps): JSX.Element {
  const glow = `${gradId}-seven-glow`;
  // Stylized "7" path: top bar + diagonal hook + small cross-stroke.
  // Drawn deliberately deco — sharp top corner, gentle diagonal flare.
  const SEVEN_PATH = 'M 18 18 L 48 18 L 32 52';
  const CROSS_PATH = 'M 26 36 L 38 36';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      data-art="seven"
    >
      <defs>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${glow})`}>
        {/* Outer halo tube */}
        <path
          d={SEVEN_PATH}
          stroke="#ff5cf2"
          strokeOpacity="0.35"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d={CROSS_PATH}
          stroke="#ff5cf2"
          strokeOpacity="0.35"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Bright inner tube */}
        <path
          d={SEVEN_PATH}
          stroke="#ff5cf2"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d={CROSS_PATH} stroke="#ff5cf2" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* White hot-core highlight */}
        <path
          d={SEVEN_PATH}
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />
        <path
          d={CROSS_PATH}
          stroke="#ffffff"
          strokeWidth="0.7"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </g>
      {winning && (
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#ff5cf2"
          strokeWidth="0.8"
          opacity="0.5"
        />
      )}
    </svg>
  );
}
