import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer requires ResizeObserver; jsdom does not ship one.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverPolyfill;
}
