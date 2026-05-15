# ADR-0012: Forms via React Hook Form + Zod

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

We need a form library and a validation strategy. Phase 1 has Login and
Register; Phase 2 will add the BettingPanel; Phase 8 may add a settings page.
Setting the pattern now means later forms are mechanical.

## Decision

Use **React Hook Form** for form state and submission, and **Zod** for
schema-based validation that doubles as TypeScript types via `z.infer`.
Schemas live in `src/systems/<area>-schemas.ts` so both the form and the
underlying system can validate the same shape.

## Alternatives considered

- **RHF with built-in validation** (no Zod) — smaller bundle but schema
  isn't reusable for non-form code paths.
- **Plain controlled inputs** — fine for two forms, becomes painful as the
  app grows.
- **TanStack Form** — newer; less prior art; not worth the learning curve
  here.

## Consequences

- Adds ~10KB gzipped (RHF + zod + resolvers).
- One import pattern for every future form: `useForm({resolver: zodResolver(schema)})`.
- Schemas double as the inferred TS input types — no manual type duplication.

## References

- BUILD_GUIDE.md §7 (form requirements)
- Phase 1 spec sections 6.7, 6.12, 6.13
