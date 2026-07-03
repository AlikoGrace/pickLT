'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ThemeContext } from '@/app/theme-provider'

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export interface MoveMarker {
  id: string
  lat: number
  lng: number
  price: number
  isSelected?: boolean
}

interface MoverMapboxMapProps {
  className?: string
  markers: MoveMarker[]
  selectedMarkerId?: string | null
  onMarkerClick?: (markerId: string) => void
  onMarkerHover?: (markerId: string | null) => void
  defaultCenter?: { lat: number; lng: number }
  defaultZoom?: number
  moverCoordinates?: { latitude: number; longitude: number }
}

export const MoverMapboxMap = ({
  className = '',
  markers,
  selectedMarkerId,
  onMarkerClick,
  onMarkerHover,
  defaultCenter = { lat: 52.52, lng: 13.405 }, // Berlin default
  defaultZoom = 12,
  moverCoordinates,
}: MoverMapboxMapProps) => {
  const isDarkMode = useContext(ThemeContext)?.isDarkMode ?? false

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const moverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Create price marker element
  const createPriceMarker = useCallback((price: number, isSelected: boolean, isHovered: boolean) => {
    const el = document.createElement('div')
    el.className = 'cursor-pointer transition-transform'
    
    const bgColor = isSelected 
      ? 'bg-primary-600' 
      : isHovered 
        ? 'bg-neutral-800 dark:bg-white' 
        : 'bg-white dark:bg-neutral-800'
    
    const textColor = isSelected 
      ? 'text-white' 
      : isHovered 
        ? 'text-white dark:text-neutral-900' 
        : 'text-neutral-900 dark:text-white'
    
    const scale = isSelected || isHovered ? 'scale-110' : ''
    const zIndex = isSelected ? 'z-20' : isHovered ? 'z-10' : 'z-0'
    
    el.innerHTML = `
      <div class="${bgColor} ${textColor} ${scale} ${zIndex} px-3 py-1.5 rounded-full shadow-lg font-semibold text-sm whitespace-nowrap border border-neutral-200 dark:border-neutral-700 transition-all">
        €${price}
      </div>
    `
    
    return el
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: defaultZoom,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)

      // Reposition the default controls to vertical center-right
      const topRight = map.current?.getContainer().querySelector('.mapboxgl-ctrl-top-right') as HTMLElement | null
      if (topRight) {
        topRight.style.top = '50%'
        topRight.style.transform = 'translateY(-50%)'
      }
    })

    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach((marker) => marker.remove())
      markersRef.current = {}
      moverMarkerRef.current?.remove()
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
    map.current.setStyle(newStyle)
    map.current.once('style.load', () => setMapLoaded(true))
  }, [isDarkMode])

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove old markers that are no longer in the data
    Object.keys(markersRef.current).forEach((id) => {
      if (!markers.find((m) => m.id === id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

    // Add or update markers
    markers.forEach((markerData) => {
      const isSelected = markerData.id === selectedMarkerId
      const existingMarker = markersRef.current[markerData.id]

      if (existingMarker) {
        // Update position if needed
        existingMarker.setLngLat([markerData.lng, markerData.lat])
        // Remove and recreate to update styling
        existingMarker.remove()
      }

      // Create new marker
      const el = createPriceMarker(markerData.price, isSelected, false)
      
      // Add event listeners
      el.addEventListener('click', () => {
        onMarkerClick?.(markerData.id)
      })
      
      el.addEventListener('mouseenter', () => {
        onMarkerHover?.(markerData.id)
        // Update marker style on hover
        const innerDiv = el.querySelector('div')
        if (innerDiv && !isSelected) {
          innerDiv.className = 'bg-neutral-800 dark:bg-white text-white dark:text-neutral-900 scale-110 z-10 px-3 py-1.5 rounded-full shadow-lg font-semibold text-sm whitespace-nowrap border border-neutral-200 dark:border-neutral-700 transition-all'
        }
      })
      
      el.addEventListener('mouseleave', () => {
        onMarkerHover?.(null)
        // Reset marker style
        const innerDiv = el.querySelector('div')
        if (innerDiv && !isSelected) {
          innerDiv.className = 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3 py-1.5 rounded-full shadow-lg font-semibold text-sm whitespace-nowrap border border-neutral-200 dark:border-neutral-700 transition-all'
        }
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current!)

      markersRef.current[markerData.id] = marker
    })

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((m) => bounds.extend([m.lng, m.lat]))
      
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 150, left: 50, right: 50 },
        maxZoom: 14,
        duration: 500,
      })
    }
  }, [markers, selectedMarkerId, mapLoaded, createPriceMarker, onMarkerClick, onMarkerHover])

  // Pan to selected marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedMarkerId) return

    const selectedMarker = markers.find((m) => m.id === selectedMarkerId)
    if (selectedMarker) {
      map.current.flyTo({
        center: [selectedMarker.lng, selectedMarker.lat],
        zoom: 14,
        duration: 500,
      })
    }
  }, [selectedMarkerId, markers, mapLoaded])

  // Mover's own location truck marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (!moverCoordinates) {
      moverMarkerRef.current?.remove()
      moverMarkerRef.current = null
      return
    }

    if (moverMarkerRef.current) {
      moverMarkerRef.current.setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
    } else {
      const el = document.createElement('div')
      el.style.cssText = 'display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer'
      el.innerHTML = `
        <style>
          @keyframes mover-ping{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.4);opacity:0}}
          @keyframes mover-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        </style>
        <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(79,70,229,.25);animation:mover-ping 1.8s cubic-bezier(0,.2,.6,1) infinite;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:relative;animation:mover-bob 2s ease-in-out infinite;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))">
          <!-- Aerial (top-down) truck — front points up -->
          <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- wheels (peeking out from under the body) -->
            <rect x="4" y="13" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
            <rect x="31" y="13" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
            <rect x="4" y="33" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
            <rect x="31" y="33" width="5" height="9" rx="2.5" fill="#1e1b4b"/>
            <!-- cargo box -->
            <rect x="7" y="8" width="26" height="42" rx="5" fill="url(#mcargo_grad)" stroke="#312e81" stroke-width="1.2"/>
            <!-- roof ridges -->
            <rect x="10" y="24" width="20" height="2" rx="1" fill="rgba(255,255,255,0.26)"/>
            <rect x="10" y="30" width="20" height="2" rx="1" fill="rgba(255,255,255,0.20)"/>
            <rect x="10" y="36" width="20" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
            <!-- cab -->
            <rect x="8" y="4" width="24" height="14" rx="5" fill="url(#mcab_grad)" stroke="#312e81" stroke-width="1.2"/>
            <!-- windshield -->
            <path d="M11 7.5h18v3c0 .9-.7 1.6-1.6 1.6H12.6c-.9 0-1.6-.7-1.6-1.6v-3z" fill="#bfdbfe" stroke="#6366f1" stroke-width="0.6"/>
            <!-- headlights -->
            <rect x="10" y="4.6" width="3.2" height="2" rx="1" fill="#fbbf24"/>
            <rect x="26.8" y="4.6" width="3.2" height="2" rx="1" fill="#fbbf24"/>
            <defs>
              <linearGradient id="mcargo_grad" x1="20" y1="8" x2="20" y2="50" gradientUnits="userSpaceOnUse">
                <stop stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/>
              </linearGradient>
              <linearGradient id="mcab_grad" x1="20" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      `

      moverMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([moverCoordinates.longitude, moverCoordinates.latitude])
        .addTo(map.current!)
    }
  }, [moverCoordinates, mapLoaded])

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
    <div className={`w-full h-full ${className}`} style={{ position: 'relative' }}>
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

export default MoverMapboxMap
