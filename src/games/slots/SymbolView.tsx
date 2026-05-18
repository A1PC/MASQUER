import type { JSX } from 'react';
import { SYMBOL_DISPLAY } from './symbols';
import type { Symbol as SymbolType } from './types';

export interface SymbolProps {
  symbol: SymbolType;
  /** Pixel size of the bounding box. Default 64. */
  size?: number;
  /** When true, adds a pulse + brighter glow. */
  winning?: boolean;
}

const NEON_GLOW_GOLD = '0 0 8px rgba(212,175,55,0.7), 0 0 16px rgba(212,175,55,0.3)';
const NEON_GLOW_MAGENTA =
  '0 0 8px rgba(255,92,242,1), 0 0 16px rgba(255,92,242,0.7), 0 0 24px rgba(255,92,242,0.4)';

export default function SymbolView({
  symbol,
  size = 64,
  winning = false,
}: SymbolProps): JSX.Element {
  const display = SYMBOL_DISPLAY[symbol];
  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: winning ? 'brightness(1.1)' : undefined,
  };

  return (
    <div
      data-symbol={symbol}
      data-neon={display.neon ? 'true' : 'false'}
      {...(winning ? { 'data-winning': 'true' } : {})}
      style={wrapperStyle}
      aria-label={display.label}
    >
      {symbol === 'cherry' && <CherryArt size={size} />}
      {symbol === 'lemon' && <LemonArt size={size} />}
      {symbol === 'bell' && <BellArt size={size} />}
      {symbol === 'bar' && <BarArt size={size} />}
      {symbol === 'seven' && <SevenArt size={size} />}
    </div>
  );
}

// ─── Per-symbol art (CSS-only) ───────────────────────────────────────────────

function CherryArt({ size }: { size: number }): JSX.Element {
  const ballSize = size * 0.66;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: '50%',
          width: 2,
          height: size * 0.22,
          background: '#4a7c2d',
          transform: 'translateX(-50%) rotate(15deg)',
          transformOrigin: 'top center',
          borderRadius: 1,
        }}
      />
      <div
        style={{
          width: ballSize,
          height: ballSize,
          marginTop: size * 0.15,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ff5050 0%, #c1080d 60%, #6b0408 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.4)',
        }}
      />
    </>
  );
}

function LemonArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.78;
  const h = size * 0.56;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 35% 30%, #ffe55a 0%, #f4c430 70%, #a07a00 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.3)',
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: -3,
          width: 8,
          height: 4,
          background: '#b8860b',
          borderRadius: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '50%',
          right: -3,
          width: 8,
          height: 4,
          background: '#b8860b',
          borderRadius: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}

function BellArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.65;
  const h = size * 0.7;
  return (
    <div
      style={{
        width: w,
        height: h,
        background: 'linear-gradient(180deg, #ffe066 0%, #d4af37 100%)',
        borderRadius: '50% 50% 30% 30% / 65% 65% 35% 35%',
        boxShadow: NEON_GLOW_GOLD,
        border: '1px solid #d4af37',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 7,
          height: 7,
          background: '#8b6914',
          borderRadius: '50%',
          bottom: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 4px rgba(212,175,55,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 9,
          height: 4,
          background: '#8b6914',
          borderRadius: 2,
          top: -2,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
}

function BarArt({ size }: { size: number }): JSX.Element {
  const w = size * 0.7;
  const h = size * 0.45;
  return (
    <div
      style={{
        width: w,
        height: h,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #06120c 100%)',
        border: '2px solid #d4af37',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffe066',
        fontFamily: 'Bungee, system-ui',
        fontSize: Math.round(size * 0.22),
        fontWeight: 'bold',
        boxShadow: NEON_GLOW_GOLD,
        textShadow: '0 0 4px rgba(255,224,102,0.8)',
        letterSpacing: 1,
      }}
    >
      BAR
    </div>
  );
}

function SevenArt({ size }: { size: number }): JSX.Element {
  return (
    <span
      style={{
        fontFamily: 'Bungee, system-ui',
        fontSize: Math.round(size * 0.6),
        color: '#ff5cf2',
        fontWeight: 900,
        textShadow: NEON_GLOW_MAGENTA,
        WebkitTextStroke: '0.5px #fff',
        lineHeight: 1,
      }}
    >
      7
    </span>
  );
}
