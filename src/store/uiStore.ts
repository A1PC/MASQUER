import { create } from 'zustand';

const SIDEBAR_KEY = 'localGamble.ui.sidebarCollapsed';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
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
}));
