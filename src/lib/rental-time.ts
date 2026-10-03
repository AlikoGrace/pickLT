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

export type DurationUnit = 'hours' | 'days'

/** "Enter a duration": typed amount + unit → hours (days × 24). `null` for an empty or non-positive entry; decimal comma accepted. */
export function durationToHours(amount: string, unit: DurationUnit): number | null {
  const n = Number(String(amount).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round((unit === 'days' ? n * 24 : n) * 100) / 100
}

/** Hours → the friendliest amount + unit to show back in the field (whole days read as days). */
export function hoursToDuration(hours: number | null | undefined): { amount: string; unit: DurationUnit } {
  if (hours == null || !Number.isFinite(Number(hours)) || Number(hours) <= 0) return { amount: '', unit: 'hours' }
  const h = Number(hours)
  return h % 24 === 0 ? { amount: String(h / 24), unit: 'days' } : { amount: String(h), unit: 'hours' }
}
