import { useEffect, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import iotAPI from '../../feature/iot/iotAPI'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotNodeStatus } from '../../types/iot/nodes'
import {
  IOT_GATEWAY_STATUS,
  IOT_NODE_STATUS,
  IOT_TONE_COLOR,
  iotStatusBadge,
  type IotStatusBadge,
} from '../../constants/iot'

/** Trạng thái gateway/node đổi theo heartbeat và mẫu điện; backend chưa có realtime nên đọc lại định kỳ. */
const REFRESH_MS = 30_000
const PAGE_SIZE = 200

async function fetchAllNodes(): Promise<IotNodeStatus[]> {
  const nodes: IotNodeStatus[] = []
  for (let page = 1; ; page++) {
    const result = await iotAPI.getNodes({ page, page_size: PAGE_SIZE })
    nodes.push(...(result.items || []))
    if (!result.items?.length || nodes.length >= (result.total || 0)) return nodes
  }
}

/** Chấm trạng thái không chữ: dùng cho node gắn ở tủ điện để không che bản đồ; tên node xem khi rê chuột. */
function dotElement(badge: IotStatusBadge, title: string): HTMLDivElement {
  const el = document.createElement('div')
  el.title = title
  el.style.cssText =
    `width:12px;height:12px;border-radius:9999px;background:${IOT_TONE_COLOR[badge.tone]};` +
    'border:2px solid #fff;box-shadow:0 1px 3px rgba(15,23,42,.35);cursor:default'
  return el
}

function markerElement(text: string, badge: IotStatusBadge, title: string): HTMLDivElement {
  const el = document.createElement('div')
  el.title = title
  el.style.cssText =
    'display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:9999px;background:#fff;' +
    'border:1px solid #cbd5e1;box-shadow:0 1px 3px rgba(15,23,42,.25);font:700 10px/1.2 ui-sans-serif,system-ui;' +
    'color:#1e293b;white-space:nowrap;cursor:default'
  const dot = document.createElement('span')
  dot.style.cssText = `width:8px;height:8px;border-radius:9999px;background:${IOT_TONE_COLOR[badge.tone]}`
  const label = document.createElement('span')
  label.textContent = text
  el.append(dot, label)
  return el
}

/**
 * Marker IoT bridge trên bản đồ GIS: gateway theo `location` của server (null = chưa có toạ độ, không vẽ),
 * node theo toạ độ tủ điện — một chấm trạng thái ở góc trên phải marker tủ, không kèm chữ.
 */
export function useIotBridgeMarkers(map: maplibregl.Map | null, isMapLoaded: boolean) {
  const [servers, setServers] = useState<IotServerStatus[]>([])
  const [nodes, setNodes] = useState<IotNodeStatus[]>([])

  useEffect(() => {
    if (!isMapLoaded) return
    let cancelled = false
    const load = async () => {
      // Hai nguồn độc lập: một bên lỗi (ví dụ 503 khi bridge chưa cấu hình) không làm mất bên kia.
      const [serverResult, nodeResult] = await Promise.allSettled([iotAPI.getServers(), fetchAllNodes()])
      if (cancelled) return
      if (serverResult.status === 'fulfilled') setServers(serverResult.value)
      if (nodeResult.status === 'fulfilled') setNodes(nodeResult.value)
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isMapLoaded])

  useEffect(() => {
    if (!map || !isMapLoaded) return
    const markers: maplibregl.Marker[] = []

    servers.forEach((server) => {
      if (!server.location) return
      const badge = iotStatusBadge(IOT_GATEWAY_STATUS, server.status)
      const el = markerElement(`GW ${server.server_id}`, badge, `Gateway ${server.server_id}: ${badge.label}`)
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([server.location.lng, server.location.lat]).addTo(map))
    })

    nodes.forEach((node) => {
      if (!node.location) return
      const badge = iotStatusBadge(IOT_NODE_STATUS, node.status)
      const el = dotElement(badge, `${node.node_id} (tủ ${node.cabinet_id}): ${badge.label}`)
      markers.push(
        new maplibregl.Marker({ element: el, anchor: 'center', offset: [12, -12] })
          .setLngLat([node.location.lng, node.location.lat])
          .addTo(map)
      )
    })

    return () => markers.forEach((marker) => marker.remove())
  }, [map, isMapLoaded, servers, nodes])
}
