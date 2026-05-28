# ADR-0011: Route protection via `<RequireAuth>` wrapper

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

Most app routes (lobby, stats, leaderboard, future games) require a session.
We need a uniform way to protect them.

## Decision

A `<RequireAuth>` wrapper component that reads `useCurrentUser()` and either
renders children or `<Navigate to="/login" state={{from}}/>`. Each protected
route in `App.tsx` wraps its element:

```tsx
<Route
  path="/lobby"
  element={
    <RequireAuth>
      <LobbyPage />
    </RequireAuth>
  }
/>
```

The `state.from` value is read by the login/register pages so a post-login
redirect lands the user at the page they originally tried to visit.

## Alternatives considered

- **Outlet pattern** (single parent route does the check) — less repetition
  but the protection is implicit in route nesting.
- **Hook in each page** (`useRequireAuth()`) — co-locates the requirement
  with the page, but easy to forget on a new page (silent failure).

## Consequences

- Easy to grep for "what's protected": just search for `RequireAuth>`.
- Each protected route is explicit in App.tsx.
- The wrapper is ~25 lines; it has its own component test.

## References

- BUILD_GUIDE.md §7 (route guarding)
- Phase 1 spec section 6.10 (RequireAuth.tsx)
