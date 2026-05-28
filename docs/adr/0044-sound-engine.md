# ADR-0044: Sound engine

- Status: Accepted
- Date: 2026-05-22
- Deciders: @adamzspare

## Context

Phase 15 #2 adds a sound layer to MASQUER. The app is offline-first
(no runtime network dependency) and play-money, so sound is pure feedback —
chip placements, card deals, reel spins, win/loss stingers, and a quiet lounge
ambience. We need: a stable sound vocabulary the rest of the app can call into;
respect for browser autoplay policy (no audio before a user gesture); per-user
control (global enable, per-category mute, master volume); and a test-safe
implementation that never throws under jsdom (where there is no `AudioContext`).
We also want to ship without sourcing or licensing third-party audio files.

## Decision

**Hybrid synth + sample engine, prefs-gated via a hook.**

- **Taxonomy (`src/systems/sound/ids.ts`).** Every sound has a stable `SoundId`
  and a `SoundCategory` (`ui` | `game` | `ambience`) used for per-category
  muting. `ui.*` ids are runtime-synthesized (cheap oscillator blips, no asset
  weight); all other ids are backed by bundled WAV samples (`SYNTH_IDS` draws
  the line).
- **Engine (`src/systems/sound/engine.ts`).** A singleton with a **lazily
  created** `AudioContext` (feature-detecting `AudioContext` /
  `webkitAudioContext`). If Web Audio is unavailable (jsdom / SSR), every method
  is a safe no-op. `unlock()` registers one-time `pointerdown`/`keydown`
  listeners that resume the context on the first gesture (autoplay policy); all
  `play()` calls before unlock are no-ops. A master `GainNode` carries the
  master volume. Samples are fetched + `decodeAudioData`'d lazily and cached in a
  `Map<SoundId, AudioBuffer>` (in-flight decodes are de-duped). The engine knows
  nothing about prefs.
- **Hook (`src/systems/sound/useSound.ts`).** The React entry point. Subscribes
  to `prefsStore` and gates each play on the user's effective prefs (global
  `soundEnabled`, per-category mute, `masterVolume` multiplier), then calls
  `soundEngine.play`. This keeps prefs logic out of the engine and out of games.
- **Self-synthesized samples.** `scripts/gen-audio.mjs` is a zero-dependency,
  deterministic Node script that synthesizes the sample set (mono 16-bit WAV) at
  build/dev time and commits the output under `src/assets/audio/`. No network, no
  third-party assets — the whole feature is offline and reproducible
  (`pnpm gen-audio`). The samples are CC0 / project-authored.
- **Prefs storage.** Sound (and motion) preferences live in a per-user Dexie v5
  `prefs` table (additive migration), surfaced through `prefsStore` with the same
  hydrate/clear lifecycle as `walletStore` (wired in `AppBootstrap`).

## Consequences

- **Positive:** offline + license-clean; autoplay-safe; test-safe (no audio in
  jsdom); cheap UI feedback via synthesis with richer game/ambience samples;
  prefs respected centrally; games stay sandboxed (they call `useSound`, never
  the DB/stores). Recorded samples can replace the synthesized ones later by
  swapping files in `src/assets/audio/` — no engine change.
- **Negative / trade-offs:** bundled WAVs add ~300 KB (kept down via 22.05 kHz
  mono and short buffers; the lounge ambience pad is the largest single file).
  WAV is uncompressed but universally decodable with no `.mp3` fallback needed.
  Sample decode is lazy, so the very first play of a sample may be slightly
  delayed while it fetches/decodes (cached thereafter).
