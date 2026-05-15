import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, deriveKey, generateSalt, timingSafeEqual } from './crypto';

describe('crypto', () => {
  it('deriveKey is deterministic given same inputs', async () => {
    const salt = new Uint8Array(16).fill(7);
    const a = await deriveKey('password123', salt, 1000);
    const b = await deriveKey('password123', salt, 1000);
    expect(a).toEqual(b);
  });

  it('deriveKey produces different output for different salts', async () => {
    const a = await deriveKey('password123', new Uint8Array(16).fill(1), 1000);
    const b = await deriveKey('password123', new Uint8Array(16).fill(2), 1000);
    expect(a).not.toEqual(b);
  });

  it('timingSafeEqual returns false for different lengths', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('timingSafeEqual returns true for byte-equal arrays', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('bytesToBase64 ↔ base64ToBytes round-trips', () => {
    const original = generateSalt();
    const round = base64ToBytes(bytesToBase64(original));
    expect(round).toEqual(original);
  });
});
