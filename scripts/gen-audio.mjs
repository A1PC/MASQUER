#!/usr/bin/env node
/**
 * gen-audio.mjs — zero-dependency, deterministic audio sample generator.
 *
 * Synthesizes the project's bundled sound-effect set as mono 16-bit PCM WAV
 * files under `src/assets/audio/`. No network, no third-party assets — every
 * sample is computed from simple DSP (oscillators, noise bursts, envelopes), so
 * the whole sound layer is offline and reproducible. Re-run with `pnpm gen-audio`.
 *
 * License: project-authored, CC0. See `src/assets/audio/CREDITS.md`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 22.05 kHz mono is ample for these short UI/game effects and roughly halves the
// bundled size versus 44.1 kHz, keeping the whole set near the size budget.
const SAMPLE_RATE = 22_050;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');

// --- Deterministic PRNG (mulberry32) so noise is reproducible bit-for-bit. ---
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Buffer helpers (Float32 samples in [-1, 1]). ---
function buffer(seconds) {
  return new Float32Array(Math.max(1, Math.round(seconds * SAMPLE_RATE)));
}

function add(buf, fn) {
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    buf[i] += fn(t, i);
  }
  return buf;
}

/** Attack/decay envelope (linear attack, exponential-ish decay). */
function env(t, dur, attack = 0.005) {
  if (t >= dur) return 0;
  if (t < attack) return t / attack;
  const d = (t - attack) / (dur - attack);
  return Math.exp(-4 * d) * (1 - d);
}

const TAU = Math.PI * 2;
const sine = (t, f) => Math.sin(TAU * f * t);
const triangle = (t, f) => (2 / Math.PI) * Math.asin(Math.sin(TAU * f * t));

/** Normalize to a target peak to avoid clipping while keeping headroom. */
function normalize(buf, peak = 0.9) {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max === 0) return buf;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

// --- Sound generators ---------------------------------------------------------

function chipPlace() {
  const buf = buffer(0.12);
  const rng = makeRng(101);
  // Two short clicks: a noise transient + a short woody tone.
  add(buf, (t) => {
    const click = (rng() * 2 - 1) * env(t, 0.02, 0.001) * 0.6;
    const body = triangle(t, 320) * env(t, 0.1, 0.003) * 0.5;
    const tick2 = t > 0.035 ? (rng() * 2 - 1) * env(t - 0.035, 0.015, 0.001) * 0.35 : 0;
    return click + body + tick2;
  });
  return normalize(buf);
}

function cardDeal() {
  const buf = buffer(0.18);
  const rng = makeRng(202);
  // Filtered noise swish (one-pole low-pass) — a card sliding off the deck.
  let lp = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const n = rng() * 2 - 1;
    lp += 0.25 * (n - lp);
    buf[i] = lp * env(t, 0.16, 0.004) * 0.9;
  }
  return normalize(buf);
}

function diceRoll() {
  const buf = buffer(0.5);
  const rng = makeRng(303);
  // A clatter: several decaying noise bursts at irregular intervals.
  const hits = [0.0, 0.06, 0.13, 0.19, 0.27, 0.33, 0.41];
  for (const start of hits) {
    const dur = 0.04 + rng() * 0.03;
    const amp = 0.5 + rng() * 0.4;
    add(buf, (t) => {
      if (t < start || t > start + dur) return 0;
      return (rng() * 2 - 1) * env(t - start, dur, 0.001) * amp;
    });
  }
  return normalize(buf);
}

function reelSpin() {
  const buf = buffer(0.6);
  // Rising mechanical whir: a tone with a fast tremolo + climbing pitch.
  add(buf, (t) => {
    const f = 180 + 120 * (t / 0.6);
    const trem = 0.6 + 0.4 * Math.sin(TAU * 26 * t);
    const e = t < 0.05 ? t / 0.05 : t > 0.5 ? Math.max(0, 1 - (t - 0.5) / 0.1) : 1;
    return triangle(t, f) * trem * e * 0.5;
  });
  return normalize(buf, 0.8);
}

function reelStop() {
  const buf = buffer(0.14);
  // A solid mechanical thunk: low tone + short noise transient.
  const rng = makeRng(404);
  add(buf, (t) => {
    const thunk = sine(t, 150) * env(t, 0.12, 0.002) * 0.8;
    const tick = (rng() * 2 - 1) * env(t, 0.015, 0.001) * 0.4;
    return thunk + tick;
  });
  return normalize(buf);
}

