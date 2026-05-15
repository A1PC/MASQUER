# ADR-0009: PBKDF2 with 600,000 iterations stored per-user

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

BUILD_GUIDE §7 says "PBKDF2 (Web Crypto, e.g. 100k+ iterations, SHA-256)".
We need to pick a specific number. The trade-off is login speed vs.
brute-force resistance.

## Decision

Use PBKDF2-HMAC-SHA-256 with **600,000 iterations** (OWASP 2024 recommendation).
Store the iteration count per user in the `users.pbkdf2Iterations` column so a
future bump doesn't break existing accounts.

On register: hash with current `PBKDF2_ITERATIONS`. On login: re-hash with the
user's stored iteration count, compare. (Rehash-on-login if stored < current
is a Phase 8 polish.)

## Alternatives considered

- **100k iters** (BUILD_GUIDE example minimum) — faster login (~50-80ms) but
  below current OWASP recommendation.
- **210k iters** (older OWASP) — middle ground (~150-200ms).
- **Argon2** — stronger algorithm, but not in Web Crypto API; would require
  a wasm bundle (~50KB).

## Consequences

- Login takes ~300-500ms on a typical laptop. UI shows isSubmitting spinner.
- Per-user iteration count means future increases are non-breaking.
- A stored hash includes its own salt, hash, and iteration count, making the
  cryptographic parameters explicit per record.

## References

- BUILD_GUIDE.md §7 (Accounts)
- Phase 1 spec section 6.5 (crypto.ts)
- OWASP Password Storage Cheat Sheet (2024)
