# ADR-0034: Admin auth model

- Status: Accepted
- Date: 2026-05-18
- Deciders: Developer

## Context

Phase 9 ships a hidden admin dashboard at `/admin/*`. The admin needs to log
in, but does not need a real user record (no balance, no game history, no
avatar). The admin password is requested to be a fixed `admin12345` —
short, memorable, easily typed for QA.

The app is local-only (no server). All data lives in the browser's
IndexedDB and is fully readable via DevTools. The admin login is therefore
a UI convenience, not a security boundary.

## Decision

**Hidden `/admin/login` route** with a hardcoded credential check (`admin` /
`admin12345`). The password lives in source code (`src/systems/admin-auth.ts`)
by design — the local-only architecture makes secrecy impossible regardless.

**Synthetic admin session.** No row in the `users` table. The admin session
is recorded as a flag in `localStorage` under the key
`MASQUER.session.admin = '1'`, separate from the regular user session
key `MASQUER.session.userId`. Both keys can be set independently but a
single tab will only ever have one or the other active in the UI (the
route guards enforce this).

**Reserved username.** `auth.register` rejects username `admin`
(case-insensitive, after trim) with `error: 'reserved_username'`.
`auth.login` rejects it with `error: 'invalid_credentials'` (same message as
any other login failure, so we don't leak the reserved-name fact).

**Route guard `RequireAdmin`** parallel to `RequireAuth` — checks the
`isAdmin` flag in `sessionStore` and redirects to `/admin/login` if absent.

## Alternatives considered

- **Seeded admin user with `role: 'admin'`.** Would let us reuse the
  existing PBKDF2 auth path. Rejected: introduces a DB row that needs to
  be filtered out of every "all users" query in the admin dashboard,
  could accidentally appear in the user list / be banned, and offers no
  real security benefit given the local-only context.
- **Separate admin database.** Overkill. Two Dexie connections to
  coordinate, two backup stories, no upside.
- **No admin auth at all** (anyone visiting `/admin` gets in). Rejected:
  the user explicitly wants a credential gate so the dashboard isn't
  reachable by accident from a kid's tab. The gate doesn't need to be
  cryptographically strong; it just needs to require an intent to enter.

## Consequences

- The admin password is visible in the JS bundle and in DevTools. Accepted.
- Future multi-admin support requires a real DB-backed admin role —
  effectively rewriting this ADR. Acceptable trade-off for shipping the
  dashboard now.
- The reserved-username rule is permanent: a user that registered as
  `admin` before this rule existed would still be findable via the
  database, but any new registration with that name fails. We don't expect
  legacy `admin` users to exist (local-only app, single developer).

## References

- BUILD_GUIDE §3 (Architecture — admin is a new top-level section)
- ADR-0035 — Phase 9 tracking schema (companion ADR)
- `src/systems/admin-auth.ts`
- `src/components/RequireAdmin.tsx`
- Phase 9 spec §3
