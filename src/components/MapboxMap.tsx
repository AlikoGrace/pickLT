'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ThemeContext } from '@/app/theme-provider'

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export interface MapCoordinates {
  latitude: number
  longitude: number
  /** Compass heading in degrees clockwise from north (0=N, 90=E). Optional —
   *  only the live mover marker uses it, to rotate the truck to face travel. */
  heading?: number
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
  showUserLocation?: boolean
  onMapLoad?: (map: mapboxgl.Map) => void
  onRouteCalculated?: (routeInfo: RouteInfo) => void
  onPickupMarkerClick?: () => void
  onDropoffMarkerClick?: () => void
}

export const MapboxMap = ({
  className = '',
  pickupCoordinates,
  dropoffCoordinates,
  moverCoordinates,
  showRoute = true,
  showUserLocation = true,
  onMapLoad,
  onRouteCalculated,
  onPickupMarkerClick,
  onDropoffMarkerClick,
}: MapboxMapProps) => {
  const isDarkMode = useContext(ThemeContext)?.isDarkMode ?? false

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

  // Keep marker click handlers in refs
  const onPickupMarkerClickRef = useRef(onPickupMarkerClick)
  useEffect(() => { onPickupMarkerClickRef.current = onPickupMarkerClick }, [onPickupMarkerClick])
  const onDropoffMarkerClickRef = useRef(onDropoffMarkerClick)
  useEffect(() => { onDropoffMarkerClickRef.current = onDropoffMarkerClick }, [onDropoffMarkerClick])

  // ─── Initialize map (once) ────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const defaultCenter: [number, number] = [13.405, 52.52]
    const initialCenter = pickupCoordinates
      ? [pickupCoordinates.longitude, pickupCoordinates.latitude] as [number, number]
      : defaultCenter

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: 12,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    // Add geolocation control to show user's location puck
    if (showUserLocation) {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      })
      map.current.addControl(geolocate, 'top-right')
      // Auto-trigger geolocation after map loads
      map.current.on('load', () => {
        geolocate.trigger()
      })
    }

    map.current.on('load', () => {
      setMapLoaded(true)
      onMapLoad?.(map.current!)

      // Reposition the default controls to vertical center-right
      const topRight = map.current?.getContainer().querySelector('.mapboxgl-ctrl-top-right') as HTMLElement | null
      if (topRight) {
        topRight.style.top = '50%'
        topRight.style.transform = 'translateY(-50%)'
      }
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

  // ─── Reactive style switch on theme change ─────────────
  const styleInitialMountRef = useRef(true)
  useEffect(() => {
    if (styleInitialMountRef.current) {
      styleInitialMountRef.current = false
      return
    }
    if (!map.current) return
    const newStyle = isDarkMode
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11'
    setMapLoaded(false)
    // Reset route key so the route effect re-draws after the new style loads
    routeCoordsKeyRef.current = ''
    map.current.setStyle(newStyle)
    map.current.once('style.load', () => setMapLoaded(true))
  }, [isDarkMode])

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
        <!-- Aerial (top-down) truck — front points up -->
        <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- wheels (peeking out from under the body) -->
          <rect x="4" y="13" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
          <rect x="31" y="13" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
          <rect x="4" y="33" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
          <rect x="31" y="33" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
          <!-- cargo box -->
          <rect x="7" y="8" width="26" height="42" rx="5" fill="url(#cargo_grad)" stroke="#312e81" stroke-width="1.2"/>
          <!-- roof ridges -->
          <rect x="10" y="24" width="20" height="2" rx="1" fill="rgba(255,255,255,0.26)"/>
          <rect x="10" y="30" width="20" height="2" rx="1" fill="rgba(255,255,255,0.20)"/>
          <rect x="10" y="36" width="20" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
          <!-- cab -->
          <rect x="8" y="4" width="24" height="14" rx="5" fill="url(#cab_grad)" stroke="#312e81" stroke-width="1.2"/>
          <!-- windshield -->
          <path d="M11 7.5h18v3c0 .9-.7 1.6-1.6 1.6H12.6c-.9 0-1.6-.7-1.6-1.6v-3z" fill="#bfdbfe" stroke="#6366f1" stroke-width="0.6"/>
          <!-- headlights -->
          <rect x="10" y="4.6" width="3.2" height="2" rx="1" fill="#fbbf24"/>
          <rect x="26.8" y="4.6" width="3.2" height="2" rx="1" fill="#fbbf24"/>
          <defs>
            <linearGradient id="cargo_grad" x1="20" y1="8" x2="20" y2="50" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/>
            </linearGradient>
            <linearGradient id="cab_grad" x1="20" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
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
        el.addEventListener('click', () => onPickupMarkerClickRef.current?.())
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
        el.addEventListener('click', () => onDropoffMarkerClickRef.current?.())
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
      // Face the truck along its travel heading. GPS omits heading when the
      // vehicle is stationary, so treat a missing/invalid value as "keep the
      // last rotation" rather than snapping back to north.
      const heading =
        typeof moverCoordinates.heading === 'number' && Number.isFinite(moverCoordinates.heading)
          ? moverCoordinates.heading
          : null
      if (moverMarkerRef.current) {
        // Just update position, no destroy/recreate
        moverMarkerRef.current.setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
        if (heading !== null) moverMarkerRef.current.setRotation(heading)
      } else {
        // Create mover marker for the first time. rotationAlignment 'map' keeps
        // the truck oriented to real streets as the map rotates/tilts.
        const el = createMoverMarkerElement()
        moverMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' })
          .setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
          .addTo(map.current)
        if (heading !== null) moverMarkerRef.current.setRotation(heading)
      }
    } else if (moverMarkerRef.current) {
      moverMarkerRef.current.remove()
      moverMarkerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moverCoordinates?.latitude, moverCoordinates?.longitude, moverCoordinates?.heading, mapLoaded])

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

  // ─── My Location handler ───────────────────────────────
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation || !map.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
          duration: 800,
        })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [])

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden ${className}`} style={{ position: 'relative' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      {/* Custom My Location button */}
      <button
        type="button"
        onClick={handleMyLocation}
        className="absolute right-2.5 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white shadow-md border border-neutral-200/80 hover:bg-neutral-50 active:scale-95 transition dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700"
        style={{ top: 'calc(50% + 40px)' }}
        title="My location"
      >
        <HugeiconsIcon icon={Navigation03Icon} size={16} strokeWidth={2} className="text-primary-600 dark:text-primary-400" />
      </button>
    </div>
  )
}

export default MapboxMap
