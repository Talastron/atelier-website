import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findOrCreateUserByEmail, sendSignInLink } from './firebase-identity-toolkit.ts';

describe('findOrCreateUserByEmail', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns existing user when lookup finds one', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ users: [{ localId: 'existing-uid', email: 'a@b.com' }] }), { status: 200 })
    );
    const result = await findOrCreateUserByEmail('token', 'project', 'a@b.com');
    expect(result).toEqual({ uid: 'existing-uid', email: 'a@b.com', created: false });
  });

  it('creates a new user when lookup returns no matches', async () => {
    (fetch as any)
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ localId: 'new-uid' }), { status: 200 }));

    const result = await findOrCreateUserByEmail('token', 'project', 'a@b.com');
    expect(result).toEqual({ uid: 'new-uid', email: 'a@b.com', created: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('sendSignInLink', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('calls Identity Toolkit sendOobCode with EMAIL_SIGNIN', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'a@b.com' }), { status: 200 })
    );

    await sendSignInLink('token', 'project', 'a@b.com', 'https://edit.myatelier.style/auth');

    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toContain('sendOobCode');
    const body = JSON.parse(call[1].body);
    expect(body.requestType).toBe('EMAIL_SIGNIN');
    expect(body.email).toBe('a@b.com');
    expect(body.continueUrl).toBe('https://edit.myatelier.style/auth');
  });
});