// Short metallic "flip" — two sine partials + tiny noise burst, ~0.32 s.
function coinFlip() {
  const buf = buffer(0.32);
  const rng = makeRng(0xc01f);
  add(buf, (t) => {
    const e = env(t, 0.32, 0.005);
    const tone = 0.55 * sine(t, 1180) + 0.35 * sine(t, 1760) + 0.18 * triangle(t, 590);
    const noise = (rng() - 0.5) * Math.max(0, 1 - t / 0.06) * 0.45;
    return e * (tone + noise);
  });
  return normalize(buf, 0.8);
}

/** Major-triad arpeggio stinger. `notes` = freqs; `step` = time between onsets. */
function arpeggio(freqs, step, noteDur, totalDur, peak = 0.85) {
  const buf = buffer(totalDur);
  freqs.forEach((f, idx) => {
    const start = idx * step;
    add(buf, (t) => {
      if (t < start) return 0;
      const lt = t - start;
      // Two partials for a brighter, bell-like tone.
      const tone = sine(lt, f) * 0.7 + sine(lt, f * 2) * 0.25;
      return tone * env(lt, noteDur, 0.004);
    });
  });
  return normalize(buf, peak);
}

// C-major based triads, octave-stacked for bigger wins.
const winSmall = () => arpeggio([523.25, 659.25, 783.99], 0.07, 0.22, 0.45);
const winMedium = () => arpeggio([523.25, 659.25, 783.99, 1046.5], 0.07, 0.26, 0.6);
const winJackpot = () =>
  arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0], 0.08, 0.34, 0.9, 0.92);

function loss() {
  const buf = buffer(0.5);
  // Descending two-note "wah-wah": pitch glides down.
  add(buf, (t) => {
    const f = 330 - 120 * Math.min(1, t / 0.45);
    return (sine(t, f) * 0.7 + triangle(t, f * 0.5) * 0.3) * env(t, 0.48, 0.01) * 0.8;
  });
  return normalize(buf, 0.8);
}

function ambienceLounge() {
  const seconds = 3;
  const buf = buffer(seconds);
  const rng = makeRng(909);
  // A soft, loopable pad: stacked low sines + gentle filtered noise wash.
  // Fade in/out at the seams so the 4s buffer loops without a click.
  const fade = 0.4;
  let lp = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const pad =
      sine(t, 110) * 0.18 + sine(t, 164.81) * 0.12 + sine(t, 220) * 0.08 + sine(t, 277.18) * 0.05;
    const slowTrem = 0.85 + 0.15 * Math.sin(TAU * 0.15 * t);
    const n = rng() * 2 - 1;
    lp += 0.0008 * (n - lp);
    const wash = lp * 6 * 0.05;
    let amp = 1;
    if (t < fade) amp = t / fade;
    else if (t > seconds - fade) amp = (seconds - t) / fade;
    buf[i] = (pad * slowTrem + wash) * amp;
  }
  return normalize(buf, 0.55);
}

// --- WAV encoder (mono 16-bit PCM) -------------------------------------------

function writeWav(path, samples) {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // audio format = PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
  return buf.length;
}

// --- Main --------------------------------------------------------------------

const FILES = {
  'chip-place.wav': chipPlace,
  'card-deal.wav': cardDeal,
  'dice-roll.wav': diceRoll,
  'reel-spin.wav': reelSpin,
  'reel-stop.wav': reelStop,
  'coin-flip.wav': coinFlip,
  'win-small.wav': winSmall,
  'win-medium.wav': winMedium,
  'win-jackpot.wav': winJackpot,
  'loss.wav': loss,
  'ambience-lounge.wav': ambienceLounge,
};

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const [name, gen] of Object.entries(FILES)) {
  const bytes = writeWav(join(OUT_DIR, name), gen());
  total += bytes;
  console.log(`  ${name.padEnd(22)} ${(bytes / 1024).toFixed(1)} KB`);
}
console.log(
  `Generated ${Object.keys(FILES).length} samples — ${(total / 1024).toFixed(1)} KB total.`,
);
