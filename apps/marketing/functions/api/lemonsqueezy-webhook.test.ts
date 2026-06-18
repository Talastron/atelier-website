import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/hmac.ts', () => ({ verifyLemonSqueezySignature: vi.fn().mockResolvedValue(true) }));
vi.mock('../lib/google-auth.ts', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
  parseServiceAccount: vi.fn().mockReturnValue({ client_email: 'x', private_key: 'y' }),
}));
vi.mock('../lib/firebase-identity-toolkit.ts', () => ({
  findOrCreateUserByEmail: vi.fn().mockResolvedValue({ uid: 'uid_1', email: 'a@b.com', created: true }),
  sendSignInLink: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/firestore.ts', () => ({
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
  isEventProcessed: vi.fn().mockResolvedValue(false),
  markEventProcessed: vi.fn().mockResolvedValue(undefined),
}));

import { onRequestPost } from './lemonsqueezy-webhook.ts';
import { verifyLemonSqueezySignature } from '../lib/hmac.ts';
import { findOrCreateUserByEmail, sendSignInLink } from '../lib/firebase-identity-toolkit.ts';
import { upsertSubscription, isEventProcessed } from '../lib/firestore.ts';

const ENV = {
  LEMONSQUEEZY_WEBHOOK_SECRET: 'secret',
  FIREBASE_PROJECT_ID: 'project',
  FIREBASE_ADMIN_SERVICE_ACCOUNT: btoa(JSON.stringify({ client_email: 'x', private_key: 'y' })),
  EDIT_URL: 'https://edit.myatelier.style',
};

function makeRequest(body: object, signature = 'valid'): Request {
  return new Request('https://example.com/api/lemonsqueezy-webhook', {
    method: 'POST',
    headers: { 'X-Signature': signature, 'X-Event-Id': 'evt_123' },
    body: JSON.stringify(body),
  });
}

const SUB_CREATED_EVENT = {
  meta: { event_name: 'subscription_created' },
  data: {
    id: 'ls_sub_999',
    type: 'subscriptions',
    attributes: {
      user_email: 'a@b.com',
      status: 'active',
      product_id: 1,
      variant_id: 100,
      renews_at: '2026-07-18T00:00:00.000000Z',
    },
  },
};

describe('lemonsqueezy-webhook onRequestPost', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when HMAC verification fails', async () => {
    (verifyLemonSqueezySignature as any).mockResolvedValueOnce(false);
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(401);
  });

  it('returns 200 immediately if event already processed (idempotency)', async () => {
    (isEventProcessed as any).mockResolvedValueOnce(true);
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(upsertSubscription).not.toHaveBeenCalled();
    expect(findOrCreateUserByEmail).not.toHaveBeenCalled();
  });

  it('on subscription_created: creates user, writes subscription, sends magic link', async () => {
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(findOrCreateUserByEmail).toHaveBeenCalledWith('fake-token', 'project', 'a@b.com');
    expect(upsertSubscription).toHaveBeenCalledWith(
      'fake-token',
      'project',
      expect.objectContaining({ subscriptionId: 'ls_sub_999', userId: 'uid_1', status: 'active' })
    );
    expect(sendSignInLink).toHaveBeenCalledWith(
      'fake-token',
      'project',
      'a@b.com',
      'https://edit.myatelier.style/auth'
    );
  });

  it('on subscription_updated: updates subscription but does NOT send a new magic link', async () => {
    const updatedEvent = { ...SUB_CREATED_EVENT, meta: { event_name: 'subscription_updated' } };
    const response = await onRequestPost({ request: makeRequest(updatedEvent), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(upsertSubscription).toHaveBeenCalled();
    expect(sendSignInLink).not.toHaveBeenCalled();
  });
});
