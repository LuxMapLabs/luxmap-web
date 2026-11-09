import type { IControl, Map as MapLibreMap } from 'maplibre-gl'
import type { LngLatBoundsTuple } from './mapUtils'

// Icon lucide (inline SVG) để nút có cùng kiểu với các nút điều khiển gốc của MapLibre
const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

export const LOCATE_FIXED_SVG = `<svg ${SVG_ATTRS}><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>`

export const CROSSHAIR_SVG = `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>`

interface MapRecenterControlOptions {
  title: string
  iconSvg: string
  onClick: (map: MapLibreMap) => void
}

/**
 * Nút điều khiển bản đồ cùng nhóm/kiểu với NavigationControl (xếp ngay dưới nút zoom),
 * để mọi bản đồ có nút "về" đồng bộ vị trí và hình dạng.
 */
export class MapRecenterControl implements IControl {
  private container: HTMLDivElement | null = null
  private map: MapLibreMap | null = null
  private readonly options: MapRecenterControlOptions

  constructor(options: MapRecenterControlOptions) {
    this.options = options
  }

  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    const button = document.createElement('button')
    button.type = 'button'
    button.title = this.options.title
    button.setAttribute('aria-label', this.options.title)
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.justifyContent = 'center'
    button.style.color = '#334155'
    const svg = new DOMParser().parseFromString(this.options.iconSvg, 'image/svg+xml').documentElement
    button.appendChild(document.importNode(svg, true))
    button.addEventListener('click', () => {
      if (this.map) this.options.onClick(this.map)
    })

    container.appendChild(button)
    this.container = container
    return container
  }

  onRemove(): void {
    this.container?.remove()
    this.container = null
    this.map = null
  }
}

/** Nút "Về khu vực quản lý": đưa bản đồ về khung bbox của xã. */
export function createManagedAreaControl(getBounds: () => LngLatBoundsTuple | null) {
  return new MapRecenterControl({
    title: 'Về khu vực quản lý',
    iconSvg: LOCATE_FIXED_SVG,
    onClick: (map) => {
      const bounds = getBounds()
      if (bounds) map.fitBounds(bounds, { padding: 40, duration: 800 })
    },
  })
}
