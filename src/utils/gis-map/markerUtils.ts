import * as maplibregl from 'maplibre-gl'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'

export function getCabinetSvgString({
  color = '#059669',
  size = 24,
  strokeWidth = 2,
  isRoot = false,
}: {
  color?: string
  size?: number
  strokeWidth?: number
  isRoot?: boolean
}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="#ffffff" stroke="${color}" stroke-width="${strokeWidth}"/>
    <path d="M3.5 8H20.5" stroke="${color}" stroke-width="1.5"/>
    <path d="M13 9L8.5 14H12L11 18L15.5 13H12L13 9Z" fill="${color}"/>
    ${
      isRoot
        ? `
      <circle cx="17.5" cy="6.5" r="3.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
      <path d="M17.5 4.8L18.1 6.2H19.5L18.4 7.1L18.8 8.5L17.5 7.6L16.2 8.5L16.6 7.1L15.5 6.2H16.9L17.5 4.8Z" fill="#ffffff"/>
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
  const size = isSelected ? 24 : 16
  const strokeW = isSelected ? 2.5 : 1.8

  let fillCol = '#10b981'
  let glowCol = 'rgba(16, 185, 129, 0.45)'
  if (status === 'dim') {
    fillCol = '#f59e0b'
    glowCol = 'rgba(245, 158, 11, 0.5)'
  } else if (status === 'out') {
    fillCol = '#f43f5e'
    glowCol = 'rgba(244, 63, 94, 0.6)'
  } else if (status === 'unknown') {
    fillCol = '#64748b'
    glowCol = 'rgba(100, 116, 139, 0.25)'
  }

  const isPulsing = status === 'out' || isSelected
  const half = size / 2

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '25' : '15'

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
    <!-- Glowing & Pulsing Halo -->
    <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${glowCol}; filter: blur(3px); ${isPulsing ? 'animation: pulse 1.8s infinite;' : ''}; pointer-events: none;"></div>
    
    <!-- Core SVG Circle -->
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="position: relative; z-index: 2; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); pointer-events: none;">
      <circle cx="12" cy="12" r="10" fill="${fillCol}" stroke="#ffffff" stroke-width="${strokeW}" />
      ${status === 'normal' ? '<circle cx="12" cy="12" r="3.2" fill="#ffffff" />' : ''}
    </svg>

    <!-- POI Indicator -->
    ${isNearPoi ? `<div style="position: absolute; top: -3px; right: -3px; background: #7c3aed; color: #fff; width: 11px; height: 11px; border-radius: 9999px; border: 1.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; z-index: 3; pointer-events: none;" title="Gần trường, cầu">!</div>` : ''}
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
  const size = isRoot ? 28 : 22
  const half = size / 2

  const glowCol = isFault
    ? 'rgba(244, 63, 94, 0.7)'
    : isSelected
    ? 'rgba(16, 185, 129, 0.75)'
    : 'rgba(16, 185, 129, 0.35)'
  const isPulsing = isFault || isSelected

  const el = document.createElement('div')
  el.className = 'select-none pointer-events-none'
  el.style.width = '0px'
  el.style.height = '0px'
  el.style.position = 'relative'
  el.style.zIndex = isSelected ? '30' : isRoot ? '25' : '20'

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

  markerWrap.innerHTML = `
    <!-- Glowing & Pulsing Halo -->
    <div style="position: absolute; inset: -4px; border-radius: 8px; background: ${glowCol}; filter: blur(4px); ${isPulsing ? 'animation: pulse 1.6s infinite;' : ''}; pointer-events: none;"></div>
    
    <!-- Cabinet SVG Body -->
    <div style="position: relative; z-index: 2; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3)); pointer-events: none;">
      ${getCabinetSvgString({ color: isFault ? '#e11d48' : '#059669', size, strokeWidth: 2, isRoot })}
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
