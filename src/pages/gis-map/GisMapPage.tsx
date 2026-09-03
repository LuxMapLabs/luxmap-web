import React, { useEffect, useRef, useState, useMemo } from 'react'
import type { Feature } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../utils/mapUtils'

// Mock Data
import mockPolesData from '../../data/mock-poles.geo.json'
import mockSegmentsData from '../../data/mock-segments.geo.json'

// Subcomponents & Types
import { MapControlBar } from './components/MapControlBar'
import { GisMapLegend } from './components/GisMapLegend'
import { GisDrawerPanel } from './components/GisDrawerPanel'

export interface SegmentInfo {
  id: string
  name: string
  cabinet: string
  road: string
  poleCount: number
  lengthM: number
  hasActiveSegmentFault?: boolean
  iotStatus?: string
}

export interface GisStats {
  total: number
  normal: number
  dim: number
  out: number
  unknown: number
}

export interface PoleProperties {
  pole_id: string
  segment_id: string
  fixture_status?: 'normal' | 'dim' | 'out' | 'unknown' | string
  power_source?: 'solar' | 'grid' | string
  fixture_type?: string
  lamp_watt?: number
  install_date?: string
  warranty_expiry?: string
  near_sensitive_poi?: boolean
}

export interface PoleFeature {
  type: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: PoleProperties
}

export interface SegmentProperties {
  segment_id: string
  segment_name?: string
  road_class?: string
  length_m?: number
  pole_count?: number
  controller_node_id?: string
  has_active_segment_fault?: boolean
}

export interface SegmentFeature {
  type: string
  geometry: {
    type: string
    coordinates: number[][]
  }
  properties: SegmentProperties
}

