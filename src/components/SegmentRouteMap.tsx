import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GOOGLE_HYBRID_STYLE, DEFAULT_MAP_CENTER } from '../utils/gis-map/mapUtils'
import { projectPointOnSegment, calculateDistanceMeters } from '../utils/gis-map/routeUtils'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Undo2,
  PlusCircle,
  MousePointer,
} from 'lucide-react'

export interface SegmentPoleItem {
  id: string
  code?: string
  coord: [number, number]
  status?: string
  atlas?: string
}

export type SegmentEditMode = 'view' | 'prepend' | 'append'

export interface SegmentRouteMapProps {
  coordinates?: [number, number][]
  originalRouteCoords?: [number, number][]
  startCoord?: [number, number] // [lng, lat]
  endCoord?: [number, number]   // [lng, lat]
  originalStartCoord?: [number, number]
  originalEndCoord?: [number, number]
  height?: string
  editable?: boolean
  defaultEditMode?: SegmentEditMode
  hideTerminalPins?: boolean
  onStartCoordChange?: (coord: [number, number]) => void
  onEndCoordChange?: (coord: [number, number]) => void
  onRouteCoordsChange?: (coords: [number, number][]) => void
  poles?: SegmentPoleItem[]
}

interface HistorySnapshot {
  coords: [number, number][]
  start?: [number, number]
  end?: [number, number]
}

// Coordinate validator (checks if longitude and latitude are in valid range)
const isValidCoord = (c?: [number, number]): c is [number, number] => {
  return (
    Array.isArray(c) &&
    c.length === 2 &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1]) &&
    c[0] > 50 &&
    c[0] < 180 &&
    c[1] > 0 &&
    c[1] < 90
  )
}

// Round coordinate to 6 decimal places (~10cm precision)
const roundCoord = (val: number) => Math.round(val * 1000000) / 1000000

// Check if coordinate matches an existing pole within tolerance (~10m)
const isMatchingPoleCoord = (
  pt: [number, number],
  poles: SegmentPoleItem[],
  threshold = 0.0001
): boolean => {
  if (!poles || poles.length === 0 || !isValidCoord(pt)) return false
  return poles.some((p) => {
    if (!isValidCoord(p.coord)) return false
    return Math.hypot(p.coord[0] - pt[0], p.coord[1] - pt[1]) < threshold
  })
}

