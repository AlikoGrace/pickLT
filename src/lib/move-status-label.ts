import type { TFunction } from 'i18next'

/**
 * Human-readable, translated label for a `moves.status` enum value.
 *
 * Server messages used to interpolate the raw enum token
 * (`Move is not awaiting payment (current: mover_en_route)`), which leaks a
 * wire value into user-facing copy and cannot be translated. Route handlers
 * pass their `t` in (this module runs both server- and client-side, so it must
 * not resolve translations itself).
 *
 * Unknown values fall back to the raw token rather than throwing — a new status
 * shipped by the backend before the catalog catches up must not blank the
 * message.
 */
const STATUS_KEYS: Record<string, string> = {
  draft: 'draft',
  booked: 'booked',
  pending: 'pending',
  pending_payment: 'pendingPayment',
  awaiting_payment: 'awaitingPayment',
  paid: 'paid',
  mover_assigned: 'moverAssigned',
  mover_accepted: 'moverAccepted',
  mover_en_route: 'moverEnRoute',
  mover_arrived: 'moverArrived',
  loading: 'loading',
  in_transit: 'inTransit',
  arrived_destination: 'arrivedDestination',
  unloading: 'unloading',
  completed: 'completed',
  cancelled_by_client: 'cancelledByClient',
  cancelled_by_mover: 'cancelledByMover',
  disputed: 'disputed',
}

// i18n-keys: moves:status.draft.label, moves:status.booked.label,
// moves:status.pending.label, moves:status.pendingPayment.label,
// moves:status.awaitingPayment.label, moves:status.paid.label,
// moves:status.moverAssigned.label, moves:status.moverAccepted.label,
// moves:status.moverEnRoute.label, moves:status.moverArrived.label,
// moves:status.loading.label, moves:status.inTransit.label,
// moves:status.arrivedDestination.label, moves:status.unloading.label,
// moves:status.completed.label, moves:status.cancelledByClient.label,
// moves:status.cancelledByMover.label, moves:status.disputed.label
export function moveStatusLabel(t: TFunction, status: unknown): string {
  if (typeof status !== 'string') return ''
  const key = STATUS_KEYS[status]
  return key ? t(`moves:status.${key}.label`) : status
}
