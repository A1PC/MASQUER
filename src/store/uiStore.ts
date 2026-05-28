import { create } from 'zustand';

const SIDEBAR_KEY = 'masquer.ui.sidebarCollapsed';
const STATS_VIEW_KEY = 'masquer.ui.statsViewMode';

export type StatsViewMode = 'cards' | 'graphs';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  statsViewMode: StatsViewMode;
  setStatsViewMode: (mode: StatsViewMode) => void;
}

function readSidebarPref(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (raw === null) return false; // First visit: default OPEN.
    return raw === 'true';
  } catch {
    return false;
  }
}

function writeSidebarPref(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    /* localStorage unavailable */
  }
}

function readStatsViewPref(): StatsViewMode {
  try {
    const raw = localStorage.getItem(STATS_VIEW_KEY);
    if (raw === 'graphs') return 'graphs';
    return 'cards';
  } catch {
    return 'cards';
  }
}

function writeStatsViewPref(mode: StatsViewMode): void {
  try {
    localStorage.setItem(STATS_VIEW_KEY, mode);
  } catch {
    /* localStorage unavailable */
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: readSidebarPref(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writeSidebarPref(next);
    set({ sidebarCollapsed: next });
  },
  setSidebarCollapsed: (collapsed) => {
    writeSidebarPref(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  statsViewMode: readStatsViewPref(),
  setStatsViewMode: (mode) => {
    writeStatsViewPref(mode);
    set({ statsViewMode: mode });
  },
}));

export const useStatsViewMode = (): StatsViewMode => useUIStore((s) => s.statsViewMode);
