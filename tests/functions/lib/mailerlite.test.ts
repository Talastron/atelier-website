import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addSubscriberToGroup } from '@functions/lib/mailerlite.ts';

describe('addSubscriberToGroup', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('POSTs email as unconfirmed to the group with bearer auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 201 }),
    );
    const result = await addSubscriberToGroup('key_abc', 'grp_1', 'a@b.com', 'footer');

    expect(result).toEqual({ ok: true, status: 201 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://connect.mailerlite.com/api/subscribers');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer key_abc');
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      email: 'a@b.com',
      status: 'unconfirmed',
      groups: ['grp_1'],
      fields: { source: 'footer' },
    });
  });

  it('treats 200 (existing subscriber) as success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await addSubscriberToGroup('k', 'g', 'a@b.com', 's')).toEqual({ ok: true, status: 200 });
  });

  it('returns ok:false on 422 (invalid data)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 422 }));
    expect(await addSubscriberToGroup('k', 'g', 'bad', 's')).toEqual({ ok: false, status: 422 });
  });
});
