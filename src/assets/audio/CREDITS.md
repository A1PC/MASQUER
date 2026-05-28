# Audio sample credits

All `.wav` files in this directory are **self-synthesized** by
[`scripts/gen-audio.mjs`](../../../scripts/gen-audio.mjs) — a zero-dependency,
deterministic Node script that computes each sample from simple DSP (oscillators,
shaped noise bursts, envelopes). No recordings and no third-party assets are used.

- **License:** project-authored, released as **CC0** (public domain dedication).
  There is no third-party license obligation.
- **Format:** mono 16-bit PCM WAV at 22.05 kHz (universally decodable by the
  Web Audio API; no `.mp3` fallback needed).
- **Reproducible:** regenerate any time with `pnpm gen-audio`. The script is
  deterministic (seeded PRNG for noise), so output is bit-stable across machines.

These are placeholder-quality, license-clean effects intended to ship the sound
layer offline. Higher-fidelity recorded samples can replace them later (deferred
polish) without touching the engine — only the files in this directory change.

## Files

| File                  | Sound                                  | Category |
| --------------------- | -------------------------------------- | -------- |
| `chip-place.wav`      | chip placed on table                   | game     |
| `card-deal.wav`       | card dealt                             | game     |
| `coin-flip.wav`       | coin flip whir                         | game     |
| `dice-roll.wav`       | dice clatter (craps)                   | game     |
| `reel-spin.wav`       | slot reel spin start                   | game     |
| `reel-stop.wav`       | slot reel stop                         | game     |
| `wheel-spin.wav`      | roulette wheel spin                    | game     |
| `ball-drop.wav`       | lottery / bingo ball drop              | game     |
| `peg-ping.wav`        | plinko ball-on-peg ping                | game     |
| `win-small.wav`       | small win stinger (≤ 2× bet)           | game     |
| `win-medium.wav`      | medium win stinger (2-20×)             | game     |
| `win-jackpot.wav`     | jackpot win stinger (tier-3 / natural) | game     |
| `loss.wav`            | loss / bust                            | game     |
| `ambience-lounge.wav` | low lounge ambience pad (toggleable)   | ambience |
