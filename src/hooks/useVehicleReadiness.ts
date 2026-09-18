'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/context/auth'
import { RESTRICTED_VEHICLE_STATES, vehicleServiceState, type VehicleServiceState } from '@/lib/vehicle-service'

/**
 * The driver's vehicle service state from the auth profile, for the accept
 * buttons: when it is restricted the server's accept gate (403
 * `mover.vehicleNotReady`) would refuse anyway, so the button is disabled and
 * the restoring action shown instead. The server stays the source of truth.
 * Ticks once a minute so a rental confirmation lapses at midnight without a
 * reload (same clock as the mover layout). Without the `vehicles` row a
 * pending CHANGE reads as a first review — same restriction, same action.
 */
export function useVehicleReadiness(): { state: VehicleServiceState; restricted: boolean } {
  const { user } = useAuth()
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const state = vehicleServiceState(user?.moverDetails, null, nowMs)
  return { state, restricted: !!user?.moverDetails && RESTRICTED_VEHICLE_STATES.has(state) }
}
