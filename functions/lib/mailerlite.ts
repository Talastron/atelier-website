// Thin MailerLite API client. Isolated so the Pages Function stays thin and the
// network call is trivially mockable in tests (same pattern as functions/lib/*).

const MAILERLITE_SUBSCRIBERS_URL = 'https://connect.mailerlite.com/api/subscribers';

export interface AddSubscriberResult {
  ok: boolean;
  status: number;
}

/**
 * Add (or upsert) an email into a MailerLite group as `unconfirmed`, which is
 * the lever for double opt-in. 200 = existing subscriber updated, 201 = created;
 * both are success. 422 = invalid data. Anything else = upstream/config error.
 */
export async function addSubscriberToGroup(
  apiKey: string,
  groupId: string,
  email: string,
  source: string,
): Promise<AddSubscriberResult> {
  const res = await fetch(MAILERLITE_SUBSCRIBERS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      status: 'unconfirmed',
      groups: [groupId],
      fields: { source },
    }),
  });

  return { ok: res.status === 200 || res.status === 201, status: res.status };
}
