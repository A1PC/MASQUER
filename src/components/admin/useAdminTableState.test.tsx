import type { JSX, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { useAdminTableState } from './useAdminTableState';

/** Wrapper factory that mounts the hook inside a `MemoryRouter` so
 *  `useSearchParams` resolves. Each test picks its own initial entry to seed
 *  URL state. */
function wrapperFor(initialEntries: string[]): (props: { children: ReactNode }) => JSX.Element {
  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }
  return Wrapper;
}

/** Hook that returns both the table state + the current location so tests can
 *  assert that `setState` actually rewrote the URL. */
function useStateWithLocation(): {
  state: ReturnType<typeof useAdminTableState>['state'];
  setState: ReturnType<typeof useAdminTableState>['setState'];
  search: string;
} {
  const { state, setState } = useAdminTableState();
  const location = useLocation();
  return { state, setState, search: location.search };
}

describe('useAdminTableState', () => {
  it('returns defaults when the URL has no query params', () => {
    const { result } = renderHook(() => useAdminTableState(), {
      wrapper: wrapperFor(['/admin/audit']),
    });
    expect(result.current.state).toEqual({
      page: 1,
      user: '',
      type: '',
      range: 'all',
      search: '',
    });
  });

  it('applies caller-supplied defaults when URL is empty', () => {
    const { result } = renderHook(
      () => useAdminTableState({ range: '30d', user: 'alice', type: 'ban' }),
      { wrapper: wrapperFor(['/admin/audit']) },
    );
    expect(result.current.state.range).toBe('30d');
    expect(result.current.state.user).toBe('alice');
    expect(result.current.state.type).toBe('ban');
  });

  it('reads page / user / type / range / q from URL on mount', () => {
    const { result } = renderHook(() => useAdminTableState(), {
      wrapper: wrapperFor(['/admin/audit?page=3&user=alice&type=ban&range=7d&q=grant']),
    });
    expect(result.current.state).toEqual({
      page: 3,
      user: 'alice',
      type: 'ban',
      range: '7d',
      search: 'grant',
    });
  });

  it('coerces an invalid range value back to "all"', () => {
    const { result } = renderHook(() => useAdminTableState(), {
      wrapper: wrapperFor(['/admin/audit?range=banana']),
    });
    expect(result.current.state.range).toBe('all');
  });

  it('coerces an invalid page value back to 1', () => {
    const { result } = renderHook(() => useAdminTableState(), {
      wrapper: wrapperFor(['/admin/audit?page=NaN']),
    });
    expect(result.current.state.page).toBe(1);
  });

  it('writes a patch to the URL via setState', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: wrapperFor(['/admin/audit']),
    });
    act(() => result.current.setState({ user: 'alice', type: 'ban', page: 2 }));
    expect(result.current.state.user).toBe('alice');
    expect(result.current.state.type).toBe('ban');
    expect(result.current.state.page).toBe(2);
    const sp = new URLSearchParams(result.current.search);
    expect(sp.get('user')).toBe('alice');
    expect(sp.get('type')).toBe('ban');
    expect(sp.get('page')).toBe('2');
  });

  it('removes the param when patch sets an empty string', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: wrapperFor(['/admin/audit?user=alice&type=ban']),
    });
    act(() => result.current.setState({ user: '' }));
    const sp = new URLSearchParams(result.current.search);
    expect(sp.has('user')).toBe(false);
    expect(sp.get('type')).toBe('ban');
    expect(result.current.state.user).toBe('');
  });

  it('removes the range param when patch sets "all"', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: wrapperFor(['/admin/audit?range=7d']),
    });
    act(() => result.current.setState({ range: 'all' }));
    const sp = new URLSearchParams(result.current.search);
    expect(sp.has('range')).toBe(false);
    expect(result.current.state.range).toBe('all');
  });

  it('removes the page param when patch sets page back to 1', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: wrapperFor(['/admin/audit?page=3']),
    });
    act(() => result.current.setState({ page: 1 }));
    const sp = new URLSearchParams(result.current.search);
    expect(sp.has('page')).toBe(false);
    expect(result.current.state.page).toBe(1);
  });

  it('uses "q" as the canonical query string key for free-text search', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: wrapperFor(['/admin/audit']),
    });
    act(() => result.current.setState({ search: 'grant' }));
    expect(result.current.state.search).toBe('grant');
    const sp = new URLSearchParams(result.current.search);
    expect(sp.get('q')).toBe('grant');
    expect(sp.has('search')).toBe(false);
  });
});
