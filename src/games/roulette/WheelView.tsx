import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { POCKET_ORDER, colorOf } from './wheel';
import type { PocketColor } from './types';

export interface WheelProps {
  /** Winning number 0..36 when known; null during idle/betting. */
  targetNumber: number | null;
  /** True during the spinning state. Triggers the wheel + ball animation. */
  spinning: boolean;
  /** True after the round settles. Triggers the winning-pocket pulse. */
  settled: boolean;
  /**
   * Spin animation duration in ms. Default 5000. When 0, the wheel snaps to
   * `targetNumber` without any animated transition (reduced-motion path).
   */
  durationMs?: number;
  /**
   * True when `prefers-reduced-motion` is set. Used to skip non-rotation
   * animations (pocket pulse, ball orbit transition).
   */
  reducedMotion?: boolean;
}

// ─── Pocket ring geometry ────────────────────────────────────────────────────

const POCKET_FILL: Record<PocketColor, string> = {
  red: '#a3122a',
  black: '#1a1a1a',
  green: '#3dd17a',
};

const POCKET_RING_SIZE = 248;
const CX = POCKET_RING_SIZE / 2;
const CY = POCKET_RING_SIZE / 2;
const R_OUTER = 124;
const R_INNER = 76;
const LABEL_R = 100;
const ARC_DEG = 360 / 37;
const R_BALL = (R_OUTER + R_INNER) / 2;
const BALL_SIZE = 14;

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(startDeg: number, endDeg: number): string {
  const startOuter = polar(CX, CY, R_OUTER, startDeg);
  const endOuter = polar(CX, CY, R_OUTER, endDeg);
  const endInner = polar(CX, CY, R_INNER, endDeg);
  const startInner = polar(CX, CY, R_INNER, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Wheel({
  targetNumber,
  spinning,
  settled,
  durationMs = 5000,
  reducedMotion = false,
}: WheelProps): JSX.Element {
  // Rotation math
  //
  // Goal: when the wheel stops, the winning pocket sits under the fixed gold
  // pointer at the top (viewport angle 0), so the pointer + ball + the
  // RNG-decided number all visually agree.
  //
  // Pocket N starts at wheel-local angle θ_N (clockwise from top). After
  // rotating the wheel by R, its viewport angle is (θ_N + R) mod 360. For
  // pocket N to land at viewport 0 we need R ≡ -θ_N (mod 360), i.e.
  // R = 360 − θ_N. Add 5 full turns of clockwise rotation for the spin drama.
  const targetIdx = targetNumber !== null ? POCKET_ORDER.indexOf(targetNumber) : 0;
  const thetaDeg = targetIdx * ARC_DEG;
  const settledRotation = targetNumber === null ? 0 : 360 - thetaDeg;
  const rotateTarget = spinning ? 5 * 360 + settledRotation : settledRotation;

  // Reduced-motion / snap path
  const effectiveDurationSec = reducedMotion || durationMs === 0 ? 0 : durationMs / 1000;

  // Pulse logic
  const pulseEnabled = settled && targetNumber !== null && !reducedMotion;

  return (
    <div
      role="img"
      aria-label={
        targetNumber !== null ? `Roulette wheel, current target ${targetNumber}` : 'Roulette wheel'
      }
      className="relative h-[320px] w-[320px]"
      data-spinning={spinning}
      data-settled={settled}
      data-target={targetNumber ?? ''}
      data-reduced-motion={reducedMotion}
      data-duration-ms={durationMs}
    >
      {/* Pointer — fixed gold triangle at top */}
      <div
        data-roulette-layer="pointer"
        className="absolute -top-3 left-1/2 z-30 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #d4af37',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      />

      {/* Outer wooden ring with brass border + GOLDEN NEON GLOW halo */}
      <div
        data-roulette-layer="outer-ring"
        className="absolute inset-0 rounded-full bg-gradient-to-br from-roulette-wood-light via-roulette-wood to-roulette-wood-dark"
        style={{
          boxShadow:
            '0 0 24px rgba(212,175,55,0.6), 0 0 48px rgba(212,175,55,0.35), 0 0 72px rgba(212,175,55,0.15), inset 0 0 0 6px #d4af37, inset 0 0 0 8px #1a1a1a, 0 8px 32px rgba(0,0,0,0.7)',
        }}
      />

      {/* Ball track */}
      <div
        data-roulette-layer="ball-track"
        className="absolute inset-[22px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(70,45,25,0.4), transparent 60%)',
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.3), inset 0 2px 8px rgba(0,0,0,0.6)',
        }}
      />

      {/* Pocket ring — 37 SVG arcs */}
      <div data-roulette-layer="pocket-ring" className="absolute inset-[36px] rounded-full">
        <motion.svg
          viewBox={`0 0 ${POCKET_RING_SIZE} ${POCKET_RING_SIZE}`}
          width={POCKET_RING_SIZE}
          height={POCKET_RING_SIZE}
          className="overflow-visible"
          data-rotate-target={rotateTarget}
          data-transition-duration={effectiveDurationSec}
          animate={{ rotate: rotateTarget }}
          transition={
            effectiveDurationSec === 0
              ? { duration: 0 }
              : { duration: effectiveDurationSec, ease: [0.16, 1, 0.3, 1] }
          }
          style={{ originX: '50%', originY: '50%' }}
        >
          <circle cx={CX} cy={CY} r={R_OUTER} fill="#0b1f17" />
          {POCKET_ORDER.map((n, i) => {
            const startDeg = i * ARC_DEG;
            const endDeg = (i + 1) * ARC_DEG;
            const midDeg = (startDeg + endDeg) / 2;
            const labelPos = polar(CX, CY, LABEL_R, midDeg);
            const color = colorOf(n);
            const isWinner = pulseEnabled && n === targetNumber;
            return (
              <g
                key={n}
                data-pocket={n}
                data-color={color}
                {...(isWinner ? { 'data-pulse': 'true' } : {})}
              >
                <path
                  d={donutSlicePath(startDeg, endDeg)}
                  fill={POCKET_FILL[color]}
                  stroke={isWinner ? '#fff' : '#d4af37'}
                  strokeWidth={isWinner ? 2 : 0.5}
                  style={
                    isWinner
                      ? {
                          filter:
                            color === 'red'
                              ? 'drop-shadow(0 0 8px rgba(163,18,42,1)) drop-shadow(0 0 16px rgba(163,18,42,0.6))'
                              : color === 'green'
                                ? 'drop-shadow(0 0 8px rgba(61,209,122,1)) drop-shadow(0 0 16px rgba(61,209,122,0.6))'
                                : 'drop-shadow(0 0 8px rgba(255,255,255,0.85)) drop-shadow(0 0 16px rgba(255,255,255,0.45))',
                        }
                      : undefined
                  }
                />
                <text
                  data-pocket-label={n}
                  x={labelPos.x}
                  y={labelPos.y}
                  transform={`rotate(${midDeg} ${labelPos.x} ${labelPos.y})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={0.4}
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {n}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#d4af37" strokeWidth={2} />
        </motion.svg>
      </div>

      {/* Hub */}
      <div
        data-roulette-layer="hub"
        className="absolute inset-[120px] rounded-full bg-gradient-to-br from-roulette-wood-light via-roulette-wood to-roulette-wood-dark"
        style={{
          boxShadow: '0 0 0 2px #d4af37, 0 0 0 3px #1a1a1a, inset 0 0 20px rgba(0,0,0,0.5)',
        }}
      />

      {/* Silver turret cross */}
      <div data-roulette-layer="turret" className="pointer-events-none absolute inset-[120px]">
        <div
          className="absolute left-[6px] right-[6px] top-1/2 h-[10px] -translate-y-1/2 rounded"
          style={{
            background:
              'linear-gradient(180deg, #f4f4f4 0%, #b8b8b8 40%, #888 50%, #b8b8b8 60%, #f4f4f4 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
        <div
          className="absolute bottom-[6px] left-1/2 top-[6px] w-[10px] -translate-x-1/2 rounded"
          style={{
            background:
              'linear-gradient(180deg, #f4f4f4 0%, #b8b8b8 40%, #888 50%, #b8b8b8 60%, #f4f4f4 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 z-10 h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #f4f4f4 0%, #c0c0c0 40%, #707070 90%)',
            boxShadow:
              '0 0 0 2px #d4af37, 0 0 12px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      {/* Pearl ball — orbits counter-clockwise during the spin and lands at
          viewport top, which (per the rotation math above) is exactly over the
          winning pocket once the wheel stops. The orbit happens via a
          motion-wrapper that rotates around the wheel centre; the ball element
          itself is fixed at angular 0 inside that wrapper. */}
      {targetNumber !== null &&
        (() => {
          const idx = POCKET_ORDER.indexOf(targetNumber);
          const pos = polar(CX, CY, R_BALL, 0); // ball is always at top inside the wrapper
          const left = 36 + pos.x - BALL_SIZE / 2;
          const top = 36 + pos.y - BALL_SIZE / 2;
          return (
            <motion.div
              data-roulette-layer="ball-orbit"
              className="pointer-events-none absolute inset-0 z-20"
              style={{ transformOrigin: '50% 50%' }}
              animate={{ rotate: spinning ? -5 * 360 : 0 }}
              transition={
                effectiveDurationSec === 0
                  ? { duration: 0 }
                  : spinning
                    ? { duration: effectiveDurationSec, ease: [0.16, 1, 0.3, 1] }
                    : { duration: 0 }
              }
            >
              <div
                data-roulette-layer="ball"
                data-pocket={targetNumber}
                data-pocket-index={idx}
                className="absolute rounded-full"
                style={{
                  width: BALL_SIZE,
                  height: BALL_SIZE,
                  left,
                  top,
                  background:
                    'radial-gradient(circle at 30% 25%, #ffffff 0%, #fff5e8 30%, #f0e0c8 60%, #c9b896 100%)',
                  boxShadow:
                    '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,220,180,0.4), 0 1px 2px rgba(0,0,0,0.4)',
                }}
              />
            </motion.div>
          );
        })()}
    </div>
  );
}
