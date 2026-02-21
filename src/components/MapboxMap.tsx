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

export interface MapMarker {
  id: string
  coordinates: MapCoordinates
  type: 'pickup' | 'dropoff' | 'mover'
  label?: string
  pulse?: boolean
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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Default center (Berlin if no coordinates provided)
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
      map.current?.remove()
      map.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only init once, coordinates update handled separately

  // Center map on coordinates when they become available
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    // If we have pickup coordinates, fly to them
    if (pickupCoordinates && dropoffCoordinates) {
      // Fit to both points
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend([pickupCoordinates.longitude, pickupCoordinates.latitude])
      bounds.extend([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
      
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 200, left: 50, right: 50 },
        maxZoom: 14,
        duration: 1000,
      })
    } else if (pickupCoordinates) {
      map.current.flyTo({
        center: [pickupCoordinates.longitude, pickupCoordinates.latitude],
        zoom: 13,
        duration: 1000,
      })
    }
  }, [pickupCoordinates, dropoffCoordinates, mapLoaded])

  // ─── Marker Creation Helpers (inline styles to avoid Tailwind purge) ─────

  /** Pickup marker – green pin with a circled "P" */
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

  /** Dropoff marker – red pin with a circled flag / "D" */
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

  /** Mover marker – 3D-style delivery truck with pulse ring */
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
          <!-- Cargo area (3D effect with gradient) -->
          <rect x="1" y="4" width="28" height="22" rx="3" fill="url(#cargo_grad)" stroke="#312e81" stroke-width="1.2"/>
          <!-- Cargo top highlight for 3D effect -->
          <rect x="2" y="5" width="26" height="6" rx="2" fill="rgba(255,255,255,0.18)"/>
          <!-- Cab area -->
          <path d="M29 12h10c2.2 0 4.2 1.2 5.2 3l3.3 6.6c.3.6.5 1.3.5 2V28a3 3 0 0 1-3 3h-2" fill="url(#cab_grad)" stroke="#312e81" stroke-width="1.2" stroke-linejoin="round"/>
          <!-- Windshield -->
          <path d="M32 14h6.5l4.5 8H32z" fill="#bfdbfe" stroke="#6366f1" stroke-width="0.8"/>
          <!-- Undercarriage -->
          <rect x="0" y="26" width="48" height="3" rx="1.5" fill="#312e81" opacity="0.5"/>
          <!-- Back wheel -->
          <circle cx="11" cy="31" r="5" fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5"/>
          <circle cx="11" cy="31" r="2" fill="#a5b4fc"/>
          <!-- Front wheel -->
          <circle cx="39" cy="31" r="5" fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5"/>
          <circle cx="39" cy="31" r="2" fill="#a5b4fc"/>
          <!-- Headlight -->
          <rect x="47" y="22" width="3" height="3" rx="1" fill="#fbbf24"/>
          <!-- PickLT branding stripe -->
          <rect x="3" y="18" width="24" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
          <defs>
            <linearGradient id="cargo_grad" x1="15" y1="4" x2="15" y2="26" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818cf8"/>
              <stop offset="1" stop-color="#4f46e5"/>
            </linearGradient>
            <linearGradient id="cab_grad" x1="38" y1="12" x2="38" y2="31" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366f1"/>
              <stop offset="1" stop-color="#4338ca"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `
    return el
  }

  /** Create a Mapbox Popup for a marker label */
  const createTooltipPopup = (label: string, color: string): mapboxgl.Popup => {
    return new mapboxgl.Popup({
      offset: 28,
      closeButton: false,
      closeOnClick: false,
      className: 'mapbox-marker-tooltip',
    }).setHTML(
      `<div style="padding:6px 12px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:${color};white-space:nowrap">${label}</div>`
    )
  }

  // Update markers when coordinates change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove old markers & popups
    Object.values(markersRef.current).forEach((marker) => marker.remove())
    markersRef.current = {}

    const bounds = new mapboxgl.LngLatBounds()
    let hasMarkers = false

    // Add pickup marker with tooltip
    if (pickupCoordinates) {
      const el = createPickupMarkerElement()
      const popup = createTooltipPopup('Pickup Location', '#16a34a')
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pickupCoordinates.longitude, pickupCoordinates.latitude])
        .setPopup(popup)
        .addTo(map.current)

      // Show tooltip on hover / tap
      el.addEventListener('mouseenter', () => marker.togglePopup())
      el.addEventListener('mouseleave', () => { if (popup.isOpen()) marker.togglePopup() })
      el.addEventListener('touchstart', () => marker.togglePopup(), { passive: true })

      markersRef.current['pickup'] = marker
      bounds.extend([pickupCoordinates.longitude, pickupCoordinates.latitude])
      hasMarkers = true
    }

    // Add dropoff marker with tooltip
    if (dropoffCoordinates) {
      const el = createDropoffMarkerElement()
      const popup = createTooltipPopup('Drop-off Location', '#dc2626')
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('mouseenter', () => marker.togglePopup())
      el.addEventListener('mouseleave', () => { if (popup.isOpen()) marker.togglePopup() })
      el.addEventListener('touchstart', () => marker.togglePopup(), { passive: true })

      markersRef.current['dropoff'] = marker
      bounds.extend([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
      hasMarkers = true
    }

    // Add mover marker with tooltip
    if (moverCoordinates) {
      const el = createMoverMarkerElement()
      const popup = createTooltipPopup('Your Mover', '#4f46e5')
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('mouseenter', () => marker.togglePopup())
      el.addEventListener('mouseleave', () => { if (popup.isOpen()) marker.togglePopup() })
      el.addEventListener('touchstart', () => marker.togglePopup(), { passive: true })

      markersRef.current['mover'] = marker
      bounds.extend([moverCoordinates.longitude, moverCoordinates.latitude])
      hasMarkers = true
    }

    // Fit bounds if we have markers
    if (hasMarkers) {
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 200, left: 60, right: 60 },
        maxZoom: 14,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoordinates, dropoffCoordinates, moverCoordinates, mapLoaded])

  // Draw route between pickup and dropoff
  useEffect(() => {
    if (!map.current || !mapLoaded || !showRoute || !pickupCoordinates || !dropoffCoordinates) return

    const getRoute = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoordinates.longitude},${pickupCoordinates.latitude};${dropoffCoordinates.longitude},${dropoffCoordinates.latitude}?geometries=geojson&access_token=${mapboxgl.accessToken}`
        )
        const data = await response.json()
        
        if (data.routes && data.routes[0]) {
          const route = data.routes[0].geometry
          const distance = data.routes[0].distance // in meters
          const duration = data.routes[0].duration // in seconds

          // Notify parent component about route info
          if (onRouteCalculated) {
            onRouteCalculated({ distance, duration })
          }

          // Remove existing route layer if it exists
          if (map.current?.getSource('route')) {
            map.current.removeLayer('route')
            map.current.removeSource('route')
          }

          // Add route to map
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
      } catch (error) {
        console.error('Error fetching route:', error)
      }
    }

    getRoute()
  }, [pickupCoordinates, dropoffCoordinates, showRoute, mapLoaded, onRouteCalculated])

  // Update mover position smoothly
  useEffect(() => {
    if (!moverCoordinates || !markersRef.current['mover']) return
    
    markersRef.current['mover'].setLngLat([
      moverCoordinates.longitude,
      moverCoordinates.latitude,
    ])
  }, [moverCoordinates])

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
    />
  )
}

export default MapboxMap