export const GisMapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const isHoveringPoleRef = useRef<boolean>(false)


  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [showLabels, setShowLabels] = useState<boolean>(false)
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)

  // Selection & Right Panel State
  const [selectedPole, setSelectedPole] = useState<PoleFeature | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'info' | 'iot'>('info')

  // Calculate Dynamic Segments List & Info
  const segmentsList = useMemo(() => {
    const rawSegments = (mockSegmentsData.features || []) as unknown as SegmentFeature[]
    return rawSegments.map((f: SegmentFeature, idx: number) => {
      const p = f.properties || {}
      const segId = p.segment_id || `SEG-00${idx + 1}`
      const isFault = p.has_active_segment_fault === true || segId === 'SEG-003'
      
      const poleCount = ((mockPolesData.features || []) as unknown as PoleFeature[]).filter(
        (pole: PoleFeature) => pole.properties?.segment_id === segId
      ).length || p.pole_count || 0

      let cleanName = segId === 'SEG-001' ? 'Tuyến A' : segId === 'SEG-002' ? 'Tuyến B' : segId === 'SEG-003' ? 'Tuyến C' : segId
      if (p.segment_name) {
        const raw = p.segment_name.split(' - ')[0]
        if (raw.toLowerCase().includes('tuyen a')) cleanName = 'Tuyến A'
        else if (raw.toLowerCase().includes('tuyen b')) cleanName = 'Tuyến B'
        else if (raw.toLowerCase().includes('tuyen c')) cleanName = 'Tuyến C'
        else cleanName = raw
      }

      return {
        id: segId,
        name: cleanName,
        cabinet: p.controller_node_id || `NODE-00${idx + 1}-CTRL`,
        road: cleanName,
        poleCount,
        lengthM: p.length_m || 0,
        hasActiveSegmentFault: isFault,
        iotStatus: isFault ? 'offline' : 'online',
      } as SegmentInfo
    })
  }, [])

  const segmentInfoMap: Record<string, SegmentInfo> = useMemo(() => {
    const map: Record<string, SegmentInfo> = {}
    segmentsList.forEach((s) => {
      map[s.id] = s
    })
    return map
  }, [segmentsList])

  // Active Segment Details
  const activeSegmentDetail = useMemo(() => {
    if (selectedSegmentId && segmentInfoMap[selectedSegmentId]) {
      return segmentInfoMap[selectedSegmentId]
    }
    return segmentsList[0] || {
      id: 'SEG-001',
      name: 'Tuyến A',
      cabinet: 'NODE-001-CTRL',
      road: 'Tuyến A',
      poleCount: 46,
      lengthM: 1600,
      hasActiveSegmentFault: false,
      iotStatus: 'online',
    }
  }, [selectedSegmentId, segmentInfoMap, segmentsList])



  // Autocomplete Suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return ((mockPolesData.features || []) as unknown as PoleFeature[])
      .filter((f: PoleFeature) => {
        const id = f.properties?.pole_id?.toLowerCase() || ''
        const seg = f.properties?.segment_id?.toLowerCase() || ''
        return id.includes(q) || seg.includes(q)
      })
      .slice(0, 8)
  }, [searchQuery])

  // Filtered Poles Features
  const filteredFeatures = useMemo(() => {
    return ((mockPolesData.features || []) as unknown as PoleFeature[]).filter((f: PoleFeature) => {
      const p = f.properties || {}
      
      if (selectedSegment !== 'all' && p.segment_id !== selectedSegment) {
        return false
      }

      if (statusFilter !== 'all' && p.fixture_status !== statusFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const id = p.pole_id?.toLowerCase() || ''
        const seg = p.segment_id?.toLowerCase() || ''
        if (!id.includes(q) && !seg.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [statusFilter, selectedSegment, searchQuery])

  // Filtered Segments GeoJSON Data (trimmed to match filtered poles)
  const filteredSegmentsData = useMemo(() => {
    const allSegments = (mockSegmentsData.features || []) as unknown as SegmentFeature[]
    
    // Group filtered poles by segment_id
    const polesBySeg: Record<string, PoleFeature[]> = {}
    filteredFeatures.forEach((pole) => {
      const segId = pole.properties?.segment_id
      if (segId) {
        if (!polesBySeg[segId]) polesBySeg[segId] = []
        polesBySeg[segId].push(pole)
      }
    })

    const builtSegments = allSegments
      .map((seg) => {
        const segId = seg.properties?.segment_id
        const segPoles = polesBySeg[segId] || []
        
        if (segPoles.length > 1) {
          const coordinates = segPoles.map((p) => p.geometry.coordinates)
          return {
            ...seg,
            geometry: {
              type: 'LineString',
              coordinates,
            },
          }
        }
        return null
      })
      .filter(Boolean) as SegmentFeature[]

    if (selectedSegment === 'all') return builtSegments
    return builtSegments.filter((f) => f.properties?.segment_id === selectedSegment)
  }, [selectedSegment, filteredFeatures])


  // GIS Overall Statistics
  const stats: GisStats = useMemo(() => {
    const list = (mockPolesData.features || []) as unknown as PoleFeature[]
    const total = list.length
    const normal = list.filter((f: PoleFeature) => f.properties?.fixture_status === 'normal').length
    const dim = list.filter((f: PoleFeature) => f.properties?.fixture_status === 'dim').length
    const out = list.filter((f: PoleFeature) => f.properties?.fixture_status === 'out').length
    const unknown = list.filter((f: PoleFeature) => !['normal', 'dim', 'out'].includes(f.properties?.fixture_status || '')).length
    return { total, normal, dim, out, unknown }
  }, [])

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      minZoom: 6,
      maxZoom: 20,
      attributionControl: false,
    })

    mapRef.current = map

    // Controls
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right')



    
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    })

    geolocate.on('trackuserlocationstart', () => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.add('is-searching-location')
    })

    geolocate.on('geolocate', (e: maplibregl.GeolocatePositionEvent) => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.add('is-searching-location')

      if (e?.coords) {
        map.flyTo({
          center: [e.coords.longitude, e.coords.latitude],
          zoom: 17,
          speed: 1.2,
        })
        map.once('moveend', () => {
          btn?.classList.remove('is-searching-location')
        })
      } else {
        btn?.classList.remove('is-searching-location')
      }
    })

    geolocate.on('error', (err: maplibregl.GeolocateErrorEvent) => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.remove('is-searching-location')
      console.warn('Geolocation error:', err)
      if (err?.code === 1) {
        alert('Trình duyệt chưa được cấp quyền Vị trí (Location). Bạn vui lòng bấm vào biểu tượng cài đặt trên thanh địa chỉ URL để cấp quyền nhé!')
      }
    })

    map.addControl(geolocate, 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left')

    // Tooltip Popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -14],
      className: 'feeder-hover-tooltip',
    })
    popupRef.current = popup

    map.on('load', () => {
      // Register custom Vector Arch Bridge Icon (SDF)
      const bridgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <path d="M4 12 L44 12 L44 16 L4 16 Z" fill="#ffffff"/>
        <line x1="4" y1="8" x2="44" y2="8" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M4 16 L4 34 L8 34 L8 24 C10 16 20 16 22 24 L22 34 L26 34 L26 24 C28 16 38 16 40 24 L40 34 L44 34 L44 16 Z" fill="#ffffff"/>
      </svg>`
      const bridgeImg = new Image(48, 48)
      bridgeImg.onload = () => {
        if (!map.hasImage('bridge_icon')) {
          map.addImage('bridge_icon', bridgeImg, { sdf: true })
        }
      }
      bridgeImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bridgeSvg)

      // Feeder Segments Line Layer
      map.addSource('feeder-lines', {


        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: filteredSegmentsData as unknown as Feature[],
        },
      })

      // Glow Underlay
      map.addLayer({
        id: 'feeder-lines-glow',
        type: 'line',
        source: 'feeder-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'segment_id'], 'SEG-003'],
            '#e11d48',
            '#00f2fe',
          ],
          'line-width': 9,
          'line-opacity': 0.45,
          'line-blur': 4,
        },
      })

      // Core Line
      map.addLayer({
        id: 'feeder-lines-core',
        type: 'line',
        source: 'feeder-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'segment_id'], 'SEG-003'],
            '#f43f5e',
            '#38bdf8',
          ],
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      })

      // Segment Hover Events
      map.on('mousemove', 'feeder-lines-core', (e) => {
        if (isHoveringPoleRef.current) {
          map.getCanvas().style.cursor = ''
          if (popupRef.current) popupRef.current.remove()
          return
        }
        if (!e.features || e.features.length === 0) return
        map.getCanvas().style.cursor = 'pointer'
        const feat = e.features[0]
        const p = feat.properties || {}
        const segId = p.segment_id || 'SEG-001'
        const info = segmentInfoMap[segId]


        if (info && popupRef.current) {
          const isFault = info.hasActiveSegmentFault
          const statusBg = isFault ? 'bg-rose-500' : 'bg-emerald-500'
          const statusText = isFault ? 'Sự cố mất điện lộ' : 'Đang cấp điện bình thường'

          const html = `
            <div class="bg-white/98 text-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200/90 backdrop-blur-md min-w-56 font-sans">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span class="font-bold text-xs text-blue-700 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full ${statusBg} animate-pulse"></span>
                  ${info.id} - ${info.cabinet}
                </span>
                <span class="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">${info.poleCount} Cột</span>
              </div>
              <div class="pt-2 space-y-1.5 text-[11.5px]">
                <div class="font-bold text-slate-800">${info.name}</div>
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-slate-500 font-medium">Chiều dài:</span>
                  <span class="font-mono text-slate-700 font-bold">${info.lengthM}m</span>
                </div>
                <div class="flex items-center justify-between text-[11px] pt-0.5">
                  <span class="text-slate-500 font-medium">Trạng thái:</span>
                  <span class="${isFault ? 'text-rose-600 bg-rose-50 border border-rose-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'} px-2 py-0.5 rounded-full font-bold text-[10.5px]">${statusText}</span>
                </div>
              </div>
            </div>
          `

          popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)

        }
      })

      map.on('mouseleave', 'feeder-lines-core', () => {
        map.getCanvas().style.cursor = ''
        if (popupRef.current) popupRef.current.remove()
      })

      map.on('click', 'feeder-lines-core', (e) => {
        if (!e.features || e.features.length === 0) return
        const p = e.features[0].properties || {}
        const segId = p.segment_id || 'SEG-001'
        setSelectedSegmentId(segId)
        setSelectedPole(null)
        setPanelTab('info')
      })
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Update Feeder Lines GeoJSON when selected segment filter changes
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    if (map.getSource('feeder-lines')) {
      const src = map.getSource('feeder-lines') as maplibregl.GeoJSONSource
      src.setData({
        type: 'FeatureCollection',
        features: filteredSegmentsData as unknown as Feature[],
      })



    }
  }, [filteredSegmentsData])

  // Render 103 Custom Pole Markers with DOM Elements
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    filteredFeatures.forEach((f: PoleFeature) => {
      const p = f.properties || {}
      const coords = f.geometry.coordinates
      const isSelected = selectedPole && selectedPole.properties?.pole_id === p.pole_id
      const status = p.fixture_status || 'unknown'
      const isNearPoi = p.near_sensitive_poi === true
      const size = isSelected ? 26 : 18
      const strokeW = isSelected ? 3 : 2

      const el = document.createElement('div')
      el.className = 'select-none pointer-events-auto cursor-pointer group'
      el.style.width = '0px'
      el.style.height = '0px'
      el.style.position = 'relative'
      el.style.zIndex = isSelected ? '20' : '5'

      // Status Colors
      let fillCol = '#10b981'
      let glowCol = 'rgba(16, 185, 129, 0.4)'
      if (status === 'dim') {
        fillCol = '#f59e0b'
        glowCol = 'rgba(245, 158, 11, 0.45)'
      } else if (status === 'out') {
        fillCol = '#f43f5e'
        glowCol = 'rgba(244, 63, 94, 0.45)'
      } else if (status === 'unknown') {
        fillCol = '#64748b'
        glowCol = 'rgba(100, 116, 139, 0.25)'
      }

      const half = size / 2

      let html = `
        <div style="position: absolute; top: -${half}px; left: -${half}px; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${glowCol}; filter: blur(3px); ${status === 'out' || isSelected ? 'animation: pulse 2s infinite;' : ''}"></div>
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="position: relative; z-index: 1;">
            <circle cx="12" cy="12" r="10" fill="${fillCol}" stroke="#ffffff" stroke-width="${strokeW}" />
            ${status === 'normal' ? '<circle cx="12" cy="12" r="3" fill="#ffffff" />' : ''}
          </svg>
          ${
            isNearPoi
              ? `<div style="position: absolute; top: -3px; right: -3px; background: #e11d48; color: #fff; width: 11px; height: 11px; border-radius: 9999px; border: 1.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; z-index: 2;">!</div>`
              : ''
          }
        </div>
      `

      if (showLabels || isSelected) {
        html += `
          <div style="position: absolute; top: ${half + 3}px; left: 0px; transform: translateX(-50%); background: rgba(15, 23, 42, 0.88); color: #ffffff; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; font-family: monospace; white-space: nowrap; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 2px 6px rgba(0,0,0,0.35); backdrop-filter: blur(2px); pointer-events: none; z-index: 3;">
            ${p.pole_id}
          </div>
        `
      }

      el.innerHTML = html

      el.addEventListener('mouseenter', () => {
        isHoveringPoleRef.current = true
        if (popupRef.current) popupRef.current.remove()
      })

      el.addEventListener('mouseleave', () => {
        isHoveringPoleRef.current = false
      })

      el.addEventListener('mousemove', (e) => {
        e.stopPropagation()
        isHoveringPoleRef.current = true
        if (popupRef.current) popupRef.current.remove()
      })

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (popupRef.current) popupRef.current.remove()
        handleSelectPole(f)
      })


      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)

        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [filteredFeatures, selectedPole, showLabels])

  // Handle Segment Select & FitBounds
  const handleSegmentSelect = (segId: string) => {
    setSelectedSegment(segId)
    if (!mapRef.current) return
    const map = mapRef.current

    if (segId === 'all') {
      const allPoles = (mockPolesData.features || []) as unknown as PoleFeature[]
      if (allPoles.length === 0) return
      const bounds = new maplibregl.LngLatBounds()
      allPoles.forEach((f: PoleFeature) => bounds.extend(f.geometry.coordinates))
      map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 15.5 })
    } else {
      const segPoles = ((mockPolesData.features || []) as unknown as PoleFeature[]).filter(
        (f: PoleFeature) => f.properties?.segment_id === segId
      )
      if (segPoles.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        segPoles.forEach((f: PoleFeature) => bounds.extend(f.geometry.coordinates))
        map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 16.5 })
      }
    }
  }

  // Select Pole
  const handleSelectPole = (f: PoleFeature) => {
    setSelectedPole(f)
    setSelectedSegmentId(f.properties?.segment_id || null)
    setPanelTab('info')

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: f.geometry.coordinates,
        zoom: 17.5,
        speed: 1.2,
      })
    }
  }

  // Select Pole from Search Dropdown
  const handleSelectSearchResult = (f: PoleFeature) => {
    setSelectedPole(f)
    setSelectedSegmentId(f.properties?.segment_id || null)
    setIsSearchFocused(false)
    setPanelTab('info')

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: f.geometry.coordinates,
        zoom: 17.5,
        speed: 1.2,
      })
    }
  }

  const isPanelOpen = Boolean(selectedPole || selectedSegmentId)

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-slate-50 relative select-none">
      
      {/* Tooltip Global Style */}
      <style>{`
        .feeder-hover-tooltip {
          pointer-events: none !important;
          max-width: none !important;
          z-index: 99999 !important;
        }

        .feeder-hover-tooltip .maplibregl-popup-content {
          box-shadow: none !important;
          background: transparent !important;
          border-radius: 10px !important;
          max-width: none !important;
          padding: 0 !important;
        }
        .feeder-hover-tooltip .maplibregl-popup-tip {
          border-top-color: #ffffff !important;
        }
        /* Attribution: Native compact mode showing ONLY the (i) button until clicked */
        .maplibregl-ctrl-attrib.maplibregl-compact {
          background-color: transparent !important;
          border-radius: 12px !important;
        }

        .maplibregl-ctrl-attrib.maplibregl-compact:not(.maplibregl-compact-show) {
          background-color: transparent !important;
          padding: 0 !important;
        }

        .maplibregl-ctrl-attrib.maplibregl-compact:not(.maplibregl-compact-show) .maplibregl-ctrl-attrib-inner {
          display: none !important;
        }

        .maplibregl-ctrl-attrib.maplibregl-compact.maplibregl-compact-show {
          background-color: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(6px) !important;
          padding: 2px 28px 2px 8px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }

        .maplibregl-ctrl-attrib.maplibregl-compact.maplibregl-compact-show .maplibregl-ctrl-attrib-inner {
          display: inline-block !important;
          font-size: 11px !important;
        }
      `}</style>





      {/* Map Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        
        {/* Top Control Bar */}
        <MapControlBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          searchSuggestions={searchSuggestions}
          handleSelectSearchResult={handleSelectSearchResult}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stats={stats}
          selectedSegment={selectedSegment}
          handleSegmentSelect={handleSegmentSelect}
          segmentsList={segmentsList}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
        />

        {/* Map Canvas Container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Bottom Left Legend Box */}
        <GisMapLegend />

      </div>

      {/* Right Drawer Side Panel */}
      {isPanelOpen && (
        <GisDrawerPanel
          selectedPole={selectedPole}
          setSelectedPole={setSelectedPole}
          setSelectedSegmentId={setSelectedSegmentId}
          activeSegmentDetail={activeSegmentDetail}
          panelTab={panelTab}
          setPanelTab={setPanelTab}
          handleSelectPole={handleSelectPole}
        />
      )}

    </div>
  )
}

export default GisMapPage
