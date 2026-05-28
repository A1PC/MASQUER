import { useMemo } from 'react';

/**
 * Lightweight registry + hover-hint hook for lazy route prefetching.
 *
 * Workflow:
 *   1. In `router.tsx`, every lazy() call registers a matching prefetcher
 *      (the same dynamic import). Vite dedupes the two so the chunk is only
 *      fetched once per session.
 *   2. The sidebar (and any other link surface) calls
 *      `usePrefetchOnHover('coin-flip')` and spreads the returned handlers
 *      onto its `<Link>`. On hover or focus the chunk starts streaming before
 *      the user actually clicks.
 *
 * Inflight tracking guarantees a single network request per key — repeated
 * hovers / focus pings are no-ops while the import is still resolving.
 */

const inflight = new Set<string>();
const prefetchers = new Map<string, () => Promise<unknown>>();

/** Register a chunk prefetcher under `key`. Idempotent (last write wins). */
export function registerPrefetcher(key: string, fn: () => Promise<unknown>): void {
  prefetchers.set(key, fn);
}

interface PrefetchHandlers {
  onMouseEnter: () => void;
  onFocus: () => void;
}

/** Returns hover/focus handlers that trigger the registered prefetcher for `key`. */
export function usePrefetchOnHover(key: string): PrefetchHandlers {
  return useMemo<PrefetchHandlers>(() => {
    const prefetch = (): void => {
      if (inflight.has(key)) return;
      const fn = prefetchers.get(key);
      if (!fn) return;
      inflight.add(key);
      fn().catch(() => inflight.delete(key));
    };
    return { onMouseEnter: prefetch, onFocus: prefetch };
  }, [key]);
}

// --- test-only helpers ------------------------------------------------------
/** Reset the registry + inflight set. Vitest-only — keeps tests hermetic. */
export function __resetPrefetchRegistryForTests(): void {
  inflight.clear();
  prefetchers.clear();
}
