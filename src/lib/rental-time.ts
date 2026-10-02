import { formatDurationHm } from './format'

/**
 * Small, pure helpers for the rental-window UI (plan wave-2026-10/1 §7):
 * "3 h 20 m left" and the progress bar. The predicate itself lives in
 * `vehicle-service.ts`; this file only formats what it decided.
 */

const MINUTE_MS = 60 * 1000

/** `ms` left as "3 h 20 min"; never negative; a window under a minute rounds up to one. */
export function formatRemaining(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return ''
  const clamped = Math.max(0, ms)
  const seconds = Math.max(MINUTE_MS, Math.ceil(clamped / MINUTE_MS) * MINUTE_MS) / 1000
  return formatDurationHm(seconds)
}

/** Share of the window elapsed, 0–1; 0 when the instants do not form a window. */
export function rentalProgress(startAt: string | null | undefined, endAt: string | null | undefined, nowMs: number): number {
  const start = typeof startAt === 'string' ? Date.parse(startAt) : NaN
  const end = typeof endAt === 'string' ? Date.parse(endAt) : NaN
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)))
}

/** `datetime-local` value (local wall clock, minutes) → ISO instant, or null. */
export function localDateTimeToIso(value: string): string | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

/** ISO instant → `datetime-local` value in the browser's zone (`YYYY-MM-DDTHH:mm`). */
export function isoToLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
