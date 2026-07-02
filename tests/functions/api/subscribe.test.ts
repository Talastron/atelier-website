import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@functions/lib/mailerlite.ts', () => ({
  addSubscriberToGroup: vi.fn().mockResolvedValue({ ok: true, status: 201 }),
}));

import { onRequestPost } from '@functions/api/subscribe.ts';
import { addSubscriberToGroup } from '@functions/lib/mailerlite.ts';

const ENV = { MAILERLITE_API_KEY: 'key', ATELIER_GROUP_ID: 'grp_1' };

function jsonReq(body: object): Request {
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch' },
    body: JSON.stringify(body),
  });
}
function formReq(fields: Record<string, string>): Request {
  const fd = new URLSearchParams(fields);
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fd.toString(),
  });
}

describe('subscribe onRequestPost', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('valid JSON: adds subscriber and returns 200 ok', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(addSubscriberToGroup).toHaveBeenCalledWith('key', 'grp_1', 'a@b.com', 'footer');
  });

  it('honeypot filled: returns 200 but does NOT call MailerLite', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'footer', company: 'bot' }), env: ENV } as any);
    expect(res.status).toBe(200);
    expect(addSubscriberToGroup).not.toHaveBeenCalled();
  });

  it('invalid email: 400 and no MailerLite call', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'nope', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(400);
    expect(addSubscriberToGroup).not.toHaveBeenCalled();
  });

  it('MailerLite 422: returns 400', async () => {
    (addSubscriberToGroup as any).mockResolvedValueOnce({ ok: false, status: 422 });
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: ENV } as any);
    expect(res.status).toBe(400);
  });

  it('MailerLite 500: returns 502', async () => {
    (addSubscriberToGroup as any).mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: ENV } as any);
    expect(res.status).toBe(502);
  });

  it('no-JS form POST: 303 redirect to /subscribe/thanks on success', async () => {
    const res = await onRequestPost({ request: formReq({ email: 'a@b.com', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/subscribe/thanks');
  });

  it('missing env secret: returns 500', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: {} as any } as any);
    expect(res.status).toBe(500);
  });
});
