import { describe, it, expect } from 'vitest';
import { verifyLemonSqueezySignature } from './hmac.ts';

describe('verifyLemonSqueezySignature', () => {
  const secret = 'test-secret';
  // HMAC-SHA256 of '{"foo":"bar"}' with secret 'test-secret':
  const validSignature = '9b1abf7d901bda91325d00f6b397fb0dc257937939b27d4dc67848ab9e08f6c0';
  const body = '{"foo":"bar"}';

  it('returns true for a valid signature', async () => {
    const result = await verifyLemonSqueezySignature(body, validSignature, secret);
    expect(result).toBe(true);
  });

  it('returns false for an invalid signature', async () => {
    const result = await verifyLemonSqueezySignature(body, 'deadbeef', secret);
    expect(result).toBe(false);
  });

  it('returns false for a tampered body', async () => {
    const result = await verifyLemonSqueezySignature('{"foo":"baz"}', validSignature, secret);
    expect(result).toBe(false);
  });

  it('returns false for an empty signature', async () => {
    const result = await verifyLemonSqueezySignature(body, '', secret);
    expect(result).toBe(false);
  });
});
