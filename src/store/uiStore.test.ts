import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from './uiStore';

const SIDEBAR_KEY = 'localGamble.ui.sidebarCollapsed';

// Re-import the module fresh for each test so initial state is recomputed.
async function importFreshStore() {
  vi.resetModules();
  return import('./uiStore');
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('uiStore', () => {
  it('first visit (localStorage empty): sidebarCollapsed = false', async () => {
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("if localStorage 'true': initial state collapsed", async () => {
    localStorage.setItem(SIDEBAR_KEY, 'true');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it("if localStorage 'false': initial state open", async () => {
    localStorage.setItem(SIDEBAR_KEY, 'false');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('toggleSidebar flips state and writes to localStorage', async () => {
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('true');
  });

  it('setSidebarCollapsed(true) writes and sets', async () => {
    const { useUIStore } = await importFreshStore();
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('true');
  });

  it('if localStorage throws: defaults to open (graceful)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    spy.mockRestore();
  });
});

describe('uiStore.statsViewMode', () => {
  beforeEach(() => {
    localStorage.removeItem('localGamble.ui.statsViewMode');
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('defaults to "cards"', () => {
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });

  it('setStatsViewMode persists to localStorage', () => {
    useUIStore.getState().setStatsViewMode('graphs');
    expect(useUIStore.getState().statsViewMode).toBe('graphs');
    expect(localStorage.getItem('localGamble.ui.statsViewMode')).toBe('graphs');
  });

  it('reads persisted preference on init', async () => {
    localStorage.setItem('localGamble.ui.statsViewMode', 'graphs');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().statsViewMode).toBe('graphs');
  });

  it('invalid persisted value falls back to "cards"', async () => {
    localStorage.setItem('localGamble.ui.statsViewMode', 'bogus');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });
});
