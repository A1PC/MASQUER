import type { Variant } from './logic';

export interface BallStyle {
  /** CSS gradient string for the ball fill (radial gradient). */
  fill: string;
  /** CSS color for the ball ring/border. */
  ring: string;
  /** CSS text color for the number. */
  textColor: string;
}

/** Returns the ball style for a given value + variant.
 *  British uses traditional UK 9-decile palette.
 *  American uses traditional 5-column BINGO palette. */
export function ballPaletteFor(value: number, variant: Variant): BallStyle {
  if (variant === 'british') return britishBallStyle(value);
  return americanBallStyle(value);
}

function britishBallStyle(value: number): BallStyle {
  if (value <= 9) return makeStyle('#fffaf0', '#e0d8c0', '#1a1a1a'); // white/cream
  if (value <= 19) return makeStyle('#ff5050', '#a00000', '#fff'); // red
  if (value <= 29) return makeStyle('#fff070', '#c8a000', '#1a1a1a'); // yellow
  if (value <= 39) return makeStyle('#60d060', '#208020', '#fff'); // green
  if (value <= 49) return makeStyle('#c68040', '#7a4010', '#fff'); // brown/orange
  if (value <= 59) return makeStyle('#5080d0', '#1a3060', '#fff'); // blue
  if (value <= 69) return makeStyle('#ff90c0', '#c04080', '#1a1a1a'); // pink
  if (value <= 79) return makeStyle('#a060c0', '#4a2070', '#fff'); // purple
  return makeStyle('#c0c0c0', '#808080', '#1a1a1a'); // light grey (80-90)
}

function americanBallStyle(value: number): BallStyle {
  if (value <= 15) return makeStyle('#ff5050', '#a00000', '#fff'); // B - red
  if (value <= 30) return makeStyle('#5080d0', '#1a3060', '#fff'); // I - blue
  if (value <= 45) return makeStyle('#fff070', '#c8a000', '#1a1a1a'); // N - yellow
  if (value <= 60) return makeStyle('#60d060', '#208020', '#fff'); // G - green
  return makeStyle('#a060c0', '#4a2070', '#fff'); // O - purple (61-75)
}

function makeStyle(base: string, deep: string, textColor: string): BallStyle {
  return {
    fill: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${base} 45%, ${deep} 100%)`,
    ring: deep,
    textColor,
  };
}