export const SegmentRouteMap: React.FC<SegmentRouteMapProps> = ({
  coordinates = [],
  originalRouteCoords,
  startCoord,
  endCoord,
  originalStartCoord,
  originalEndCoord,
  height = '240px',
  editable = false,
  defaultEditMode,
  hideTerminalPins = false,
  onStartCoordChange,
  onEndCoordChange,
  onRouteCoordsChange,
  poles = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const endMarkerRef = useRef<maplibregl.Marker | null>(null)
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([])
  const isDraggingRef = useRef<boolean>(false)
  const currentCoordsRef = useRef<[number, number][]>([...coordinates])

  // Persistent reference to original DB route to protect from accidental deletion
  const initialDbRouteRef = useRef<[number, number][]>([])
  const initialDbStartRef = useRef<[number, number] | null>(null)
  const initialDbEndRef = useRef<[number, number] | null>(null)

  // Undo history stack
  const [history, setHistory] = useState<HistorySnapshot[]>([])
  const dragStartSnapshotRef = useRef<HistorySnapshot | null>(null)

  // Persistent callback refs to prevent map re-initialization
  const onStartCoordChangeRef = useRef(onStartCoordChange)
  onStartCoordChangeRef.current = onStartCoordChange

  const onEndCoordChangeRef = useRef(onEndCoordChange)
  onEndCoordChangeRef.current = onEndCoordChange

  const onRouteCoordsChangeRef = useRef(onRouteCoordsChange)
  onRouteCoordsChangeRef.current = onRouteCoordsChange

  const [editMode, setEditMode] = useState<SegmentEditMode>(
    defaultEditMode || (coordinates.length === 0 ? 'append' : 'view')
  )
  const editModeRef = useRef<SegmentEditMode>(editMode)
  editModeRef.current = editMode

  const polesRef = useRef<SegmentPoleItem[]>(poles)
  polesRef.current = poles

  // Calculate route bounding box
  const getBounds = (coords?: [number, number][]): maplibregl.LngLatBoundsLike | null => {
    const pts: [number, number][] = []
    if (coords && coords.length > 0) {
      coords.forEach((pt) => {
        if (isValidCoord(pt)) pts.push(pt)
      })
    } else {
      const target = currentCoordsRef.current
      if (target && target.length > 0) {
        target.forEach((pt) => {
          if (isValidCoord(pt)) pts.push(pt)
        })
      }
      if (isValidCoord(startCoord)) pts.push(startCoord)
      if (isValidCoord(endCoord)) pts.push(endCoord)
    }

    if (poles && poles.length > 0) {
      poles.forEach((p) => {
        if (isValidCoord(p.coord)) pts.push(p.coord)
      })
    }

    if (pts.length === 0) return null

    let minLng = pts[0][0]
    let maxLng = pts[0][0]
    let minLat = pts[0][1]
    let maxLat = pts[0][1]

    pts.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    })

    if (minLng === maxLng) {
      minLng -= 0.0015
      maxLng += 0.0015
    }
    if (minLat === maxLat) {
      minLat -= 0.0015
      maxLat += 0.0015
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }

  // Create minimal Sleek Draggable Vertex Handle
  const createVertexMarkerElement = useCallback(
    (isStart: boolean, isEnd: boolean, isSingle: boolean, isPole: boolean) => {
      const el = document.createElement('div')
      el.className = 'segment-vertex-handle'
      el.style.width = '22px'
      el.style.height = '22px'
      el.style.cursor = isPole ? 'not-allowed' : editable ? 'grab' : 'default'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.userSelect = 'none'
      el.style.pointerEvents = 'auto'
      el.style.zIndex = isPole ? '20' : '30'
      el.title = isPole
        ? 'Vị trí cột đèn cố định (không dời)'
        : editable
        ? 'Kéo để điều chỉnh vị trí mốc lộ trình'
        : ''

      // Nếu là cột đèn: vàng LED đặc trưng #fde047, viền đen #0f172a
      // Nếu là mốc tự do: viền xanh #0284c7, tâm trắng #ffffff
      const ringColor = isPole
        ? '#0f172a'
        : isSingle
        ? '#10b981'
        : isStart
        ? '#10b981'
        : isEnd
        ? '#f43f5e'
        : '#0284c7'

      const coreColor = isPole
        ? '#fde047'
        : isSingle
        ? '#10b981'
        : isStart
        ? '#10b981'
        : isEnd
        ? '#f43f5e'
        : '#ffffff'

      const shadow = isPole
        ? '0 1px 6px rgba(0,0,0,0.65)'
        : '0 2px 8px rgba(2, 132, 199, 0.7)'

      el.innerHTML = `
        <div class="vertex-dot" style="
          pointer-events: none;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: ${coreColor};
          border: 2.5px solid ${ringColor};
          box-shadow: ${shadow};
          transition: transform 0.12s ease;
        "></div>
      `

      if (editable && !isPole) {
        el.onmouseenter = () => {
          const dot = el.querySelector('.vertex-dot') as HTMLElement | null
          if (dot) dot.style.transform = 'scale(1.35)'
        }
        el.onmouseleave = () => {
          const dot = el.querySelector('.vertex-dot') as HTMLElement | null
          if (dot && !isDraggingRef.current) dot.style.transform = 'scale(1)'
        }
      }

      // Stop propagation on click to prevent triggering map click handlers (adding a new vertex)
      // Note: Do NOT stop pointerdown/mousedown propagation here as MapLibre Marker requires it for dragging
      el.addEventListener('click', (e) => e.stopPropagation())

      return el
    },
    [editable]
  )

  // Synchronize draggable vertex markers
  const syncVertexMarkers = useCallback(
    (coords: [number, number][]) => {
      const map = mapRef.current
      if (!map) return

      const valid = coords.filter(isValidCoord)

      // Dọn dẹp triệt để các marker cũ để đảm bảo listener được gán chính xác theo trạng thái isPole
      vertexMarkersRef.current.forEach((m) => m.remove())
      vertexMarkersRef.current = []

      valid.forEach((pt, idx) => {
        const isStart = idx === 0
        const isEnd = idx === valid.length - 1
        const isSingle = valid.length === 1
        const isPole = isMatchingPoleCoord(pt, polesRef.current || [])
        const canDrag = Boolean(editable && !isPole)

        const el = createVertexMarkerElement(isStart, isEnd, isSingle, isPole)
        const marker = new maplibregl.Marker({
          element: el,
          draggable: canDrag,
          anchor: 'center',
        })
          .setLngLat(pt)
          .addTo(map)

        ;(marker as any)._vertexIndex = idx

        if (canDrag) {
          marker.on('dragstart', () => {
            map.dragPan.disable()
            isDraggingRef.current = true
            el.style.cursor = 'grabbing'
            const curStart = currentCoordsRef.current[0]
            const curEnd = currentCoordsRef.current[currentCoordsRef.current.length - 1]
            dragStartSnapshotRef.current = {
              coords: [...currentCoordsRef.current],
              start: curStart,
              end: curEnd,
            }
          })

          marker.on('drag', () => {
            const currentIdx = (marker as any)._vertexIndex
            if (typeof currentIdx !== 'number') return
            const pos = marker.getLngLat()
            const movedPt: [number, number] = [roundCoord(pos.lng), roundCoord(pos.lat)]
            const current = [...currentCoordsRef.current]
            current[currentIdx] = movedPt
            currentCoordsRef.current = current

            if (currentIdx === 0 && startMarkerRef.current) {
              startMarkerRef.current.setLngLat(movedPt)
            }
            if (currentIdx === current.length - 1 && endMarkerRef.current) {
              endMarkerRef.current.setLngLat(movedPt)
            }

            // Fast line update during drag
            const lineSrc = map.getSource('route-line') as maplibregl.GeoJSONSource | undefined
            if (lineSrc) {
              lineSrc.setData({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: current.length >= 2 ? current : current.length === 1 ? [current[0], current[0]] : [],
                },
                properties: {},
              })
            }
          })

          marker.on('dragend', () => {
            map.dragPan.enable()
            el.style.cursor = 'grab'
            const currentIdx = (marker as any)._vertexIndex
            if (typeof currentIdx !== 'number') return
            const pos = marker.getLngLat()
            const movedPt: [number, number] = [roundCoord(pos.lng), roundCoord(pos.lat)]
            const current = [...currentCoordsRef.current]
            current[currentIdx] = movedPt
            currentCoordsRef.current = current

            if (currentIdx === 0 && startMarkerRef.current) {
              startMarkerRef.current.setLngLat(movedPt)
            }
            if (currentIdx === current.length - 1 && endMarkerRef.current) {
              endMarkerRef.current.setLngLat(movedPt)
            }

            if (dragStartSnapshotRef.current) {
              const snap = dragStartSnapshotRef.current
              setHistory((prev) => [...prev, snap])
              dragStartSnapshotRef.current = null
            }

            if (currentIdx === 0) {
              onStartCoordChangeRef.current?.(movedPt)
            }
            if (currentIdx === current.length - 1) {
              onEndCoordChangeRef.current?.(movedPt)
            }
            onRouteCoordsChangeRef.current?.(current)

            setTimeout(() => {
              isDraggingRef.current = false
            }, 120)
          })
        }

        vertexMarkersRef.current.push(marker)
      })
    },
    [editable, createVertexMarkerElement]
  )

  // Update line and vertices sources in MapLibre silently without re-renders
  const updateRouteLineSource = useCallback(
    (newCoords: [number, number][], syncMarkers = true) => {
      currentCoordsRef.current = newCoords
      const map = mapRef.current
      if (!map) return

      const valid = newCoords.filter(isValidCoord)

      const lineSrc = map.getSource('route-line') as maplibregl.GeoJSONSource | undefined
      if (lineSrc) {
        lineSrc.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: valid.length >= 2 ? valid : valid.length === 1 ? [valid[0], valid[0]] : [],
          },
          properties: {},
        })
      }

      // Clear static circle layer as all vertices are interactive draggable DOM Markers
      const vertSrc = map.getSource('route-vertices') as maplibregl.GeoJSONSource | undefined
      if (vertSrc) {
        vertSrc.setData({
          type: 'FeatureCollection',
          features: [],
        })
      }

      if (syncMarkers) {
        syncVertexMarkers(newCoords)
      }
    },
    [syncVertexMarkers]
  )

  // Create Start or End Pin element (minimal sleek badge with needle anchor)
  const createTerminalPinElement = useCallback(
    (isStart: boolean, label: string) => {
      const el = document.createElement('div')
      el.className = 'segment-terminal-pin'
      el.style.display = 'flex'
      el.style.flexDirection = 'column'
      el.style.alignItems = 'center'
      el.style.pointerEvents = 'auto'
      el.style.zIndex = '40'
      el.style.cursor = editable ? 'move' : 'default'
      el.style.userSelect = 'none'

      const themeColor = isStart ? '#10b981' : '#f43f5e'

      el.innerHTML = `
        <div class="pin-badge" style="
          position: relative;
          display: flex;
          align-items: center;
          gap: 3.5px;
          padding: 2px 6px;
          background: ${themeColor};
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          font-family: inherit;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.4);
          transform: translateY(-2px);
          transition: transform 0.15s ease;
          letter-spacing: 0.2px;
          white-space: nowrap;
        ">
          <span style="display: inline-block; width: 4.5px; height: 4.5px; border-radius: 50%; background: #ffffff;"></span>
          <span>${label}</span>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 3.5px solid transparent;
          border-right: 3.5px solid transparent;
          border-top: 5px solid ${themeColor};
          margin-top: -2px;
        "></div>
      `

      if (editable) {
        const badge = el.querySelector('.pin-badge') as HTMLElement | null
        el.onmouseenter = () => {
          if (badge) {
            badge.style.transform = 'translateY(-3px) scale(1.05)'
          }
        }
        el.onmouseleave = () => {
          if (badge && !isDraggingRef.current) {
            badge.style.transform = 'translateY(-2px) scale(1)'
          }
        }
      }

      return el
    },
    [editable]
  )

  // Ensure Start Marker exists on map
  const ensureStartMarker = useCallback(
    (coord: [number, number]) => {
      if (hideTerminalPins) return
      const map = mapRef.current
      if (!map || !isValidCoord(coord)) return

      if (startMarkerRef.current) {
        startMarkerRef.current.setLngLat(coord)
      } else {
        const startEl = createTerminalPinElement(true, 'ĐẦU TUYẾN')
        const marker = new maplibregl.Marker({
          element: startEl,
          anchor: 'bottom',
          draggable: editable,
        })
          .setLngLat(coord)
          .addTo(map)

        if (editable) {
          let dragStartBaseCoords: [number, number][] = []

          marker.on('dragstart', () => {
            isDraggingRef.current = true
            startEl.style.cursor = 'move'
            const curStart = marker.getLngLat()
            const curEnd = endMarkerRef.current?.getLngLat()
            dragStartSnapshotRef.current = {
              coords: [...currentCoordsRef.current],
              start: [roundCoord(curStart.lng), roundCoord(curStart.lat)],
              end: curEnd ? [roundCoord(curEnd.lng), roundCoord(curEnd.lat)] : undefined,
            }
            dragStartBaseCoords = [...currentCoordsRef.current]
          })

          const computeStartUpdate = (posLng: number, posLat: number) => {
            const rawPt: [number, number] = [roundCoord(posLng), roundCoord(posLat)]
            const baseCoords = dragStartBaseCoords.length > 0 ? dragStartBaseCoords : currentCoordsRef.current
            const activePoles = (polesRef.current || []).filter((p) => isValidCoord(p.coord))

            if (baseCoords.length === 0) return { pt: rawPt, updated: [rawPt] }
            if (activePoles.length === 0) {
              const updated: [number, number][] = [rawPt, ...baseCoords.slice(1)]
              return { pt: rawPt, updated }
            }

            const firstPoleIdx = baseCoords.findIndex((c) => isMatchingPoleCoord(c, activePoles))

            if (firstPoleIdx === -1) {
              const updated: [number, number][] = [rawPt, ...baseCoords.slice(1)]
              return { pt: rawPt, updated }
            }

            const poleCoord = baseCoords[firstPoleIdx]
            const distToPole = calculateDistanceMeters(rawPt, poleCoord)

            if (firstPoleIdx === 0) {
              // Tuyến đang bắt đầu ngay tại cột điện
              if (distToPole > 3) {
                // Nối dài: mốc mới đứng trước cột điện (giữ nguyên cột điện ở index 1)
                const updated: [number, number][] = [rawPt, ...baseCoords]
                return { pt: rawPt, updated }
              } else {
                // Kéo sát lại gần cột (< 3m): snap về cột, giữ nguyên baseCoords
                const snappedPt: [number, number] = [roundCoord(poleCoord[0]), roundCoord(poleCoord[1])]
                return { pt: snappedPt, updated: [...baseCoords] }
              }
            } else {
              // Tuyến đã có điểm nối dài trước cột (firstPoleIdx > 0)
              if (distToPole < 8) {
                // Kéo sát lại gần cột (< 8m): thu gọn lại về đúng cột điện
                const snappedPt: [number, number] = [roundCoord(poleCoord[0]), roundCoord(poleCoord[1])]
                const updated: [number, number][] = baseCoords.slice(firstPoleIdx)
                return { pt: snappedPt, updated }
              } else {
                // Kéo điều chỉnh ra ngoài: cập nhật điểm đầu
                const updated: [number, number][] = [rawPt, ...baseCoords.slice(1)]
                return { pt: rawPt, updated }
              }
            }
          }

          marker.on('drag', () => {
            const pos = marker.getLngLat()
            const { pt, updated } = computeStartUpdate(pos.lng, pos.lat)
            marker.setLngLat(pt)
            updateRouteLineSource(updated, false)
          })

          marker.on('dragend', () => {
            isDraggingRef.current = false
            startEl.style.cursor = 'move'
            const pos = marker.getLngLat()
            const { pt, updated } = computeStartUpdate(pos.lng, pos.lat)
            marker.setLngLat(pt)
            updateRouteLineSource(updated)

            if (dragStartSnapshotRef.current) {
              const snap = dragStartSnapshotRef.current
              setHistory((prev) => [...prev, snap])
              dragStartSnapshotRef.current = null
            }

            onStartCoordChangeRef.current?.(pt)
            onRouteCoordsChangeRef.current?.(updated)
          })
        }
        startMarkerRef.current = marker
      }
    },
    [hideTerminalPins, editable, createTerminalPinElement, updateRouteLineSource]
  )

  // Ensure End Marker exists on map
  const ensureEndMarker = useCallback(
    (coord: [number, number]) => {
      if (hideTerminalPins) return
      const map = mapRef.current
      if (!map || !isValidCoord(coord)) return

      if (endMarkerRef.current) {
        endMarkerRef.current.setLngLat(coord)
      } else {
        const endEl = createTerminalPinElement(false, 'CUỐI TUYẾN')
        const marker = new maplibregl.Marker({
          element: endEl,
          anchor: 'bottom',
          draggable: editable,
        })
          .setLngLat(coord)
          .addTo(map)

        if (editable) {
          let dragStartBaseCoords: [number, number][] = []

          marker.on('dragstart', () => {
            isDraggingRef.current = true
            endEl.style.cursor = 'move'
            const curEnd = marker.getLngLat()
            const curStart = startMarkerRef.current?.getLngLat()
            dragStartSnapshotRef.current = {
              coords: [...currentCoordsRef.current],
              start: curStart ? [roundCoord(curStart.lng), roundCoord(curStart.lat)] : undefined,
              end: [roundCoord(curEnd.lng), roundCoord(curEnd.lat)],
            }
            dragStartBaseCoords = [...currentCoordsRef.current]
          })

          const computeEndUpdate = (posLng: number, posLat: number) => {
            const rawPt: [number, number] = [roundCoord(posLng), roundCoord(posLat)]
            const baseCoords = dragStartBaseCoords.length > 0 ? dragStartBaseCoords : currentCoordsRef.current
            const activePoles = (polesRef.current || []).filter((p) => isValidCoord(p.coord))

            if (baseCoords.length === 0) return { pt: rawPt, updated: [rawPt] }
            if (activePoles.length === 0) {
              const updated: [number, number][] = [...baseCoords.slice(0, -1), rawPt]
              return { pt: rawPt, updated }
            }

            let lastPoleIdx = -1
            for (let i = baseCoords.length - 1; i >= 0; i--) {
              if (isMatchingPoleCoord(baseCoords[i], activePoles)) {
                lastPoleIdx = i
                break
              }
            }

            if (lastPoleIdx === -1) {
              const updated: [number, number][] = [...baseCoords.slice(0, -1), rawPt]
              return { pt: rawPt, updated }
            }

            const poleCoord = baseCoords[lastPoleIdx]
            const distToPole = calculateDistanceMeters(rawPt, poleCoord)

            if (lastPoleIdx === baseCoords.length - 1) {
              // Tuyến đang kết thúc ngay tại cột điện
              if (distToPole > 3) {
                // Nối dài: tuyến xanh tiếp tục chạy từ cột điện ra điểm mới
                const updated: [number, number][] = [...baseCoords, rawPt]
                return { pt: rawPt, updated }
              } else {
                // Kéo sát lại gần cột (< 3m): snap về cột, giữ nguyên baseCoords
                const snappedPt: [number, number] = [roundCoord(poleCoord[0]), roundCoord(poleCoord[1])]
                return { pt: snappedPt, updated: [...baseCoords] }
              }
            } else {
              // Tuyến đã có điểm nối dài sau cột (lastPoleIdx < baseCoords.length - 1)
              if (distToPole < 8) {
                // Kéo sát lại gần cột (< 8m): thu gọn lại về đúng cột điện cuối
                const snappedPt: [number, number] = [roundCoord(poleCoord[0]), roundCoord(poleCoord[1])]
                const updated: [number, number][] = baseCoords.slice(0, lastPoleIdx + 1)
                return { pt: snappedPt, updated }
              } else {
                // Kéo điều chỉnh ra ngoài: cập nhật điểm cuối
                const updated: [number, number][] = [...baseCoords.slice(0, -1), rawPt]
                return { pt: rawPt, updated }
              }
            }
          }

          marker.on('drag', () => {
            const pos = marker.getLngLat()
            const { pt, updated } = computeEndUpdate(pos.lng, pos.lat)
            marker.setLngLat(pt)
            updateRouteLineSource(updated, false)
          })

          marker.on('dragend', () => {
            isDraggingRef.current = false
            endEl.style.cursor = 'move'
            const pos = marker.getLngLat()
            const { pt, updated } = computeEndUpdate(pos.lng, pos.lat)
            marker.setLngLat(pt)
            updateRouteLineSource(updated)

            if (dragStartSnapshotRef.current) {
              const snap = dragStartSnapshotRef.current
              setHistory((prev) => [...prev, snap])
              dragStartSnapshotRef.current = null
            }

            onEndCoordChangeRef.current?.(pt)
            onRouteCoordsChangeRef.current?.(updated)
          })
        }
        endMarkerRef.current = marker
      }
    },
    [hideTerminalPins, editable, createTerminalPinElement, updateRouteLineSource]
  )

  // INITIALIZE MAP ONCE
  useEffect(() => {
    if (!containerRef.current) return

    const validPoles = (poles || []).filter((p) => isValidCoord(p.coord))
    const validRawCoords = (coordinates || []).filter(isValidCoord)

    const hasStartCoord = isValidCoord(startCoord)
    const hasEndCoord = isValidCoord(endCoord)

    let initialCoords: [number, number][] = []
    if (validRawCoords.length > 0) {
      initialCoords = [...validRawCoords]
    } else if (validPoles.length > 0) {
      const s = hasStartCoord ? startCoord! : validPoles[0].coord
      const e = hasEndCoord ? endCoord! : validPoles[validPoles.length - 1].coord
      const sortedPoles = [...validPoles].sort((a, b) => {
        return calculateDistanceMeters(s, a.coord) - calculateDistanceMeters(s, b.coord)
      })
      initialCoords = [s, ...sortedPoles.map((p) => p.coord), e]
    } else if (hasStartCoord && hasEndCoord) {
      initialCoords = [startCoord!, endCoord!]
    }

    // Deduplicate consecutive identical points
    const dedupedCoords: [number, number][] = []
    initialCoords.forEach((pt) => {
      if (dedupedCoords.length === 0) {
        dedupedCoords.push(pt)
      } else {
        const prev = dedupedCoords[dedupedCoords.length - 1]
        if (Math.abs(prev[0] - pt[0]) > 0.000001 || Math.abs(prev[1] - pt[1]) > 0.000001) {
          dedupedCoords.push(pt)
        }
      }
    })

    currentCoordsRef.current = dedupedCoords

    // Store DB original state for Reset and Safe Undo boundary
    initialDbRouteRef.current = [...dedupedCoords]
    initialDbStartRef.current = hasStartCoord ? startCoord! : dedupedCoords.length > 0 ? dedupedCoords[0] : null
    initialDbEndRef.current = hasEndCoord ? endCoord! : dedupedCoords.length > 1 ? dedupedCoords[dedupedCoords.length - 1] : null

    const center: [number, number] =
      dedupedCoords.length > 0
        ? dedupedCoords[0]
        : hasStartCoord
        ? startCoord!
        : validPoles.length > 0
        ? validPoles[0].coord
        : DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center,
      zoom: 15,
      minZoom: 6,
      maxZoom: 20,
      attributionControl: false,
    })
    mapRef.current = map

    map.on('load', () => {
      // 1. Add Road Route Line Source & Layers
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: dedupedCoords.length >= 2 ? dedupedCoords : [],
          },
          properties: {},
        },
      })

      // Road Surface Glow Layer
      map.addLayer({
        id: 'route-line-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0284c7',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 16, 9],
          'line-opacity': 0.45,
          'line-blur': 2,
        },
      })

      // Road Surface Sharp Core Layer
      map.addLayer({
        id: 'route-line-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.8, 16, 4.5],
          'line-opacity': 0.95,
        },
      })

      // 2. Add Route Vertices Dots Layer (empty as all vertices are managed as interactive DOM markers)
      map.addSource('route-vertices', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })

      map.addLayer({
        id: 'route-vertices-circle',
        type: 'circle',
        source: 'route-vertices',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 4],
          'circle-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0284c7',
        },
      })

      // 3. Add Visual Poles Layer (Warm LED light dots)
      if (poles && poles.length > 0) {
        const poleFeatures = poles
          .filter((p) => isValidCoord(p.coord))
          .map((p) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: p.coord,
            },
            properties: {
              id: p.id,
              code: p.code || p.id,
              status: p.status || 'normal',
              atlas: p.atlas || '',
            },
          }))

        if (poleFeatures.length > 0) {
          map.addSource('segment-poles', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: poleFeatures,
            },
          })

          map.addLayer({
            id: 'segment-poles-core',
            type: 'circle',
            source: 'segment-poles',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 3],
              'circle-color': '#fde047',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#0f172a',
              'circle-opacity': 0.9,
            },
          })
        }
      }

      // 4. Render markers according to mode
      syncVertexMarkers(dedupedCoords)

      if (!hideTerminalPins) {
        if (dedupedCoords.length > 0 && isValidCoord(dedupedCoords[0])) {
          ensureStartMarker(dedupedCoords[0])
        } else if (hasStartCoord) {
          ensureStartMarker(startCoord!)
        }

        if (dedupedCoords.length > 1 && isValidCoord(dedupedCoords[dedupedCoords.length - 1])) {
          ensureEndMarker(dedupedCoords[dedupedCoords.length - 1])
        } else if (hasEndCoord) {
          ensureEndMarker(endCoord!)
        }
      }

      // Map click handler for interactive drawing / appending / prepending
      if (editable) {
        const handleLineClick = (e: maplibregl.MapMouseEvent) => {
          if (isDraggingRef.current) return
          const current = [...currentCoordsRef.current]
          if (current.length < 2) return

          const clickPt: [number, number] = [roundCoord(e.lngLat.lng), roundCoord(e.lngLat.lat)]

          // Find closest segment to insert vertex
          let bestIdx = 0
          let bestDist = Infinity
          let bestPoint: [number, number] = clickPt

          for (let i = 0; i < current.length - 1; i++) {
            const segA = current[i]
            const segB = current[i + 1]
            const proj = projectPointOnSegment(clickPt, segA, segB)
            if (proj.dist < bestDist) {
              bestDist = proj.dist
              bestIdx = i
              bestPoint = proj.point
            }
          }

          // Snapshot before editing
          const curStartPt = startMarkerRef.current
            ? ([roundCoord(startMarkerRef.current.getLngLat().lng), roundCoord(startMarkerRef.current.getLngLat().lat)] as [number, number])
            : current[0]
          const curEndPt = endMarkerRef.current
            ? ([roundCoord(endMarkerRef.current.getLngLat().lng), roundCoord(endMarkerRef.current.getLngLat().lat)] as [number, number])
            : current[current.length - 1]

          setHistory((prev) => [
            ...prev,
            {
              coords: [...current],
              start: curStartPt,
              end: curEndPt,
            },
          ])

          const updated: [number, number][] = [
            ...current.slice(0, bestIdx + 1),
            bestPoint,
            ...current.slice(bestIdx + 1),
          ]

          updateRouteLineSource(updated, true)
          onRouteCoordsChangeRef.current?.(updated)
        }

        map.on('mouseenter', 'route-line-core', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'route-line-core', () => {
          map.getCanvas().style.cursor = ''
        })
        map.on('click', 'route-line-core', handleLineClick)
        map.on('click', 'route-line-glow', handleLineClick)
        map.on('click', (e: maplibregl.MapMouseEvent) => {
          if (isDraggingRef.current) return
          const mode = editModeRef.current
          if (mode === 'view') return

          const clickPt: [number, number] = [roundCoord(e.lngLat.lng), roundCoord(e.lngLat.lat)]
          const current = [...currentCoordsRef.current]

          // Snapshot before editing
          const curStartPt = startMarkerRef.current
            ? ([roundCoord(startMarkerRef.current.getLngLat().lng), roundCoord(startMarkerRef.current.getLngLat().lat)] as [number, number])
            : current[0] || clickPt
          const curEndPt = endMarkerRef.current
            ? ([roundCoord(endMarkerRef.current.getLngLat().lng), roundCoord(endMarkerRef.current.getLngLat().lat)] as [number, number])
            : current[current.length - 1] || clickPt

          setHistory((prev) => [
            ...prev,
            {
              coords: [...current],
              start: curStartPt,
              end: curEndPt,
            },
          ])

          if (hideTerminalPins) {
            // Compact Mode: Always append or prepend directly as vertex
            let updated: [number, number][]
            if (mode === 'prepend') {
              updated = [clickPt, ...current]
            } else {
              updated = [...current, clickPt]
            }
            updateRouteLineSource(updated, true)
            if (updated.length === 1) {
              onStartCoordChangeRef.current?.(clickPt)
            } else {
              onEndCoordChangeRef.current?.(clickPt)
            }
            onRouteCoordsChangeRef.current?.(updated)
            return
          }

          // Case 1: First point ever clicked (sets Start Pin)
          if (current.length === 0) {
            const updated = [clickPt]
            ensureStartMarker(clickPt)
            updateRouteLineSource(updated)
            onStartCoordChangeRef.current?.(clickPt)
            onRouteCoordsChangeRef.current?.(updated)
            return
          }

          // Case 2: Second point clicked (sets End Pin, connects straight line)
          if (current.length === 1) {
            if (mode === 'prepend') {
              const updated = [clickPt, current[0]]
              ensureStartMarker(clickPt)
              ensureEndMarker(current[0])
              updateRouteLineSource(updated)
              onStartCoordChangeRef.current?.(clickPt)
              onEndCoordChangeRef.current?.(current[0])
              onRouteCoordsChangeRef.current?.(updated)
            } else {
              const updated = [current[0], clickPt]
              ensureEndMarker(clickPt)
              updateRouteLineSource(updated)
              onEndCoordChangeRef.current?.(clickPt)
              onRouteCoordsChangeRef.current?.(updated)
            }
            return
          }

          // Case 3: Third+ points clicked
          if (mode === 'prepend') {
            const updated = [clickPt, ...current]
            ensureStartMarker(clickPt)
            updateRouteLineSource(updated)
            onStartCoordChangeRef.current?.(clickPt)
            onRouteCoordsChangeRef.current?.(updated)
          } else {
            // append
            const updated = [...current, clickPt]
            ensureEndMarker(clickPt)
            updateRouteLineSource(updated)
            onEndCoordChangeRef.current?.(clickPt)
            onRouteCoordsChangeRef.current?.(updated)
          }
        })
      }

      // Fit bounds nicely if coords exist
      const b = getBounds()
      if (b) {
        map.fitBounds(b, { padding: 40, duration: 400, maxZoom: 17 })
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize()
        }
      }, 200)
    })

    // Resize handling for modal transition
    const resizeTimer = setTimeout(() => {
      map.resize()
      const b = getBounds()
      if (b) {
        map.fitBounds(b, { padding: 40, duration: 0, maxZoom: 17 })
      }
    }, 220)

    const resizeObserver = new ResizeObserver(() => {
      map.resize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      startMarkerRef.current?.remove()
      endMarkerRef.current?.remove()
      startMarkerRef.current = null
      endMarkerRef.current = null
      vertexMarkersRef.current.forEach((m) => m.remove())
      vertexMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [
    editable,
    hideTerminalPins,
    createTerminalPinElement,
    updateRouteLineSource,
    ensureStartMarker,
    ensureEndMarker,
    syncVertexMarkers,
  ])

  // Sync cursor when editMode changes
  useEffect(() => {
    if (!mapRef.current) return
    const canvas = mapRef.current.getCanvas()
    if (editMode === 'append' || editMode === 'prepend') {
      canvas.style.cursor = 'crosshair'
    } else {
      canvas.style.cursor = ''
    }
  }, [editMode])

  // Sync external startCoord changes
  useEffect(() => {
    if (hideTerminalPins) return
    if (isDraggingRef.current || !startCoord || !isValidCoord(startCoord)) return
    if (!mapRef.current) return

    if (startMarkerRef.current) {
      const currentPos = startMarkerRef.current.getLngLat()
      const diffLng = Math.abs(currentPos.lng - startCoord[0])
      const diffLat = Math.abs(currentPos.lat - startCoord[1])
      if (diffLng > 0.00001 || diffLat > 0.00001) {
        startMarkerRef.current.setLngLat(startCoord)
      }
    } else {
      ensureStartMarker(startCoord)
    }
  }, [startCoord, hideTerminalPins, ensureStartMarker])

  // Sync external endCoord changes
  useEffect(() => {
    if (hideTerminalPins) return
    if (isDraggingRef.current || !endCoord || !isValidCoord(endCoord)) return
    if (!mapRef.current) return

    if (endMarkerRef.current) {
      const currentPos = endMarkerRef.current.getLngLat()
      const diffLng = Math.abs(currentPos.lng - endCoord[0])
      const diffLat = Math.abs(currentPos.lat - endCoord[1])
      if (diffLng > 0.00001 || diffLat > 0.00001) {
        endMarkerRef.current.setLngLat(endCoord)
      }
    } else {
      ensureEndMarker(endCoord)
    }
  }, [endCoord, hideTerminalPins, ensureEndMarker])

  // Sync external coordinates changes
  useEffect(() => {
    if (isDraggingRef.current) return
    if (!coordinates) return
    if (coordinates === currentCoordsRef.current) return

    updateRouteLineSource(coordinates, true)
    if (!hideTerminalPins) {
      if (coordinates.length > 0 && isValidCoord(coordinates[0])) {
        ensureStartMarker(coordinates[0])
      }
      if (coordinates.length > 1 && isValidCoord(coordinates[coordinates.length - 1])) {
        ensureEndMarker(coordinates[coordinates.length - 1])
      }
    }
  }, [coordinates, hideTerminalPins, updateRouteLineSource, ensureStartMarker, ensureEndMarker])

  // Controls Handlers
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 250 })
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 250 })
  const handleFitBounds = () => {
    const bounds = getBounds()
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 400, maxZoom: 17 })
    }
  }

  // Safe Undo Handler - Only undo user-added modifications in this session, never eating into DB original points
  const handleUndo = () => {
    if (history.length === 0) return

    const previousSnapshot = history[history.length - 1]
    setHistory((prev) => prev.slice(0, -1))

    updateRouteLineSource(previousSnapshot.coords, true)

    if (hideTerminalPins) {
      onRouteCoordsChangeRef.current?.(previousSnapshot.coords)
      return
    }

    if (previousSnapshot.coords.length === 0) {
      startMarkerRef.current?.remove()
      startMarkerRef.current = null
      endMarkerRef.current?.remove()
      endMarkerRef.current = null
      onRouteCoordsChangeRef.current?.([])
      return
    }

    if (previousSnapshot.coords.length === 1) {
      ensureStartMarker(previousSnapshot.coords[0])
      endMarkerRef.current?.remove()
      endMarkerRef.current = null
      onStartCoordChangeRef.current?.(previousSnapshot.coords[0])
      onRouteCoordsChangeRef.current?.(previousSnapshot.coords)
      return
    }

    if (previousSnapshot.start && isValidCoord(previousSnapshot.start)) {
      ensureStartMarker(previousSnapshot.start)
      onStartCoordChangeRef.current?.(previousSnapshot.start)
    }
    if (previousSnapshot.end && isValidCoord(previousSnapshot.end)) {
      ensureEndMarker(previousSnapshot.end)
      onEndCoordChangeRef.current?.(previousSnapshot.end)
    }

    onRouteCoordsChangeRef.current?.(previousSnapshot.coords)
  }

  // Reset to original DB baseline or clear completely for new segments
  const handleReset = () => {
    // If it's a new segment without pre-existing DB route
    if (initialDbRouteRef.current.length === 0) {
      startMarkerRef.current?.remove()
      startMarkerRef.current = null
      endMarkerRef.current?.remove()
      endMarkerRef.current = null
      vertexMarkersRef.current.forEach((m) => m.remove())
      vertexMarkersRef.current = []
      updateRouteLineSource([], false)
      setHistory([])
      onRouteCoordsChangeRef.current?.([])
      setEditMode(defaultEditMode || 'append')
      return
    }

    const targetRoute =
      initialDbRouteRef.current.length > 0
        ? initialDbRouteRef.current
        : originalRouteCoords && originalRouteCoords.length > 0
        ? originalRouteCoords
        : originalStartCoord && originalEndCoord
        ? [originalStartCoord, originalEndCoord]
        : []

    const targetStart =
      initialDbStartRef.current || (originalStartCoord && isValidCoord(originalStartCoord) ? originalStartCoord : targetRoute[0])
    const targetEnd =
      initialDbEndRef.current || (originalEndCoord && isValidCoord(originalEndCoord) ? originalEndCoord : targetRoute[targetRoute.length - 1])

    if (!hideTerminalPins) {
      if (targetStart && isValidCoord(targetStart)) {
        ensureStartMarker(targetStart)
        onStartCoordChangeRef.current?.(targetStart)
      }
      if (targetEnd && isValidCoord(targetEnd)) {
        ensureEndMarker(targetEnd)
        onEndCoordChangeRef.current?.(targetEnd)
      }
    }

    updateRouteLineSource(targetRoute, true)
    onRouteCoordsChangeRef.current?.(targetRoute)
    setHistory([])
    setEditMode('view')

    const bounds = getBounds(targetRoute)
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 400, maxZoom: 17 })
    }
  }

  const isAddMode = hideTerminalPins || initialDbRouteRef.current.length === 0

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner group">
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className="w-full h-full min-h-[480px] bg-slate-900"
      />

      {/* Segment Geometry Editing Toolbar (Top Left) */}
      {editable && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-lg">
          {/* Mode: Move / View (Kéo mốc) */}
          <button
            type="button"
            onClick={() => setEditMode('view')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
              editMode === 'view'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Chế độ kéo mốc điểm đầu và điểm cuối hoặc các đỉnh"
          >
            <MousePointer className="w-3 h-3" />
            <span>Kéo mốc</span>
          </button>

          {isAddMode ? (
            /* Chế độ Thêm Mới: Ẩn Nối đầu, chỉ hiển thị Vẽ tuyến */
            <button
              type="button"
              onClick={() => setEditMode(editMode === 'append' ? 'view' : 'append')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                editMode === 'append'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Click trên bản đồ để vẽ nối tiếp các điểm lộ trình"
            >
              <PlusCircle className="w-3 h-3" />
              <span>{editMode === 'append' ? 'Đang vẽ tuyến...' : 'Vẽ tuyến'}</span>
            </button>
          ) : (
            /* Chế độ Sửa Tuyến: Giữ nguyên Nối đầu & Nối cuối */
            <>
              {/* Mode: Prepend Points (🟢 Nối Đầu) */}
              <button
                type="button"
                onClick={() => setEditMode(editMode === 'prepend' ? 'view' : 'prepend')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  editMode === 'prepend'
                    ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                    : 'text-emerald-400 hover:bg-slate-800'
                }`}
                title="Click vào bản đồ để nối thêm mốc vào ĐẦU TUYẾN"
              >
                <PlusCircle className="w-3 h-3" />
                <span>{editMode === 'prepend' ? 'Đang nối đầu...' : 'Nối đầu'}</span>
              </button>

              {/* Mode: Append Points (🔴 Nối Cuối) */}
              <button
                type="button"
                onClick={() => setEditMode(editMode === 'append' ? 'view' : 'append')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  editMode === 'append'
                    ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                    : 'text-rose-400 hover:bg-slate-800'
                }`}
                title="Click vào bản đồ để nối thêm mốc vào CUỐI TUYẾN"
              >
                <PlusCircle className="w-3 h-3" />
                <span>{editMode === 'append' ? 'Đang vẽ/nối...' : 'Vẽ/Nối cuối'}</span>
              </button>
            </>
          )}

          {/* Safe Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 text-slate-300 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
            title="Hoàn tác điểm vừa thêm hoặc kéo chỉnh sửa trong phiên (an toàn, không xóa lẹm vào DB gốc)"
          >
            <Undo2 className="w-3 h-3" />
            <span>Hoàn tác{history.length > 0 ? ` (${history.length})` : ''}</span>
          </button>

          {/* Reset / Clear Button */}
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
            title={isAddMode ? 'Xóa toàn bộ các điểm vừa vẽ để chấm lại từ đầu' : 'Khôi phục lại đúng lộ trình gốc ban đầu từ DB'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isAddMode ? 'Xóa vẽ lại' : 'Gốc'}</span>
          </button>
        </div>
      )}

      {/* Floating Zoom & Fit Bounds Controls (Top Right) */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to"
          className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ"
          className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
          title="Bao quát toàn tuyến"
          className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default SegmentRouteMap
