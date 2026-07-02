import { addSubscriberToGroup } from '../lib/mailerlite.ts';

interface Env {
  MAILERLITE_API_KEY: string;
  ATELIER_GROUP_ID: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function wantsJson(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('application/json') || request.headers.get('X-Requested-With') === 'fetch';
}

function respond(request: Request, ok: boolean, status: number, message: string): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // No-JS path: 303 so the browser issues a GET to the target.
  const location = ok ? '/subscribe/thanks' : '/subscribe?error=1';
  return new Response(null, { status: 303, headers: { Location: location } });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  let email = '';
  let source = 'unknown';
  let honeypot = '';
  const contentType = request.headers.get('Content-Type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      email = String(body.email ?? '').trim();
      source = String(body.source ?? 'unknown');
      honeypot = String(body.company ?? '');
    } else {
      const form = await request.formData();
      email = String(form.get('email') ?? '').trim();
      source = String(form.get('source') ?? 'unknown');
      honeypot = String(form.get('company') ?? '');
    }
  } catch {
    return respond(request, false, 400, 'Invalid request.');
  }

  // Honeypot: real users never fill the hidden `company` field. Silently accept.
  if (honeypot) {
    return respond(request, true, 200, 'Thanks — check your inbox to confirm.');
  }

  if (!EMAIL_RE.test(email)) {
    return respond(request, false, 400, 'Please enter a valid email address.');
  }

  if (!env.MAILERLITE_API_KEY || !env.ATELIER_GROUP_ID) {
    console.error('[subscribe] missing MAILERLITE_API_KEY or ATELIER_GROUP_ID');
    return respond(request, false, 500, 'Something went wrong. Please try again later.');
  }

  let result;
  try {
    result = await addSubscriberToGroup(env.MAILERLITE_API_KEY, env.ATELIER_GROUP_ID, email, source);
  } catch (err: any) {
    console.error(`[subscribe] MailerLite request failed: ${err?.message || err}`);
    return respond(request, false, 502, 'Something went wrong. Please try again.');
  }

  if (result.ok) {
    console.log(`[subscribe] ok source=${source} status=${result.status}`);
    return respond(request, true, 200, 'Thanks — check your inbox to confirm your subscription.');
  }
  if (result.status === 422) {
    return respond(request, false, 400, 'Please check your email address.');
  }
  console.error(`[subscribe] MailerLite returned ${result.status}`);
  return respond(request, false, 502, 'Something went wrong. Please try again.');
}
