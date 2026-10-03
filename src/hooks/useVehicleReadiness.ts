'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/context/auth'
import type { VehicleDoc } from '@/lib/types'
import { fetchVehicleOverview } from '@/lib/vehicle-client'
import { mayBeExpiredRental, withExpiredRental } from '@/lib/vehicle-labels'
import { RESTRICTED_VEHICLE_STATES, vehicleServiceState, type VehicleServiceState } from '@/lib/vehicle-service'

/**
 * The driver's vehicle service state from the auth profile, for the accept
 * buttons: when it is restricted the server's accept gate (403
 * `mover.vehicleNotReady`) would refuse anyway, so the button is disabled and
 * the restoring action shown instead. The server stays the source of truth.
 * Ticks once a minute so a rental confirmation lapses at midnight without a
 * reload (same clock as the mover layout). Without the `vehicles` row a
 * pending CHANGE reads as a first review — same restriction, same action.
 * After `expirerentals` clears the profile it reads as "add vehicle"; only
 * then is the vehicle read made, so the retired rental turns it into
 * RENTAL_EXPIRED ("Rent again"), as on the dashboard (R4).
 */
export function useVehicleReadiness(): { state: VehicleServiceState; restricted: boolean } {
  const { user } = useAuth()
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const moverDetails = user?.moverDetails
  const baseState = vehicleServiceState(moverDetails, null, nowMs)
  const needsExpired = mayBeExpiredRental(baseState, moverDetails)
  const profileId = moverDetails?.profileId
  const vehicleStatus = moverDetails?.vehicleStatus ?? 'none'
  const [expiredRental, setExpiredRental] = useState<VehicleDoc | null>(null)
  useEffect(() => {
    if (!needsExpired || !profileId) {
      setExpiredRental(null)
      return
    }
    let cancelled = false
    fetchVehicleOverview()
      .then((d) => {
        if (!cancelled) setExpiredRental(d.expiredRental ?? null)
      })
      .catch(() => {
        /* degrades to the profile-only state */
      })
    return () => {
      cancelled = true
    }
  }, [needsExpired, profileId, vehicleStatus])
  const state = withExpiredRental(baseState, moverDetails, expiredRental)
  return { state, restricted: !!moverDetails && RESTRICTED_VEHICLE_STATES.has(state) }
}
