'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export interface MapCoordinates {
  latitude: number
  longitude: number
}

export interface RouteInfo {
  distance: number // in meters
  duration: number // in seconds
}

interface MapboxMapProps {
  className?: string
  pickupCoordinates?: MapCoordinates
  dropoffCoordinates?: MapCoordinates
  moverCoordinates?: MapCoordinates
  showRoute?: boolean
  onMapLoad?: (map: mapboxgl.Map) => void
  onRouteCalculated?: (routeInfo: RouteInfo) => void
}

export const MapboxMap = ({
  className = '',
  pickupCoordinates,
  dropoffCoordinates,
  moverCoordinates,
  showRoute = true,
  onMapLoad,
  onRouteCalculated,
}: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Individual marker refs — persist across renders, updated in place
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const moverMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // Track whether we've done the initial bounds fit
  const initialFitDoneRef = useRef(false)

  // Track route coords to avoid redundant API calls
  const routeCoordsKeyRef = useRef('')

  // Keep onRouteCalculated in a ref to avoid it in useEffect deps
  const onRouteCalculatedRef = useRef(onRouteCalculated)
  useEffect(() => { onRouteCalculatedRef.current = onRouteCalculated }, [onRouteCalculated])

  // ─── Initialize map (once) ────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const defaultCenter: [number, number] = [13.405, 52.52]
    const initialCenter = pickupCoordinates
      ? [pickupCoordinates.longitude, pickupCoordinates.latitude] as [number, number]
      : defaultCenter

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: 12,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
      onMapLoad?.(map.current!)
    })

    return () => {
      pickupMarkerRef.current?.remove()
      dropoffMarkerRef.current?.remove()
      moverMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      dropoffMarkerRef.current = null
      moverMarkerRef.current = null
      map.current?.remove()
      map.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Marker Creation Helpers ──────────────────────────

  const createPickupMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
    el.innerHTML = `
      <div style="position:relative;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))">
        <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#16a34a"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-size="14" font-weight="700" font-family="system-ui,sans-serif" fill="#16a34a">P</text>
        </svg>
      </div>
    `
    return el
  }

  const createDropoffMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
    el.innerHTML = `
      <div style="position:relative;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))">
        <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#dc2626"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-size="14" font-weight="700" font-family="system-ui,sans-serif" fill="#dc2626">D</text>
        </svg>
      </div>
    `
    return el
  }

  const createMoverMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer'
    el.innerHTML = `
      <style>
        @keyframes mover-ping{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.4);opacity:0}}
        @keyframes mover-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
      </style>
      <!-- pulse ring -->
      <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(79,70,229,.25);animation:mover-ping 1.8s cubic-bezier(0,.2,.6,1) infinite;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
      <!-- truck body -->
      <div style="position:relative;animation:mover-bob 2s ease-in-out infinite;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))">
        <svg width="52" height="40" viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="4" width="28" height="22" rx="3" fill="url(#cargo_grad)" stroke="#312e81" stroke-width="1.2"/>
          <rect x="2" y="5" width="26" height="6" rx="2" fill="rgba(255,255,255,0.18)"/>
          <path d="M29 12h10c2.2 0 4.2 1.2 5.2 3l3.3 6.6c.3.6.5 1.3.5 2V28a3 3 0 0 1-3 3h-2" fill="url(#cab_grad)" stroke="#312e81" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M32 14h6.5l4.5 8H32z" fill="#bfdbfe" stroke="#6366f1" stroke-width="0.8"/>
          <rect x="0" y="26" width="48" height="3" rx="1.5" fill="#312e81" opacity="0.5"/>
          <circle cx="11" cy="31" r="5" fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5"/>
          <circle cx="11" cy="31" r="2" fill="#a5b4fc"/>
          <circle cx="39" cy="31" r="5" fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5"/>
          <circle cx="39" cy="31" r="2" fill="#a5b4fc"/>
          <rect x="47" y="22" width="3" height="3" rx="1" fill="#fbbf24"/>
          <rect x="3" y="18" width="24" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
          <defs>
            <linearGradient id="cargo_grad" x1="15" y1="4" x2="15" y2="26" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/>
            </linearGradient>
            <linearGradient id="cab_grad" x1="38" y1="12" x2="38" y2="31" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `
    return el
  }

  // ─── Manage pickup & dropoff markers (create once, update position) ───
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Pickup marker
    if (pickupCoordinates) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLngLat([pickupCoordinates.longitude, pickupCoordinates.latitude])
      } else {
        const el = createPickupMarkerElement()
        pickupMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([pickupCoordinates.longitude, pickupCoordinates.latitude])
          .addTo(map.current)
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove()
      pickupMarkerRef.current = null
    }

    // Dropoff marker
    if (dropoffCoordinates) {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLngLat([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
      } else {
        const el = createDropoffMarkerElement()
        dropoffMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
          .addTo(map.current)
      }
    } else if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove()
      dropoffMarkerRef.current = null
    }

    // Fit bounds once on first load
    if (!initialFitDoneRef.current && pickupCoordinates && dropoffCoordinates) {
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend([pickupCoordinates.longitude, pickupCoordinates.latitude])
      bounds.extend([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 200, left: 60, right: 60 },
        maxZoom: 14,
        duration: 1000,
      })
      initialFitDoneRef.current = true
    }
  // Use primitive values so this doesn't fire on new object references
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupCoordinates?.latitude, pickupCoordinates?.longitude,
    dropoffCoordinates?.latitude, dropoffCoordinates?.longitude,
    mapLoaded,
  ])

  // ─── Manage mover marker separately (smooth updates) ──
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (moverCoordinates) {
      if (moverMarkerRef.current) {
        // Just update position, no destroy/recreate
        moverMarkerRef.current.setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
      } else {
        // Create mover marker for the first time
        const el = createMoverMarkerElement()
        moverMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
          .addTo(map.current)
      }
    } else if (moverMarkerRef.current) {
      moverMarkerRef.current.remove()
      moverMarkerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moverCoordinates?.latitude, moverCoordinates?.longitude, mapLoaded])

  // ─── Draw route between pickup and dropoff ────────────
  // Only fetches from Directions API when coordinates actually change by value.
  // Updates existing source data instead of remove+re-add to avoid flickering.
  useEffect(() => {
    if (!map.current || !mapLoaded || !showRoute || !pickupCoordinates || !dropoffCoordinates) return

    // Deduplicate by coordinate value — don't re-fetch if same coords
    const key = `${pickupCoordinates.latitude},${pickupCoordinates.longitude}-${dropoffCoordinates.latitude},${dropoffCoordinates.longitude}`
    if (key === routeCoordsKeyRef.current) return
    routeCoordsKeyRef.current = key

    const getRoute = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoordinates.longitude},${pickupCoordinates.latitude};${dropoffCoordinates.longitude},${dropoffCoordinates.latitude}?geometries=geojson&access_token=${mapboxgl.accessToken}`
        )
        const data = await response.json()

        if (data.routes && data.routes[0]) {
          const route = data.routes[0].geometry
          const distance = data.routes[0].distance
          const duration = data.routes[0].duration

          onRouteCalculatedRef.current?.({ distance, duration })

          // Update existing source data or create new source + layer
          const existingSource = map.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined
          if (existingSource) {
            existingSource.setData({
              type: 'Feature',
              properties: {},
              geometry: route,
            })
          } else {
            map.current?.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route,
              },
            })

            map.current?.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#6366f1',
                'line-width': 4,
                'line-opacity': 0.75,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error fetching route:', error)
      }
    }

    getRoute()
  // onRouteCalculated excluded from deps — accessed via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupCoordinates?.latitude, pickupCoordinates?.longitude,
    dropoffCoordinates?.latitude, dropoffCoordinates?.longitude,
    showRoute, mapLoaded,
  ])

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
    />
  )
}

export default MapboxMap
