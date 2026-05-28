# ADR-0008: Discriminated-union result type for system functions

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

Functions in `src/systems/` perform I/O that can fail in known, expected ways
(username taken, insufficient chips, invalid credentials). We need a way to
report these failures without conflating them with bugs.

## Decision

Every fallible system function returns a discriminated union:

```ts
type Result<T, E extends string> = ({ ok: true } & T) | { ok: false; error: E };
```

The error field is a string literal type — never a free-form message — so the
caller can exhaustive-switch on it and the UI translates the code into a
human-readable string. Exceptions are reserved for "should never happen" bugs
(typically rethrown by Dexie or the runtime).

## Alternatives considered

- **Throw exceptions for expected errors** — couples error UI rendering to
  try/catch placement; harder to type.
- **Boolean + out param** — TypeScript handles unions cleanly; out params are
  awkward in async code.
- **Either monad** — overkill for the team size.

## Consequences

- UI does `if (!result.ok) showError(result.error)`; no try/catch in React.
- Adding a new failure mode requires extending the union — TypeScript flags
  unhandled cases at the call site.
- Test assertions are simple: `expect(result).toEqual({ok:false, error:'x'})`.

## References

- BUILD_GUIDE.md §3 (architecture: systems are the only side-effecting layer)
- Phase 1 spec section 6.8 (auth.ts uses this pattern)
