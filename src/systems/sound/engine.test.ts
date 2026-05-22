import { describe, it, expect } from 'vitest';
import { soundEngine, SAMPLE_REGISTRY } from './engine';
import { SOUND_CATEGORY, SYNTH_IDS, type SoundId } from './ids';

const ALL_IDS = Object.keys(SOUND_CATEGORY) as SoundId[];

describe('soundEngine (jsdom: no AudioContext)', () => {
  it('does not throw on play/unlock/setMasterGain when AudioContext is undefined', () => {
    // jsdom provides no AudioContext — every method must be a safe no-op.
    expect(typeof AudioContext).toBe('undefined');
    expect(() => soundEngine.unlock()).not.toThrow();
    expect(() => soundEngine.setMasterGain(0.5)).not.toThrow();
    expect(() => soundEngine.setMasterGain(2)).not.toThrow(); // clamped
    for (const id of ALL_IDS) {
      expect(() => soundEngine.play(id)).not.toThrow();
      expect(() => soundEngine.play(id, 0.3)).not.toThrow();
    }
  });
});

describe('sound taxonomy', () => {
  it('maps every non-synth SoundId to a defined sample URL', () => {
    for (const id of ALL_IDS) {
      if (SYNTH_IDS.has(id)) continue;
      expect(SAMPLE_REGISTRY[id], `missing sample for ${id}`).toBeTypeOf('string');
      expect(SAMPLE_REGISTRY[id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('never registers a sample URL for a synth id', () => {
    for (const id of SYNTH_IDS) {
      expect(SAMPLE_REGISTRY[id]).toBeUndefined();
    }
  });

  it('SOUND_CATEGORY covers every SoundId with a valid category', () => {
    const valid = new Set(['ui', 'game', 'ambience']);
    for (const id of ALL_IDS) {
      expect(valid.has(SOUND_CATEGORY[id])).toBe(true);
    }
  });
});
