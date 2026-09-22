import * as maplibregl from 'maplibre-gl'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'

export function getCabinetSvgString({
  size = 24,
  isRoot = false,
  isFault = false,
  uid = '',
}: {
  color?: string
  size?: number
  strokeWidth?: number
  isRoot?: boolean
  isFault?: boolean
  uid?: string
}) {
  const idSuffix = uid || `${isRoot ? 'root' : isFault ? 'fault' : 'norm'}-${Math.floor(Math.random() * 10000)}`

  let cHighlight = '#6ee7b7'
  let cBody = '#059669'
  let cDeep = '#047857'
  let cShadow = '#064e3b'

  if (isFault) {
    cHighlight = '#fda4af'
    cBody = '#e11d48'
    cDeep = '#be123c'
    cShadow = '#4c0519'
  } else if (isRoot) {
    cHighlight = '#fde047'
    cBody = '#d97706'
    cDeep = '#b45309'
    cShadow = '#451a03'
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2.5px 4px rgba(0,0,0,0.38)); pointer-events: none;">
    <defs>
      <!-- 3D Enclosure Volume Gradient (Directional Light from Top-Left) -->
      <linearGradient id="cab-body-${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cHighlight}" />
        <stop offset="28%" stop-color="${cBody}" />
        <stop offset="72%" stop-color="${cDeep}" />
        <stop offset="100%" stop-color="${cShadow}" />
      </linearGradient>

      <!-- 3D Beveled Outer Chamfer Rim -->
      <linearGradient id="cab-rim-${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2" />
      </linearGradient>

      <!-- Upper Metal Roof Gloss Reflection -->
      <linearGradient id="cab-gloss-${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05" />
      </linearGradient>
    </defs>

    <!-- 1. Main 3D Metallic Enclosure Body -->
    <rect x="3" y="2.5" width="18" height="19" rx="4" fill="url(#cab-body-${idSuffix})" stroke="url(#cab-rim-${idSuffix})" stroke-width="1.2" />

    <!-- 2. Weather Roof / Sun-shield Bevel Highlight -->
    <rect x="4.5" y="3.8" width="15" height="4.2" rx="2" fill="url(#cab-gloss-${idSuffix})" />

    <!-- 3. Embossed Horizontal Compartment Seam -->
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="rgba(255,255,255,0.4)" stroke-width="0.9" />
    <line x1="3.5" y1="10.4" x2="20.5" y2="10.4" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />

    <!-- 4. SCADA Status Pilot LED Diode -->
    <circle cx="6.8" cy="6.2" r="1.4" fill="${isFault ? '#fee2e2' : isRoot ? '#fef3c7' : '#d1fae5'}" stroke="rgba(0,0,0,0.25)" stroke-width="0.5" />
    <circle cx="6.5" cy="5.9" r="0.5" fill="#ffffff" />

    <!-- 5. Crisp White Embossed Electrical Lightning Bolt -->
    <path d="M12.5 11L8.5 15.5H11.8L10.5 20L15.5 14.5H12.2L13 11Z" fill="#ffffff" style="filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.35));" />

    ${
      isRoot
        ? `
      <!-- Root Substation Crown Badge -->
      <circle cx="17.8" cy="5.5" r="3.2" fill="#f59e0b" stroke="#ffffff" stroke-width="1" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));" />
      <path d="M17.8 3.8L18.4 5H19.7L18.7 5.9L19.1 7.2L17.8 6.4L16.5 7.2L16.9 5.9L15.9 5H17.2L17.8 3.8Z" fill="#ffffff" />
    `
        : ''
    }
  </svg>`
}

export function registerSvgIcon(map: maplibregl.Map, id: string, svg: string, size: number) {
  if (map.hasImage(id)) return
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size * 2
    canvas.height = size * 2
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0, size * 2, size * 2)
      const imgData = ctx.getImageData(0, 0, size * 2, size * 2)
      if (!map.hasImage(id)) {
        map.addImage(id, imgData, { pixelRatio: 2 })
      }
    }
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

interface CreatePoleMarkerParams {
  feature: PoleFeature
  isSelected: boolean
  isManagedBySelectedCabinet?: boolean
  isOtherCabinetSelected?: boolean
  onClick: (f: PoleFeature) => void
  onHover: (f: PoleFeature, coords: [number, number]) => void
  onLeave: () => void
}

export function createPoleMarkerElement({
  feature,
  isSelected,
  isManagedBySelectedCabinet = false,
  isOtherCabinetSelected = false,
  onClick,
  onHover,
  onLeave,
}: CreatePoleMarkerParams): HTMLDivElement {
  const p = feature.properties || {}
  const status = p.fixture_status || 'unknown'
  const isNearPoi = p.near_sensitive_poi === true

  const baseSize = isSelected ? 24 : isManagedBySelectedCabinet ? 20 : isOtherCabinetSelected ? 15 : 17
  const size = baseSize
  const half = size / 2
  const poleId = p.pole_id || Math.random().toString(36).substring(2, 6)

  // Rich Apple-style 3D Spherical Gradients
  let cHighlight = '#86efac'
  let cBody = '#10b981'
  let cDeep = '#047857'
  let cShadow = '#022c22'
  let glowCol = isManagedBySelectedCabinet
    ? 'rgba(16, 185, 129, 0.7)'
    : 'rgba(16, 185, 129, 0.35)'

  if (status === 'dim') {
    cHighlight = '#fef08a'
    cBody = '#f59e0b'
    cDeep = '#b45309'
    cShadow = '#451a03'
    glowCol = 'rgba(245, 158, 11, 0.4)'
  } else if (status === 'out') {
    cHighlight = '#fecdd3'
    cBody = '#f43f5e'
    cDeep = '#be123c'
    cShadow = '#4c0519'
    glowCol = 'rgba(244, 63, 94, 0.45)'
  } else if (status === 'unknown') {
    cHighlight = '#f1f5f9'
    cBody = '#64748b'
    cDeep = '#334155'
    cShadow = '#0f172a'
    glowCol = 'rgba(100, 116, 139, 0.2)'
  }

  const isPulsing = status === 'out' || isSelected || isManagedBySelectedCabinet

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '35' : isManagedBySelectedCabinet ? '30' : isOtherCabinetSelected ? '8' : '15'

  const markerWrap = document.createElement('div')
  markerWrap.className = `cursor-pointer pointer-events-auto group gis-marker-wrap gis-marker-visible ${isSelected ? 'is-selected' : ''}`
  markerWrap.style.position = 'absolute'
  markerWrap.style.top = `-${half}px`
  markerWrap.style.left = `-${half}px`
  markerWrap.style.width = `${size}px`
  markerWrap.style.height = `${size}px`
  markerWrap.style.display = 'flex'
  markerWrap.style.alignItems = 'center'
  markerWrap.style.justifyContent = 'center'
  markerWrap.style.transition = 'transform 0.2s ease, opacity 0.2s ease'

  if (isOtherCabinetSelected) {
    markerWrap.style.opacity = '0.35'
    markerWrap.style.filter = 'grayscale(35%)'
  } else if (isManagedBySelectedCabinet) {
    markerWrap.style.opacity = '1'
    markerWrap.style.transform = 'scale(1.15)'
  }

  markerWrap.innerHTML = `
    <!-- Subtle Ambient Glow -->
    <div style="position: absolute; inset: ${isManagedBySelectedCabinet ? '-5px' : '-3px'}; border-radius: 9999px; background: ${glowCol}; filter: blur(${isManagedBySelectedCabinet ? '3.5px' : '2.5px'}); ${isPulsing ? 'animation: pulse 1.8s infinite;' : ''}; pointer-events: none;"></div>

    <!-- Rich 3D Glass Sphere Marker SVG -->
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2; filter: drop-shadow(0 2.5px 3.5px rgba(0,0,0,0.4)); pointer-events: none;">
      <defs>
        <!-- 3D Spherical Volume Gradient (Light Source from Top-Left) -->
        <radialGradient id="sphere-${poleId}" cx="32%" cy="28%" r="75%">
          <stop offset="0%" stop-color="${cHighlight}" />
          <stop offset="35%" stop-color="${cBody}" />
          <stop offset="75%" stop-color="${cDeep}" />
          <stop offset="100%" stop-color="${cShadow}" />
        </radialGradient>
        <!-- 3D Bevel Rim Gradient (Brighter on top, subtle at bottom) -->
        <linearGradient id="rim-${poleId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.25" />
        </linearGradient>
        <!-- Top Gloss Sheen (Smooth Glass Dome Reflection) -->
        <linearGradient id="gloss-${poleId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
        </linearGradient>
      </defs>

      <!-- 1. 3D Sphere Base with 3D Light-Reflecting Bevel Rim -->
      <circle cx="12" cy="12" r="9.5" fill="url(#sphere-${poleId})" stroke="${isManagedBySelectedCabinet ? '#ffffff' : `url(#rim-${poleId})`}" stroke-width="${isManagedBySelectedCabinet ? '2' : '1.3'}" />

      <!-- 2. Curved Top Glass Sheen (Độ cong vòm kính phản quang 3D) -->
      <ellipse cx="12" cy="7" rx="5" ry="2.2" fill="url(#gloss-${poleId})" />
    </svg>

    <!-- POI Indicator -->
    ${
      isNearPoi
        ? `<div style="position: absolute; top: -3px; right: -3px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; width: 11px; height: 11px; border-radius: 9999px; border: 1.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; z-index: 5; box-shadow: 0 1px 3px rgba(0,0,0,0.3); pointer-events: none;" title="Gần trường học, bệnh viện">!</div>`
        : ''
    }
  `
  el.appendChild(markerWrap)

  const coords = feature.geometry.coordinates as [number, number]
  markerWrap.addEventListener('mouseenter', () => onHover(feature, coords))
  markerWrap.addEventListener('mouseleave', () => onLeave())
  markerWrap.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick(feature)
  })

  return el
}

interface CreateCabinetMarkerParams {
  cabinet: any
  isSelected: boolean
  onClick: (cab: any, coords: [number, number]) => void
  onHover: (cab: any, coords: [number, number]) => void
  onLeave: () => void
}

export function createCabinetMarkerElement({
  cabinet,
  isSelected,
  onClick,
  onHover,
  onLeave,
}: CreateCabinetMarkerParams): HTMLDivElement {
  const p = cabinet.properties || {}
  const isFault = p.status === 'fault'
  const size = 26
  const half = size / 2

  const glowCol = isFault
    ? 'rgba(244, 63, 94, 0.45)'
    : 'rgba(16, 185, 129, 0.35)'
  const isPulsing = isFault

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '30' : '20'

  const markerWrap = document.createElement('div')
  markerWrap.className = `cursor-pointer pointer-events-auto group gis-marker-wrap gis-marker-visible ${isSelected ? 'is-selected' : ''}`
  markerWrap.style.position = 'absolute'
  markerWrap.style.top = `-${half}px`
  markerWrap.style.left = `-${half}px`
  markerWrap.style.width = `${size}px`
  markerWrap.style.height = `${size}px`
  markerWrap.style.display = 'flex'
  markerWrap.style.alignItems = 'center'
  markerWrap.style.justifyContent = 'center'

  const cabId = p.cabinet_id || `cab-${Math.floor(Math.random() * 10000)}`

  markerWrap.innerHTML = `
    <!-- Ambient Halo -->
    <div style="position: absolute; inset: -3px; border-radius: 6px; background: ${glowCol}; filter: blur(3px); ${isPulsing ? 'animation: pulse 1.8s infinite;' : ''}; pointer-events: none;"></div>
    
    <!-- 3D Cabinet SVG Body -->
    <div style="position: relative; z-index: 2; pointer-events: none;">
      ${getCabinetSvgString({ size, isFault, uid: cabId })}
    </div>
  `
  el.appendChild(markerWrap)

  const coords = cabinet.geometry.coordinates as [number, number]
  markerWrap.addEventListener('mouseenter', () => onHover(cabinet, coords))
  markerWrap.addEventListener('mouseleave', () => onLeave())
  markerWrap.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick(cabinet, coords)
  })

  return el
}
