// What Sentry may see (plan pickltmobile/.agent/plans/sentry.md): no emails or
// phone numbers in anything sent, the user as an id only, and no console
// breadcrumbs (debug logs can print whole payloads). Pure, so it is unit-tested.
// The two Expo apps carry the same rules in lib/sentry-scrub.ts.

export const REDACTED = '[redacted]';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Same shape as the chat masking in functions/sendmessage: 7+ digits with the
// usual separators, not inside a word or a handle (MV-2026-602914). ISO dates
// and date-times are matched first (group 1) and kept, so "2026-10-06 14:30"
// is not taken for a number.
const DATE_OR_PHONE_RE =
  /(?<![\w-])(\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?)|(?<![\w-])(?:(?:\+|00)\s*)?\(?\d(?:[\s().\-/]*\d){6,}/g;

export function scrubText(input: string): string {
  return input
    .replace(EMAIL_RE, REDACTED)
    .replace(DATE_OR_PHONE_RE, (m, date?: string) => (date ? m : REDACTED));
}

/** Deep copy with every string scrubbed (objects and arrays to a few levels; deeper is dropped). */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 5) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubValue(v, depth + 1);
  return out;
}

/** The parts of a Sentry event this touches (kept structural so it needs no Sentry types). */
export interface ScrubbableEvent {
  message?: string;
  transaction?: string;
  spans?: { description?: string; data?: unknown }[];
  user?: { id?: string | number; [k: string]: unknown } | null;
  request?: { data?: unknown; cookies?: unknown; headers?: Record<string, string> };
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: { message?: string; data?: unknown }[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
}

export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  if (event.message) event.message = scrubText(event.message);
  if (event.transaction) event.transaction = scrubText(event.transaction);
  for (const span of event.spans ?? []) {
    if (span.description) span.description = scrubText(span.description);
    if (span.data !== undefined) span.data = scrubValue(span.data) as typeof span.data;
  }
  if (event.user) event.user = event.user.id != null ? { id: event.user.id } : null;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      ...(b.message ? { message: scrubText(b.message) } : {}),
      ...(b.data !== undefined ? { data: scrubValue(b.data) } : {}),
    }));
  }
  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  return event;
}

/** Console breadcrumbs are dropped; the rest are scrubbed. */
export function scrubBreadcrumb<B extends { category?: string; message?: string; data?: unknown }>(breadcrumb: B): B | null {
  if (breadcrumb.category === 'console') return null;
  return {
    ...breadcrumb,
    ...(breadcrumb.message ? { message: scrubText(breadcrumb.message) } : {}),
    ...(breadcrumb.data !== undefined ? { data: scrubValue(breadcrumb.data) } : {}),
  };
}
