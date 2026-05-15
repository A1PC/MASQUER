import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema, usernameSchema } from './auth-schemas';

describe('username schema', () => {
  it('rejects too-short usernames', () => {
    const r = usernameSchema.safeParse('ab');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/at least 3/);
  });

  it('rejects too-long usernames', () => {
    const r = usernameSchema.safeParse('a'.repeat(21));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/at most 20/);
  });

  it('rejects usernames with spaces', () => {
    const r = usernameSchema.safeParse('hello world');
    expect(r.success).toBe(false);
  });

  it('accepts valid usernames with underscore and hyphen', () => {
    expect(usernameSchema.safeParse('Adam_99').success).toBe(true);
    expect(usernameSchema.safeParse('jane-doe').success).toBe(true);
  });

  it('trims whitespace before validating', () => {
    const r = usernameSchema.safeParse('  adam  ');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('adam');
  });
});

describe('register schema', () => {
  it('rejects mismatched confirmPassword on the confirmPassword field', () => {
    const r = registerSchema.safeParse({
      username: 'adam',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toMatch(/do not match/);
    }
  });

  it('accepts a fully valid registration', () => {
    const r = registerSchema.safeParse({
      username: 'adam',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(r.success).toBe(true);
  });
});

describe('login schema', () => {
  it('requires a non-empty password', () => {
    const r = loginSchema.safeParse({ username: 'adam', password: '' });
    expect(r.success).toBe(false);
  });

  it('does not enforce password length on login (only register)', () => {
    const r = loginSchema.safeParse({ username: 'adam', password: 'x' });
    expect(r.success).toBe(true);
  });
});
