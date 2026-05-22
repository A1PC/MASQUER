/**
 * Sound taxonomy. Every playable sound has a stable `SoundId`, a `SoundCategory`
 * (for per-category muting in prefs), and is either runtime-synthesized
 * (`SYNTH_IDS`) or backed by a bundled sample (the rest). The engine and
 * `useSound` derive all behavior from these tables.
 */

export type SoundId =
  | 'ui.click'
  | 'ui.toggle'
  | 'ui.hover'
  | 'ui.error'
  | 'chip.place'
  | 'card.deal'
  | 'dice.roll'
  | 'reel.spin'
  | 'reel.stop'
  | 'win.small'
  | 'win.medium'
  | 'win.jackpot'
  | 'loss'
  | 'ambience.lounge';

export type SoundCategory = 'ui' | 'game' | 'ambience';

export const SOUND_CATEGORY: Record<SoundId, SoundCategory> = {
  'ui.click': 'ui',
  'ui.toggle': 'ui',
  'ui.hover': 'ui',
  'ui.error': 'ui',
  'chip.place': 'game',
  'card.deal': 'game',
  'dice.roll': 'game',
  'reel.spin': 'game',
  'reel.stop': 'game',
  'win.small': 'game',
  'win.medium': 'game',
  'win.jackpot': 'game',
  loss: 'game',
  'ambience.lounge': 'ambience',
};

/** ui.* are runtime-synthesized; the rest are bundled samples. */
export const SYNTH_IDS = new Set<SoundId>(['ui.click', 'ui.toggle', 'ui.hover', 'ui.error']);
