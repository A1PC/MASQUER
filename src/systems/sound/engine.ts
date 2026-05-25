import chipPlace from '@/assets/audio/chip-place.wav';
import cardDeal from '@/assets/audio/card-deal.wav';
import coinFlip from '@/assets/audio/coin-flip.wav';
import diceRoll from '@/assets/audio/dice-roll.wav';
import reelSpin from '@/assets/audio/reel-spin.wav';
import reelStop from '@/assets/audio/reel-stop.wav';
import wheelSpin from '@/assets/audio/wheel-spin.wav';
import ballDrop from '@/assets/audio/ball-drop.wav';
import winSmall from '@/assets/audio/win-small.wav';
import winMedium from '@/assets/audio/win-medium.wav';
import winJackpot from '@/assets/audio/win-jackpot.wav';
import lossUrl from '@/assets/audio/loss.wav';
import ambienceLounge from '@/assets/audio/ambience-lounge.wav';
import { SYNTH_IDS, type SoundId } from './ids';

/**
 * Web Audio sound engine (singleton). Hybrid: `ui.*` ids are synthesized at
 * runtime (oscillator blips); the rest stream from bundled WAV samples that
 * Vite resolves to URL strings. Everything is gated behind a lazily-created
 * `AudioContext` and a one-time user-gesture unlock (autoplay policy).
 *
 * SAFETY: in jsdom / SSR `AudioContext` is undefined — every method is then a
 * safe no-op (no throw). Pre-unlock calls are also no-ops. The engine never
 * touches prefs; gating on prefs lives in `useSound`.
 */

/** Vite returns a URL string for each sample import (non-synth ids only). */
const SAMPLE_URL: Partial<Record<SoundId, string>> = {
  'card.deal': cardDeal,
  'chip.place': chipPlace,
  'coin.flip': coinFlip,
  'dice.roll': diceRoll,
  'reel.spin': reelSpin,
  'reel.stop': reelStop,
  'wheel.spin': wheelSpin,
  'ball.drop': ballDrop,
  'win.small': winSmall,
  'win.medium': winMedium,
  'win.jackpot': winJackpot,
  loss: lossUrl,
  'ambience.lounge': ambienceLounge,
};

/** Exposed for tests: every non-synth SoundId maps to a defined URL. */
export const SAMPLE_REGISTRY: Partial<Record<SoundId, string>> = SAMPLE_URL;

type AudioCtxCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtxCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as typeof window & { webkitAudioContext?: AudioCtxCtor };
  return typeof window.AudioContext !== 'undefined'
    ? window.AudioContext
    : (w.webkitAudioContext ?? undefined);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private listenersBound = false;
  private masterValue = 1;
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly decoding = new Map<SoundId, Promise<AudioBuffer | null>>();

  /** Lazily create the AudioContext + master gain. Returns null when unsupported. */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterValue;
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      this.ctx = null;
      this.master = null;
      return null;
    }
  }

  /**
   * Register a one-time gesture listener that resumes the context. Call from the
   * app root on mount. Safe no-op when Web Audio is unavailable.
   */
  unlock(): void {
    if (this.unlocked || this.listenersBound) return;
    if (!getAudioContextCtor()) return;
    if (typeof window === 'undefined') return;
    const onGesture = () => {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      this.unlocked = true;
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
    this.listenersBound = true;
  }

  /** Set the master output gain (0..1). Clamped. Persists across context creation. */
  setMasterGain(value: number): void {
    this.masterValue = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.masterValue;
  }

  /** Play a sound. `gain` is a per-call multiplier (default 1). No-op pre-unlock. */
  play(id: SoundId, gain = 1): void {
    if (!this.unlocked) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const g = Math.max(0, gain);
    if (g === 0) return;
    if (SYNTH_IDS.has(id)) {
      this.synth(id, g);
      return;
    }
    void this.playSample(id, g);
  }

  /** Parameterised oscillator blip for the ui.* synth ids. */
  private synth(id: SoundId, gain: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const params: Record<
      string,
      { freq: number; type: OscillatorType; dur: number; peak: number }
    > = {
      'ui.click': { freq: 660, type: 'triangle', dur: 0.05, peak: 0.18 },
      'ui.toggle': { freq: 880, type: 'sine', dur: 0.07, peak: 0.16 },
      'ui.hover': { freq: 1320, type: 'sine', dur: 0.04, peak: 0.08 },
      'ui.error': { freq: 220, type: 'sawtooth', dur: 0.16, peak: 0.2 },
    };
    const p = params[id] ?? params['ui.click'];
    if (!p) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, now);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, p.peak * gain), now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + p.dur + 0.02);
  }

  /** Lazily fetch + decode a sample (cached) and play it through the master gain. */
  private async playSample(id: SoundId, gain: number): Promise<void> {
    const buffer = await this.getBuffer(id);
    const ctx = this.ctx;
    const master = this.master;
    if (!buffer || !ctx || !master) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(master);
    src.start();
  }

  private async getBuffer(id: SoundId): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const inflight = this.decoding.get(id);
    if (inflight) return inflight;
    const url = SAMPLE_URL[id];
    const ctx = this.ctx;
    if (!url || !ctx) return null;
    const job = (async () => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.buffers.set(id, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.decoding.delete(id);
      }
    })();
    this.decoding.set(id, job);
    return job;
  }
}

export const soundEngine = new SoundEngine();
