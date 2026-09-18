import * as maplibregl from 'maplibre-gl'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'

export function getCabinetSvgString({
  color = '#10b981',
  size = 24,
  strokeWidth = 2,
  isRoot = false,
  isFault = false,
}: {
  color?: string
  size?: number
  strokeWidth?: number
  isRoot?: boolean
  isFault?: boolean
}) {
  const enclosureBorder = isFault ? '#f43f5e' : isRoot ? '#f59e0b' : color
  const boltColor = isFault ? '#f43f5e' : isRoot ? '#fbbf24' : '#34d399'
  const ledColor = isFault ? '#f43f5e' : isRoot ? '#f59e0b' : '#10b981'

  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.65));">
    <defs>
      <!-- Substation Chassis Gradient -->
      <linearGradient id="cab-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#152646" />
        <stop offset="100%" stop-color="#080f1d" />
      </linearGradient>
      <!-- Subtle metallic upper sheen -->
      <linearGradient id="cab-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Outer Chamfered Enclosure Box -->
    <rect x="2.5" y="2.5" width="23" height="23" rx="5.5" fill="url(#cab-body-grad)" stroke="${enclosureBorder}" stroke-width="${strokeWidth}" />
    <!-- Glass/Metallic Upper Sheen -->
    <rect x="3.5" y="3.5" width="21" height="9" rx="4" fill="url(#cab-sheen)" />

    <!-- Industrial Circuit Cooling Vents (Top line) -->
    <line x1="6.5" y1="7.5" x2="21.5" y2="7.5" stroke="${enclosureBorder}" stroke-width="1.2" stroke-opacity="0.4" stroke-dasharray="2 1.5" />

    <!-- Center Glowing High-Voltage Lightning Bolt -->
    <path d="M15 8.5L9.5 15.5H14L13 21L18.5 14H14L15 8.5Z" fill="${boltColor}" style="filter: drop-shadow(0 0 3px ${boltColor});" />

    <!-- Status Power LED (Bottom-Right) -->
    <circle cx="21" cy="21" r="1.8" fill="${ledColor}" stroke="#0b1322" stroke-width="0.6" style="filter: drop-shadow(0 0 3px ${ledColor});" />

    <!-- Root Master Crown / Badge (Top-Right) -->
    ${
      isRoot
        ? `
      <g transform="translate(16, 2)">
        <rect x="0" y="0" width="10" height="7.5" rx="2" fill="#f59e0b" stroke="#0b1322" stroke-width="0.8"/>
        <text x="5" y="5.8" font-family="system-ui, -apple-system, sans-serif" font-size="5.5" font-weight="900" fill="#0b1322" text-anchor="middle">M</text>
      </g>
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
  onClick: (f: PoleFeature) => void
  onHover: (f: PoleFeature, coords: [number, number]) => void
  onLeave: () => void
}

export function createPoleMarkerElement({
  feature,
  isSelected,
  onClick,
  onHover,
  onLeave,
}: CreatePoleMarkerParams): HTMLDivElement {
  const p = feature.properties || {}
  const status = p.fixture_status || 'unknown'
  const isNearPoi = p.near_sensitive_poi === true
  const size = isSelected ? 24 : 18
  const half = size / 2
  const poleId = p.pole_id || Math.random().toString(36).substring(2, 6)

  // Palette & lighting configuration for each status
  let lensHighlight = '#a7f3d0'
  let lensCore = '#10b981'
  let lensPerimeter = '#047857'
  let ambientGlow = 'radial-gradient(circle, rgba(52,211,153,0.55) 0%, rgba(16,185,129,0.18) 65%, transparent 100%)'
  let bezelStroke = isSelected ? '#38bdf8' : 'rgba(52, 211, 153, 0.5)'
  const strokeW = isSelected ? 2.4 : 1.2

  if (status === 'dim') {
    lensHighlight = '#fef08a'
    lensCore = '#f59e0b'
    lensPerimeter = '#b45309'
    ambientGlow = 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(245,158,11,0.2) 65%, transparent 100%)'
    bezelStroke = isSelected ? '#38bdf8' : 'rgba(251, 191, 36, 0.55)'
  } else if (status === 'out') {
    lensHighlight = '#fecdd3'
    lensCore = '#f43f5e'
    lensPerimeter = '#9f1239'
    ambientGlow = 'radial-gradient(circle, rgba(244,63,94,0.6) 0%, rgba(225,29,72,0.2) 65%, transparent 100%)'
    bezelStroke = isSelected ? '#38bdf8' : 'rgba(244, 63, 94, 0.7)'
  } else if (status === 'unknown') {
    lensHighlight = '#e2e8f0'
    lensCore = '#64748b'
    lensPerimeter = '#334155'
    ambientGlow = 'radial-gradient(circle, rgba(148,163,184,0.4) 0%, rgba(100,116,139,0.15) 65%, transparent 100%)'
    bezelStroke = isSelected ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)'
  }

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '35' : status === 'out' ? '25' : '15'

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

  markerWrap.innerHTML = `
    <!-- 1. Ambient Luminescent Aura (Hiệu ứng toả sáng đèn đường sạch sẽ, không có sóng lan) -->
    <div style="position: absolute; inset: -5px; border-radius: 9999px; background: ${ambientGlow}; pointer-events: none;"></div>

    <!-- 2. Target Reticle Beacon (Khi đang được chọn) -->
    ${
      isSelected
        ? `
      <div style="position: absolute; inset: -6px; border-radius: 9999px; border: 2px solid #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.7); pointer-events: none;"></div>
    `
        : ''
    }

    <!-- 3. 3D Optical Diode Lens SVG (Thấu kính đèn đường LED hiện đại) -->
    <svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6)); pointer-events: none;">
      <defs>
        <radialGradient id="grad-pole-${poleId}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${lensHighlight}" />
          <stop offset="50%" stop-color="${lensCore}" />
          <stop offset="100%" stop-color="${lensPerimeter}" />
        </radialGradient>
      </defs>

      <!-- Outer Protective Cyber Bezel -->
      <circle cx="10" cy="10" r="9" fill="rgba(11, 19, 34, 0.82)" stroke="${bezelStroke}" stroke-width="${strokeW}" />

      <!-- Main Glowing Diode Dome -->
      <circle cx="10" cy="10" r="6.8" fill="url(#grad-pole-${poleId})" />

      <!-- Optical Glass Specular Highlight (Ánh gương phản quang 3D) -->
      <circle cx="7.2" cy="7.2" r="1.6" fill="#ffffff" opacity="0.85" />

      <!-- Inner indicator for status 'out' (Cross mark) -->
      ${
        status === 'out'
          ? `
        <line x1="8" y1="8" x2="12" y2="12" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.95" />
        <line x1="12" y1="8" x2="8" y2="12" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.95" />
      `
          : ''
      }
    </svg>

    <!-- 4. Sensitive POI Micro Badge (Trường học, Bệnh viện) -->
    ${
      isNearPoi
        ? `
      <div style="position: absolute; top: -5px; right: -5px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; width: 13px; height: 13px; border-radius: 9999px; border: 1.5px solid #0b1322; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; z-index: 10; box-shadow: 0 0 6px rgba(168, 85, 247, 0.85); pointer-events: none;" title="Gần trường học, bệnh viện">!</div>
    `
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
  const isRoot = p.role === 'root_cabinet'
  const isFault = p.status === 'fault'
  const size = isRoot ? 32 : 25
  const half = size / 2

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '40' : isRoot ? '30' : '20'

  const markerWrap = document.createElement('div')
  markerWrap.className = `cursor-pointer pointer-events-auto group gis-marker-wrap gis-marker-visible ${isSelected ? 'is-selected' : ''} ${isRoot ? 'is-root' : ''}`
  markerWrap.style.position = 'absolute'
  markerWrap.style.top = `-${half}px`
  markerWrap.style.left = `-${half}px`
  markerWrap.style.width = `${size}px`
  markerWrap.style.height = `${size}px`
  markerWrap.style.display = 'flex'
  markerWrap.style.alignItems = 'center'
  markerWrap.style.justifyContent = 'center'

  const glowColor = isFault ? '#f43f5e' : isRoot ? '#f59e0b' : '#10b981'

  markerWrap.innerHTML = `
    <!-- 1. Ambient Enclosure Glow (Quầng sáng êm dịu bao quanh tủ, không có sóng radar) -->
    <div style="position: absolute; inset: -3px; border-radius: 8px; background: ${glowColor}; opacity: ${isFault ? 0.5 : isSelected ? 0.5 : 0.25}; filter: blur(4px); pointer-events: none;"></div>

    <!-- 2. Target Reticle for Selected Cabinet -->
    ${
      isSelected
        ? `
      <div style="position: absolute; inset: -6px; border-radius: 10px; border: 2px solid #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.75); pointer-events: none;"></div>
    `
        : ''
    }

    <!-- 3. Smart Enclosure SVG Chassis -->
    <div style="position: relative; z-index: 2; pointer-events: none; transition: transform 0.2s ease;">
      ${getCabinetSvgString({ color: isFault ? '#f43f5e' : isRoot ? '#f59e0b' : '#10b981', size, strokeWidth: isRoot || isSelected ? 2.2 : 1.8, isRoot, isFault })}
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
