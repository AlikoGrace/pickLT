'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ThemeContext } from '@/app/theme-provider'
import { useTranslation } from 'react-i18next'
import { MotionTrack } from '@/lib/motion-track'
import { truckSizePx } from '@/lib/truck-size'

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
  /**
   * The mover's navigation mode (plan pickltmobile maps/mover-navigation-mode):
   * the camera follows `moverCoordinates` course-up, tilted, at street level,
   * the truck sits on the live position (no glide lag), and `line` is drawn as
   * the turn-by-turn route instead of the pickup→drop-off route.
   */
  navigation?: { line: [number, number][] | null } | null
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
  navigation = null,
}: MapboxMapProps) => {
  const { t } = useTranslation()
  const isDarkMode = useContext(ThemeContext)?.isDarkMode ?? false

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Individual marker refs — persist across renders, updated in place
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const moverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  // The truck glides between fixes instead of jumping (plan pickltmobile
  // maps/smooth-mover-marker): fixes feed the track, a rAF loop draws it.
  const moverTrackRef = useRef(new MotionTrack())
  const moverFrameRef = useRef<number | null>(null)
  const navigationRef = useRef(navigation)
  navigationRef.current = navigation

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
      <!-- scale wrapper: sized by the map zoom (truckSizePx / 88), see the
           zoom listener below; mapbox-gl owns the outer element's transform -->
      <div class="mover-scale" style="display:flex;align-items:center;justify-content:center;position:relative;transform-origin:center;transition:transform 120ms linear">
      <!-- pulse ring -->
      <div style="position:absolute;width:112px;height:112px;border-radius:50%;background:rgba(79,70,229,.25);animation:mover-ping 1.8s cubic-bezier(0,.2,.6,1) infinite;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
      <!-- truck body: top-down 3D render, nose up; the marker's rotation
           (setRotation(heading) below) turns it to face travel -->
      <div style="position:relative;animation:mover-bob 2s ease-in-out infinite;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))">
        <img src="/images/truck-marker-3d.png" alt="" width="88" height="88" draggable="false" style="display:block;width:88px;height:88px;object-fit:contain;pointer-events:none;user-select:none" />
      </div>
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
      // GPS omits heading when the vehicle is stationary; MotionTrack keeps
      // the last heading (or derives one from the movement) instead.
      const heading =
        typeof moverCoordinates.heading === 'number' && Number.isFinite(moverCoordinates.heading)
          ? moverCoordinates.heading
          : null
      const now = performance.now()
      moverTrackRef.current.push({
        latitude: moverCoordinates.latitude,
        longitude: moverCoordinates.longitude,
        heading,
        receivedAt: now,
      })
      // The truck's size follows the zoom (plan pickltmobile
      // maps/smooth-mover-marker W6); the scale is set on the inner wrapper.
      const applyScale = () => {
        const inner = moverMarkerRef.current?.getElement().querySelector<HTMLElement>('.mover-scale')
        if (inner && map.current) inner.style.transform = `scale(${truckSizePx(map.current.getZoom()) / 88})`
      }
      const draw = (t: number) => {
        const pose = moverTrackRef.current.sample(t)
        if (!pose || !map.current) return
        if (!moverMarkerRef.current) {
          // rotationAlignment 'map' keeps the truck oriented to real streets
          // as the map rotates/tilts.
          moverMarkerRef.current = new mapboxgl.Marker({
            element: createMoverMarkerElement(),
            anchor: 'center',
            rotationAlignment: 'map',
          })
            .setLngLat([pose.longitude, pose.latitude])
            .addTo(map.current)
          applyScale()
          map.current.on('zoom', applyScale)
        } else {
          moverMarkerRef.current.setLngLat([pose.longitude, pose.latitude])
        }
        if (pose.heading !== null) moverMarkerRef.current.setRotation(pose.heading)
      }
      // Navigation follows the live position: no glide lag for the driver.
      if (navigationRef.current) {
        const pose = moverTrackRef.current.sample(now)
        if (pose) moverTrackRef.current.jumpTo({ ...pose, latitude: moverCoordinates.latitude, longitude: moverCoordinates.longitude })
      }
      draw(now)
      if (moverFrameRef.current === null) {
        const tick = (t: number) => {
          draw(t)
          moverFrameRef.current = moverTrackRef.current.isAnimating(t) ? requestAnimationFrame(tick) : null
        }
        moverFrameRef.current = requestAnimationFrame(tick)
      }
    } else {
      if (moverFrameRef.current !== null) cancelAnimationFrame(moverFrameRef.current)
      moverFrameRef.current = null
      moverTrackRef.current.reset()
      if (moverMarkerRef.current) {
        moverMarkerRef.current.remove()
        moverMarkerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moverCoordinates?.latitude, moverCoordinates?.longitude, moverCoordinates?.heading, mapLoaded])

  useEffect(
    () => () => {
      if (moverFrameRef.current !== null) cancelAnimationFrame(moverFrameRef.current)
    },
    []
  )

  // ─── Navigation mode: follow camera + turn-by-turn route line ──
  const navOn = !!navigation
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    if (m.getLayer('route')) m.setLayoutProperty('route', 'visibility', navOn ? 'none' : 'visible')
    if (!navOn) {
      if (m.getLayer('nav-route')) m.removeLayer('nav-route')
      if (m.getSource('nav-route')) m.removeSource('nav-route')
      m.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 600 })
    }
  }, [navOn, mapLoaded])

  const navLine = navigation?.line ?? null
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded || !navLine || navLine.length < 2) return
    const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: navLine } }
    const src = m.getSource('nav-route') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(data)
    else {
      m.addSource('nav-route', { type: 'geojson', data })
      m.addLayer({
        id: 'nav-route',
        type: 'line',
        source: 'nav-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1D64EC', 'line-width': 7, 'line-opacity': 0.9 },
      })
    }
  }, [navLine, mapLoaded])

  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded || !navOn || !moverCoordinates) return
    const heading = typeof moverCoordinates.heading === 'number' && Number.isFinite(moverCoordinates.heading) ? moverCoordinates.heading : m.getBearing()
    m.easeTo({
      center: [moverCoordinates.longitude, moverCoordinates.latitude],
      bearing: heading,
      pitch: 50,
      zoom: 17,
      padding: { top: 220, bottom: 260, left: 0, right: 0 },
      duration: 900,
    })
  }, [navOn, mapLoaded, moverCoordinates?.latitude, moverCoordinates?.longitude, moverCoordinates?.heading]) // eslint-disable-line react-hooks/exhaustive-deps

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
        title={t('common:map.myLocation.label')}
      >
        <HugeiconsIcon icon={Navigation03Icon} size={16} strokeWidth={2} className="text-primary-600 dark:text-primary-400" />
      </button>
    </div>
  )
}

export default MapboxMap
