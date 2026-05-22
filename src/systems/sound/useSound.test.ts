import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePrefsStore } from '@/store/prefsStore';
import type { Prefs } from '@/db';
import { useSound } from './useSound';

const { playSpy } = vi.hoisted(() => ({ playSpy: vi.fn() }));
vi.mock('./engine', () => ({ soundEngine: { play: playSpy } }));

function seed(prefs: Partial<Omit<Prefs, 'userId'>>): void {
  usePrefsStore.setState({
    prefs: {
      userId: 'u',
      soundEnabled: true,
      masterVolume: 0.7,
      muteUi: false,
      muteGame: false,
      muteAmbience: false,
      motionPref: 'system',
      ...prefs,
    },
  });
}

beforeEach(() => {
  playSpy.mockClear();
  usePrefsStore.setState({ prefs: null });
});

describe('useSound', () => {
  it('plays when enabled and category unmuted, multiplying by masterVolume', () => {
    seed({ masterVolume: 0.5 });
    const { result } = renderHook(() => useSound());
    result.current.play('ui.click');
    expect(playSpy).toHaveBeenCalledWith('ui.click', 0.5);
  });

  it('applies the per-call volume on top of masterVolume', () => {
    seed({ masterVolume: 0.5 });
    const { result } = renderHook(() => useSound());
    result.current.play('win.medium', { volume: 0.4 });
    expect(playSpy).toHaveBeenCalledWith('win.medium', 0.2);
  });

  it('no-ops when soundEnabled is false', () => {
    seed({ soundEnabled: false });
    const { result } = renderHook(() => useSound());
    result.current.play('ui.click');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('no-ops when the id category is muted (ui)', () => {
    seed({ muteUi: true });
    const { result } = renderHook(() => useSound());
    result.current.play('ui.click');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('no-ops when the id category is muted (game)', () => {
    seed({ muteGame: true });
    const { result } = renderHook(() => useSound());
    result.current.play('reel.spin');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('no-ops when the id category is muted (ambience)', () => {
    seed({ muteAmbience: true });
    const { result } = renderHook(() => useSound());
    result.current.play('ambience.lounge');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('still plays a game sound when only ui is muted', () => {
    seed({ muteUi: true, masterVolume: 1 });
    const { result } = renderHook(() => useSound());
    result.current.play('chip.place');
    expect(playSpy).toHaveBeenCalledWith('chip.place', 1);
  });
});
