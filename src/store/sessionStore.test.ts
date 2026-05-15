import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from './sessionStore';

const SESSION_KEY = 'localGamble.session.userId';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: true });
}

describe('sessionStore', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    resetStore();
  });

  it('bootstrap with no session sets currentUser=null and bootstrapping=false', async () => {
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(useSessionStore.getState().bootstrapping).toBe(false);
  });

  it('register sets currentUser on success', async () => {
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('register does not set currentUser on failure', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(false);
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('login sets currentUser on success', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().login({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('logout clears currentUser', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser).not.toBeNull();
    await useSessionStore.getState().logout();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('bootstrap restores previously registered user', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });
});
