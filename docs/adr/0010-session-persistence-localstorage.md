# ADR-0010: Session persistence via localStorage single-key

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

BUILD_GUIDE §7 says "Remember the last logged-in user across refreshes (store
just the userId, not credentials)." We need a place to put it.

## Decision

Use `localStorage` with the key `masquer.session.userId`. Read
synchronously on app boot (in the Zustand store's `bootstrap()` action).
Wrap all access in try/catch (Safari private mode has historically thrown).

## Alternatives considered

- **IndexedDB single-row "session" table** — async read on boot adds delay
  before route logic can run; more "consistent" but overkill for one userId.
- **sessionStorage** — clears on tab close; would force re-login each time
  the user reopens the browser.
- **Cookie** — pointless without a server.

## Consequences

- Survives refresh and tab close.
- One layer (auth.ts) owns this concern; UI never touches localStorage.
- ESLint convention enforces this: localStorage is allowed in
  `src/systems/auth.ts` only.

## References

- BUILD_GUIDE.md §7 (Accounts)
- Phase 1 spec section 6.8 (auth.ts session helpers)

## Amendments

- **2026-05-28 (v1.0 brand rename).** Storage key prefix `localGamble.*` →
  `masquer.*` as part of the working-title-to-final-brand rename. The
  mechanism (single key, synchronous boot read, try/catch wrapper, ESLint
  allow-list) is unchanged. Pre-1.0 sessions stored under
  `localGamble.session.userId` do **not** migrate. See `CHANGELOG.md`
  1.0.0 Migration notes.
