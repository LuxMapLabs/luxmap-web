import type { FeederListItem } from '../../types/assets/feeders'
import type { ElectricalMonitorTarget, MonitorFeeder } from '../../pages/gis-map/components/ElectricalMonitorDock'
import { findByIdOrRef } from '../assets/findByIdOrRef'

const toMonitorFeeder = (f: FeederListItem): MonitorFeeder => ({
  feeder_id: f.feeder_id || '',
  label: f.external_ref || f.feeder_name || f.feeder_id || '',
  node_id: f.control?.node_id || null,
})

/**
 * Bảng giám sát điện mở theo MỘT mạch nhưng hiện mọi mạch cùng tủ thành tab (một tủ nhiều IoT, một IoT một mạch).
 * `fallbackNodeId`: node đã biết từ chỗ mở (vd. điều khiển của cột) khi danh sách mạch chưa có mạch này.
 */
export function buildMonitorTarget(
  feederId: string,
  feeders: readonly FeederListItem[],
  fallbackNodeId?: string | null
): ElectricalMonitorTarget {
  const feeder = findByIdOrRef(feeders, (f) => f.feeder_id, feederId)
  if (!feeder?.feeder_id) {
    return { title: `Mạch ${feederId}`, feeders: [{ feeder_id: feederId, label: feederId, node_id: fallbackNodeId ?? null }], activeFeederId: feederId }
  }
  const cabinetId = feeder.cabinet?.cabinet_id
  const siblings = cabinetId ? feeders.filter((f) => f.feeder_id && f.cabinet?.cabinet_id === cabinetId) : [feeder]
  const items = siblings.map(toMonitorFeeder)
  if (fallbackNodeId) {
    const own = items.find((i) => i.feeder_id === feeder.feeder_id)
    if (own && !own.node_id) own.node_id = fallbackNodeId
  }
  return {
    title: feeder.cabinet?.cabinet_name || cabinetId || `Mạch ${items[0].label}`,
    feeders: items,
    activeFeederId: feeder.feeder_id,
  }
}
