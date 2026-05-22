import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { register, updateProfile } from './auth';

describe('updateProfile', () => {
  beforeEach(async () => {
    await db.users.clear();
  });

  it('updates username + avatarColor', async () => {
    const res0 = await register({ username: 'Adam', password: 'pw123456' });
    expect(res0.ok).toBe(true);
    if (!res0.ok) return;
    const res = await updateProfile(res0.user.id, { username: 'Ace', avatarColor: '#123456' });
    expect(res).toEqual({ ok: true });
    const row = await db.users.get(res0.user.id);
    expect(row?.username).toBe('Ace');
    expect(row?.usernameLower).toBe('ace');
    expect(row?.avatarColor).toBe('#123456');
  });

  it('leaves omitted fields unchanged', async () => {
    const res0 = await register({ username: 'Keep', password: 'pw123456' });
    expect(res0.ok).toBe(true);
    if (!res0.ok) return;
    const originalColor = res0.user.avatarColor;
    const res = await updateProfile(res0.user.id, { username: 'Renamed' });
    expect(res).toEqual({ ok: true });
    const row = await db.users.get(res0.user.id);
    expect(row?.username).toBe('Renamed');
    expect(row?.avatarColor).toBe(originalColor);
  });

  it('rejects a taken username (case-insensitive)', async () => {
    await register({ username: 'Taken', password: 'pw123456' });
    const me = await register({ username: 'Me', password: 'pw123456' });
    expect(me.ok).toBe(true);
    if (!me.ok) return;
    const res = await updateProfile(me.user.id, { username: 'taken' });
    expect(res).toEqual({ ok: false, error: 'username_taken' });
  });

  it('allows keeping the same username (no false clash with self)', async () => {
    const res0 = await register({ username: 'Same', password: 'pw123456' });
    expect(res0.ok).toBe(true);
    if (!res0.ok) return;
    const res = await updateProfile(res0.user.id, { username: 'Same', avatarColor: '#abcdef' });
    expect(res).toEqual({ ok: true });
    const row = await db.users.get(res0.user.id);
    expect(row?.username).toBe('Same');
    expect(row?.avatarColor).toBe('#abcdef');
  });

  it('returns not_found for an unknown user', async () => {
    const res = await updateProfile('nope', { username: 'Ghost' });
    expect(res).toEqual({ ok: false, error: 'not_found' });
  });
});
