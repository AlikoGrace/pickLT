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
}

export const MapboxMap = ({
  className = '',
  pickupCoordinates,
  dropoffCoordinates,
  moverCoordinates,
  showRoute = true,
  onMapLoad,
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
  }, [])

  // Create custom marker element
  const createMarkerElement = (type: 'pickup' | 'dropoff' | 'mover', pulse?: boolean) => {
    const el = document.createElement('div')
    el.className = 'flex flex-col items-center'
    
    const colors = {
      pickup: 'bg-neutral-900 dark:bg-white',
      dropoff: 'bg-neutral-900 dark:bg-white',
      mover: 'bg-primary-600',
    }

    const icons = {
      pickup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8Z"/></svg>`,
      dropoff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      mover: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13h20M2 13v5a2 2 0 0 0 2 2h1M2 13V9a2 2 0 0 1 2-2h10v6M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M14 7h4l3 6v5h-2"/></svg>`,
    }

    el.innerHTML = `
      <div class="relative">
        ${pulse ? '<div class="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-40"></div>' : ''}
        <div class="${colors[type]} rounded-full p-2 shadow-lg flex items-center justify-center text-white ${type === 'pickup' || type === 'dropoff' ? 'dark:text-neutral-900' : ''}">
          ${icons[type]}
        </div>
      </div>
    `
    
    return el
  }

  // Update markers when coordinates change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove())
    markersRef.current = {}

    const bounds = new mapboxgl.LngLatBounds()
    let hasMarkers = false

    // Add pickup marker
    if (pickupCoordinates) {
      const el = createMarkerElement('pickup')
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pickupCoordinates.longitude, pickupCoordinates.latitude])
        .addTo(map.current)
      markersRef.current['pickup'] = marker
      bounds.extend([pickupCoordinates.longitude, pickupCoordinates.latitude])
      hasMarkers = true
    }

    // Add dropoff marker
    if (dropoffCoordinates) {
      const el = createMarkerElement('dropoff')
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
        .addTo(map.current)
      markersRef.current['dropoff'] = marker
      bounds.extend([dropoffCoordinates.longitude, dropoffCoordinates.latitude])
      hasMarkers = true
    }

    // Add mover marker
    if (moverCoordinates) {
      const el = createMarkerElement('mover', true)
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
        .addTo(map.current)
      markersRef.current['mover'] = marker
      bounds.extend([moverCoordinates.longitude, moverCoordinates.latitude])
      hasMarkers = true
    }

    // Fit bounds if we have markers
    if (hasMarkers) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 14,
      })
    }
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
  }, [pickupCoordinates, dropoffCoordinates, showRoute, mapLoaded])

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
