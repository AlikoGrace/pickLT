import { describe, expect, test } from 'vitest'

/**
 * src/lib/sentry-scrub.ts: nothing personal reaches Sentry (plan pickltmobile/.agent/plans/sentry.md).
 * Same cases as the Expo apps' __tests__/sentry-scrub.test.ts.
 */
import { REDACTED, scrubBreadcrumb, scrubEvent, scrubText } from '../sentry-scrub';

describe('scrubText', () => {
  test.each([
    ['failed for jo.doe@gmail.com', `failed for ${REDACTED}`],
    ['call 0244 123 456', `call ${REDACTED}`],
    ['+49 151 2345 6789', REDACTED],
    ['(030) 1234567 not found', `${REDACTED} not found`],
  ])('redacts %p', (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  test.each(['Move MV-2026-602914 failed', 'at 2026-10-06 14:30', 'price €350, 3 items', 'HTTP 500 after 1200 ms'])(
    'leaves %p alone',
    (input) => {
      expect(scrubText(input)).toBe(input);
    },
  );
});

describe('scrubEvent', () => {
  test('user becomes an id only; request body, cookies and auth header dropped; strings scrubbed', () => {
    const event = scrubEvent({
      message: 'sendmessage failed for 0244 123 456',
      user: { id: 'u1', email: 'a@b.co', username: 'Mensah', ip_address: '1.2.3.4' },
      request: { url: 'https://x', data: { phone: '0244123456' }, cookies: { s: '1' }, headers: { cookie: 'c', authorization: 'Bearer t', accept: '*/*' } },
      exception: { values: [{ type: 'Error', value: 'no user jo@x.de' }] },
      breadcrumbs: [{ category: 'http', message: 'POST to a@b.co', data: { body: { phone: '+233 24 412 3456' } } }],
      extra: { contact: { email: 'x@y.org' } },
    });
    expect(event.message).toBe(`sendmessage failed for ${REDACTED}`);
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.request).toEqual({ url: 'https://x', headers: { accept: '*/*' } });
    expect(event.exception?.values?.[0].value).toBe(`no user ${REDACTED}`);
    expect(event.breadcrumbs?.[0]).toEqual({ category: 'http', message: `POST to ${REDACTED}`, data: { body: { phone: REDACTED } } });
    expect(event.extra).toEqual({ contact: { email: REDACTED } });
  });

  test('an anonymous user stays anonymous', () => {
    expect(scrubEvent({ user: { email: 'a@b.co' } }).user).toBeNull();
  });

  test('transaction names and span descriptions/data are scrubbed', () => {
    const event = scrubEvent({
      transaction: 'GET /api/users/jo@x.de',
      spans: [{ description: 'POST /otp to +49 151 2345 6789', data: { 'url.query': 'email=a@b.co', 'http.status_code': 200 } }],
    });
    expect(event.transaction).toBe(`GET /api/users/${REDACTED}`);
    expect(event.spans?.[0]).toEqual({ description: `POST /otp to ${REDACTED}`, data: { 'url.query': `email=${REDACTED}`, 'http.status_code': 200 } });
  });
});

describe('scrubBreadcrumb', () => {
  test('console breadcrumbs are dropped (debug logs print whole payloads)', () => {
    expect(scrubBreadcrumb({ category: 'console', message: '[callFunction] -> sendmessage payload' })).toBeNull();
  });
  test('others are kept, scrubbed', () => {
    expect(scrubBreadcrumb({ category: 'navigation', message: 'to /shared/call', data: { to: 'a@b.co' } })).toEqual({
      category: 'navigation',
      message: 'to /shared/call',
      data: { to: REDACTED },
    });
  });
});
