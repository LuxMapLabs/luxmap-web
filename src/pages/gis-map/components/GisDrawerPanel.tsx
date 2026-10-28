import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Zap,
  X,
  Activity,
  Info,
  Radio,
  Wrench,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldCheck,
  CameraOff,
} from 'lucide-react'

import type { SegmentInfo, PoleFeature } from '../GisMapPage'
import cabinetSvg from '../../../assets/icons/cabinet.svg'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../../redux/store'
import { fetchPoleDetailRequest, clearPoleDetail } from '../../../feature/map/mapSlice'
import { StatusBadge } from '../../../components/StatusBadge'
import type { FaultType, Severity, FaultStatus } from '../../../types/common/enums'
import type { PoleMapOpenFault } from '../../../types/map/poles'

export interface GisDrawerPanelProps {
  selectedPole: PoleFeature | null
  setSelectedPole: (p: PoleFeature | null) => void
  setSelectedSegmentId: (s: string | null) => void
  activeSegmentDetail: SegmentInfo
  handleSelectPole: (f: PoleFeature) => void
  selectedCabinet?: any
  setSelectedCabinet?: (c: any) => void
  selectedFeeder?: any
  setSelectedFeeder?: (f: any) => void
  cabinets?: any[]
  effectivePoles?: PoleFeature[]
  feederStatusMap?: Record<string, 'active' | 'fault'>
  onToggleFeeder?: (feederId: string, feederName?: string) => void
}

const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  lamp_out: 'Đèn tắt hoàn toàn',
  lamp_dim: 'Đèn mờ / Sụt quang thông',
  segment_outage: 'Mất điện toàn tuyến',
  node_offline: 'Cảm biến IoT mất tín hiệu',
  runtime_decline: 'Suy giảm thời gian chiếu sáng',
}

const SEVERITY_BADGES: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: 'Khẩn cấp',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  high: {
    label: 'Cao',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  medium: {
    label: 'Trung bình',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  low: {
    label: 'Thấp',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
}

const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  detected: 'Mới phát hiện',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang sửa chữa',
  resolved: 'Đã khắc phục',
  verified: 'Đã nghiệm thu',
  rejected: 'Đã từ chối',
}

export const GisDrawerPanel: React.FC<GisDrawerPanelProps> = ({
  selectedPole,
  setSelectedPole,
  setSelectedSegmentId,
  activeSegmentDetail,
  handleSelectPole,
  selectedCabinet,
  setSelectedCabinet,
  selectedFeeder,
  setSelectedFeeder,
  effectivePoles: propsEffectivePoles = [],
  feederStatusMap,
  onToggleFeeder,
}) => {
  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string
    title: string
  } | null>(null)

  // Maintenance Status
  const poleId = selectedPole?.properties?.pole_id || ''
  const dispatch = useDispatch<AppDispatch>()
  const { poleDetail } = useSelector((state: RootState) => state.map)
  const { feeders: assetFeeders } = useSelector((state: RootState) => state.assets)

  const effectiveFixtureStatus =
    poleDetail?.current_status?.fixture_status || selectedPole?.properties?.fixture_status || 'unknown'
  const openFaultCount =
    poleDetail?.open_faults?.length !== undefined
      ? poleDetail.open_faults.length
      : selectedPole?.properties?.open_fault_count || 0

  const isUnderRepair =
    effectiveFixtureStatus === 'dim' ||
    (openFaultCount > 0 && effectiveFixtureStatus !== 'out')
  const isFaulted = effectiveFixtureStatus === 'out'
  const isUnknown = effectiveFixtureStatus === 'unknown'

  const maintenanceStatus = isUnderRepair
    ? 'repairing'
    : isFaulted
    ? 'fault'
    : isUnknown
    ? 'unknown'
    : 'normal'

  // Fetch real pole detail via Redux Saga (GET /api/v1/map/poles/{pole_id})
  React.useEffect(() => {
    if (!poleId) {
      dispatch(clearPoleDetail())
      return
    }

    dispatch(fetchPoleDetailRequest(poleId))
  }, [dispatch, poleId])

  // Real IoT node from poleDetail or props
  const poleIotNode = useMemo(() => {
    if (poleDetail?.iot_node) {
      return {
        node_id: poleDetail.iot_node.node_id || 'IOT-NODE',
        node_status: poleDetail.iot_node.node_status || 'online',
        battery_pct: 95,
        last_seen: poleDetail.iot_node.last_report_at || '',
      }
    }
    return null
  }, [poleDetail])

  // Real open faults from poleDetail
  const openFaults = poleDetail?.open_faults || []

  // Accordion state: auto-open if pole has issue, otherwise collapsed
  const hasIssue =
    selectedPole?.properties?.fixture_status === 'out' ||
    selectedPole?.properties?.fixture_status === 'dim' ||
    openFaults.length > 0 ||
    (selectedPole?.properties?.open_fault_count || 0) > 0

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(hasIssue)

  // Sync accordion state when a new pole is selected
  React.useEffect(() => {
    setIsHistoryOpen(hasIssue)
  }, [selectedPole?.properties?.pole_id, hasIssue])

  const polePhotoUrl = poleDetail?.recent_frames?.[0]?.thumbnail_url || null

  // Dàn đèn do tủ phụ trách được xác định qua topology edges từ Redux Store
  const { cabinetTopologyEdges } = useSelector((state: RootState) => state.map)

  const cabinetConnectedPoles = useMemo(() => {
    if (!selectedCabinet) return []
    const cabId = selectedCabinet.cabinet_id
    const segId = selectedCabinet.segment_id

    if (cabinetTopologyEdges && cabinetTopologyEdges.length > 0) {
      const toPoleIds = new Set(
        cabinetTopologyEdges.map((e: any) => e.properties?.to_pole_id).filter(Boolean)
      )
      const matched = (propsEffectivePoles || []).filter((p) =>
        toPoleIds.has(p.properties?.pole_id)
      )
      if (matched.length > 0) return matched
    }

    return (propsEffectivePoles || []).filter(
      (f) =>
        f.properties?.cabinet_id === cabId ||
        (segId && f.properties?.segment_id === segId)
    )
  }, [cabinetTopologyEdges, selectedCabinet, propsEffectivePoles])

  // Danh sách các mạch điện (Feeders) thuộc tủ này
  const cabinetFeeders = useMemo(() => {
    if (!selectedCabinet) return []

    // 1. Tìm các feeder từ assetFeeders liên kết với tủ này
    const matched = (assetFeeders || []).filter(
      (f) =>
        (f.cabinet?.cabinet_id && f.cabinet.cabinet_id === selectedCabinet.cabinet_id) ||
        (selectedCabinet.feeder_ids && selectedCabinet.feeder_ids.includes(f.feeder_id)) ||
        (selectedCabinet.external_ref && f.cabinet?.cabinet_name?.includes(selectedCabinet.external_ref))
    )
    if (matched.length > 0) return matched

    // 2. Fallback nếu tủ có danh sách feeder_ids hoặc mô phỏng mạch điện của tủ
    const ids =
      selectedCabinet.feeder_ids && selectedCabinet.feeder_ids.length > 0
        ? selectedCabinet.feeder_ids
        : [`FDR-${selectedCabinet.external_ref || selectedCabinet.cabinet_id || '01'}-1`, `FDR-${selectedCabinet.external_ref || selectedCabinet.cabinet_id || '01'}-2`]

    return ids.map((fId: string, idx: number) => ({
      feeder_id: fId,
      external_ref: fId,
      feeder_name: `Mạch ${idx + 1} - Lộ chiếu sáng ${idx + 1}`,
      commune_id: selectedCabinet.commune_id,
      commune_name: selectedCabinet.commune_name,
      has_geometry: false,
      pole_count: Math.ceil(cabinetConnectedPoles.length / ids.length) || 0,
      cabinet: {
        cabinet_id: selectedCabinet.cabinet_id,
        cabinet_name: selectedCabinet.cabinet_name,
        location: selectedCabinet.location,
        cabinet_source: 'field' as any,
      },
      updated_at: null,
    }))
  }, [selectedCabinet, assetFeeders, cabinetConnectedPoles.length])

  return (
    <>
      <aside className="w-97.5 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-40 shrink-0 font-sans">
        
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                selectedPole
                  ? maintenanceStatus === 'repairing'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : maintenanceStatus === 'fault'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : maintenanceStatus === 'unknown'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : selectedCabinet
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : selectedFeeder
                  ? feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : activeSegmentDetail.hasActiveSegmentFault
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {selectedPole ? (
                maintenanceStatus === 'repairing' ? (
                  <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : maintenanceStatus === 'fault' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )
              ) : selectedCabinet ? (
                <img
                  src={cabinetSvg}
                  className="w-4.5 h-4.5 shrink-0"
                  alt="Tủ điện"
                />
              ) : selectedFeeder ? (
                <Zap
                  className={`w-4 h-4 ${
                    feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              ) : (
                <Radio className={`w-4 h-4 ${activeSegmentDetail.hasActiveSegmentFault ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              )}
            </div>

            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>
                  {selectedPole
                    ? selectedPole.properties?.external_ref || selectedPole.properties?.pole_id
                    : selectedCabinet
                    ? selectedCabinet.cabinet_name || selectedCabinet.external_ref || selectedCabinet.cabinet_id
                    : selectedFeeder
                    ? selectedFeeder.feeder_name || selectedFeeder.external_ref || selectedFeeder.feeder_id
                    : activeSegmentDetail.name}
                </span>
                {selectedFeeder && (
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                      feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                      ? 'Đã ngắt nguồn'
                      : 'Đang cấp điện'}
                  </span>
                )}
                {selectedPole && (
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                      effectiveFixtureStatus === 'out'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : effectiveFixtureStatus === 'dim'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : effectiveFixtureStatus === 'unknown'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {effectiveFixtureStatus === 'out'
                      ? 'Đèn tắt'
                      : effectiveFixtureStatus === 'dim'
                      ? 'Đèn mờ'
                      : effectiveFixtureStatus === 'unknown'
                      ? 'Chưa quét'
                      : 'Đạt chuẩn'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedPole
                  ? activeSegmentDetail.name
                  : selectedCabinet
                  ? [
                      selectedCabinet.external_ref || selectedCabinet.cabinet_name || selectedCabinet.cabinet_id,
                      selectedCabinet.landmark_note || selectedCabinet.atlas
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : selectedFeeder
                  ? [
                      selectedFeeder.external_ref || selectedFeeder.feeder_id,
                      selectedFeeder.cabinet_name ? `Tủ: ${selectedFeeder.cabinet_name}` : null,
                      selectedFeeder.segment_id ? `Tuyến: ${selectedFeeder.segment_id}` : null
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${activeSegmentDetail.id} · ${activeSegmentDetail.name}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPole(null)
              setSelectedSegmentId(null)
              if (setSelectedCabinet) setSelectedCabinet(null)
              if (setSelectedFeeder) setSelectedFeeder(null)
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {selectedPole ? (
            <div className="space-y-4 text-xs">
              {/* Cascade Fault Alert Banner */}
              {selectedPole.properties.power_loss_reason && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Sự cố mất nguồn cấp điện!</span>
                  </div>
                  <p className="text-rose-700 dark:text-rose-400 text-[11px] leading-relaxed">
                    {selectedPole.properties.power_loss_reason}
                  </p>
                </div>
              )}

              {/* 1. Actual Pole Photo */}
              {polePhotoUrl ? (
                <div
                  onClick={() =>
                    setLightboxImage({
                      url: polePhotoUrl,
                      title: `Ảnh hiện trường: ${selectedPole.properties.external_ref || selectedPole.properties.pole_id}`,
                    })
                  }
                  className="relative h-44 rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-2xs"
                >
                  <img
                    src={polePhotoUrl}
                    alt={selectedPole.properties.external_ref || selectedPole.properties.pole_id}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent flex items-end justify-between p-2.5 text-white">
                    <span className="text-[11px] font-medium drop-shadow-sm font-mono">
                      {selectedPole.properties.external_ref || selectedPole.properties.pole_id}
                    </span>
                    <div className="p-1 rounded bg-black/40 group-hover:bg-blue-600 text-white transition">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-28 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <CameraOff className="w-6 h-6 mb-1 text-slate-300 dark:text-slate-600" />
                  <span>Chưa có ảnh khảo sát thực địa</span>
                </div>
              )}

                  {/* 2. Technical Specs Card (Core Asset Identity) */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Thông số kỹ thuật</span>
                    </div>

                    <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Tuyến:</span>
                        <strong className="text-slate-900 dark:text-white">{selectedPole.properties.segment_id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Nguồn cấp:</span>
                        <strong className="text-slate-900 dark:text-white">
                          Điện lưới 220V
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bóng đèn:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {poleDetail?.fixture?.fixture_type || selectedPole.properties.fixture_type || 'LED'} (
                          {poleDetail?.fixture?.lamp_watt || selectedPole.properties.lamp_watt || 100}W)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tọa độ GPS:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {selectedPole.geometry.coordinates[1].toFixed(5)}° N, {selectedPole.geometry.coordinates[0].toFixed(5)}° E
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Lắp đặt:</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {poleDetail?.fixture?.install_date || selectedPole.properties.install_date || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Trạng thái bảo hành:</span>
                        <StatusBadge
                          type="warranty"
                          status={poleDetail?.fixture?.warranty_status || selectedPole.properties.warranty_status || 'unknown'}
                          size="sm"
                        />
                      </div>
                      <div className="flex justify-between">
                        <span>Hạn bảo hành:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">
                          {poleDetail?.fixture?.warranty_expiry || selectedPole.properties.warranty_expiry || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cảm biến IoT:</span>
                        {poleIotNode ? (
                          <strong className="text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
                            ⚡ {poleIotNode.node_id} (Pin {poleIotNode.battery_pct}%)
                          </strong>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Không trang bị</span>
                        )}
                      </div>
                      {selectedPole.properties.near_sensitive_poi && (
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium">
                          <span>Vị trí nhạy cảm:</span>
                          <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-semibold">
                            <span className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold">!</span>
                            Gần trường học
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          Ghi chú Atlas:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {selectedPole.properties.atlas || selectedPole.properties.atlas_note || 'Đang cập nhật'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Dedicated Pole IoT Sensor Card (Only if pole has a sampled_fixture IoT node) */}
                  {poleIotNode && (
                    <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200/70 dark:border-blue-800/50 space-y-2">
                      <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/40 pb-1.5">
                        <span className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Cảm biến IoT trên cột ({poleIotNode.node_id})</span>
                        </span>
                        <span
                          className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${
                            poleIotNode.node_status === 'online'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {poleIotNode.node_status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Mức pin dự trữ</span>
                          <strong className="text-slate-900 dark:text-white font-mono text-xs flex items-center gap-1">
                            {poleIotNode.battery_pct}%
                            {poleIotNode.battery_pct < 50 && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">(Pin yếu)</span>
                            )}
                          </strong>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-blue-900/50">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Thời gian phát sáng</span>
                          <strong className="text-slate-900 dark:text-white font-mono text-xs">
                            {poleDetail?.runtime_history?.[0]?.runtime_hours !== undefined
                              ? `${poleDetail.runtime_history[0].runtime_hours} h/đêm`
                              : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Luminance Baseline History (Operational Telemetry) */}
                  <div className="bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Quang thông 3 đêm gần nhất</span>
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Baseline</span>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      {poleDetail?.luminance_history && poleDetail.luminance_history.length > 0 ? (
                        poleDetail.luminance_history.slice(0, 3).map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 text-[11px]"
                          >
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {item.observed_at ? item.observed_at.split('T')[0] : 'Gần đây'}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {Math.round((item.baseline_ratio || 1) * 100)}%
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                item.classified_as === 'normal'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {item.classified_as === 'normal' ? 'Sáng' : 'Mờ'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-2.5 text-center text-slate-400 dark:text-slate-500 text-[11px]">
                          Chưa có dữ liệu đo quang thông từ các đợt quét gần nhất
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Collapsible Active Faults & Issues (Accordion at the bottom) */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden bg-white dark:bg-slate-800/50 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        {openFaults.length > 0 ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>Sự cố đang ghi nhận</span>
                        {openFaults.length > 0 ? (
                          <span className="ml-1.5 px-2 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                            {openFaults.length} sự cố
                          </span>
                        ) : (
                          <span className="ml-1.5 px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Bình thường
                          </span>
                        )}
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                      )}
                    </button>

                    {isHistoryOpen && (
                      <div className="p-3 pt-2 space-y-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-900/40">
                        {openFaults.length > 0 ? (
                          openFaults.map((fault: PoleMapOpenFault, idx: number) => {
                            const faultType = fault.fault_type
                            const severity = fault.severity
                            const faultStatus = fault.fault_status
                            const sevConfig = severity ? SEVERITY_BADGES[severity] : null

                            return (
                              <div
                                key={fault.fault_id || idx}
                                className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[11px] font-bold text-blue-900 dark:text-blue-300">
                                    {fault.fault_id || `FAULT-#${idx + 1}`}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {sevConfig && (
                                      <span
                                        className={`text-[9.5px] px-1.5 py-0.2 rounded border font-semibold ${sevConfig.className}`}
                                      >
                                        {sevConfig.label}
                                      </span>
                                    )}
                                    {faultStatus && (
                                      <span className="text-[9.5px] px-1.5 py-0.2 rounded font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                        {FAULT_STATUS_LABELS[faultStatus] || faultStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between">
                                  <span>
                                    {faultType ? FAULT_TYPE_LABELS[faultType] || faultType : 'Sự cố chiếu sáng'}
                                  </span>
                                  {typeof fault.priority_score === 'number' && (
                                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                      Ưu tiên: {fault.priority_score}đ
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="py-4 px-3 flex flex-col items-center justify-center text-center space-y-1.5 text-slate-500 dark:text-slate-400">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-4.5 h-4.5" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              Không có sự cố nào đang ghi nhận
                            </span>
                            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 max-w-60 leading-relaxed">
                              Cột đèn hoạt động bình thường, không có cảnh báo bất thường từ các đợt khảo sát và vận hành.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          ) : selectedCabinet ? (
            <div className="space-y-4 text-xs">
              {/* Cabinet Details Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <img
                      src={cabinetSvg}
                      className="w-4 h-4 shrink-0"
                      alt="Tủ điện"
                    />
                    <span>Thông số Tủ Điện Điều Khiển</span>
                  </span>
                  
                </div>

                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã hiệu quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{selectedCabinet.external_ref || selectedCabinet.cabinet_name || selectedCabinet.cabinet_id}</strong>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Ghi chú Atlas:
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-right max-w-55">
                      {selectedCabinet.atlas || selectedCabinet.landmark_note || 'Đang cập nhật'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuyến đường cấp nguồn:</span>
                    <strong className="text-blue-700 dark:text-blue-400 font-bold">{selectedCabinet.segment_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Số lượng mạch điện (Feeders):</span>
                    <strong className="text-purple-700 dark:text-purple-400 font-bold font-mono">
                      {cabinetFeeders.length} mạch nguồn
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số đèn quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {cabinetConnectedPoles.length || selectedCabinet.total_poles_managed || 0} cột đèn
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Công suất phụ tải:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{selectedCabinet.current_load_kw} kW</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Điện áp định mức:</span>
                    <strong className={`font-mono ${selectedCabinet.voltage_v === 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-900 dark:text-white'}`}>
                      {selectedCabinet.voltage_v} V
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hệ số công suất:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">cosφ {selectedCabinet.power_factor || 0.95}</strong>
                  </div>
                </div>

                </div>

              {/* Electrical Specs Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Hệ thống IoT Giám sát từ xa</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {selectedCabinet.iot_gateway_id || selectedCabinet.iot_node_id}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Hệ số Cos φ</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">{selectedCabinet.power_factor || '0.95'}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Tần số lưới</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">50.0 Hz</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Nhiệt độ tủ</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">34.2 °C</strong>
                  </div>
                </div>

                
              </div>

              {/* Feeder Circuits Section with Individual On/Off Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="truncate">Danh sách Mạch điện của Tủ ({cabinetFeeders.length} mạch)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-normal">
                    Điều khiển theo cụm
                  </span>
                </div>

                <div className="space-y-2">
                  {cabinetFeeders.map((feeder: any, idx: number) => {
                    const fId = feeder.feeder_id || feeder.external_ref || `fdr-${idx}`
                    const isFault = feederStatusMap?.[fId] === 'fault'
                    const feederPoles = cabinetConnectedPoles.filter(
                      (p) => p.properties.feeder_id === fId || (idx === 0 && !p.properties.feeder_id)
                    )
                    const poleCount = feederPoles.length || feeder.pole_count || 0
                    const fName = feeder.feeder_name || `Mạch ${idx + 1}`
                    const fCode = feeder.external_ref || fId

                    return (
                      <div
                        key={fId}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isFault
                            ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isFault ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                                {fName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                              <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                                {fCode}
                              </span>
                              <span>•</span>
                              <span>{poleCount} cột đèn</span>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                                isFault
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              }`}
                            >
                              {isFault ? 'Đã ngắt' : 'Đang cấp điện'}
                            </span>

                            {onToggleFeeder && (
                              <button
                                type="button"
                                onClick={() => onToggleFeeder(fId, fName)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                  !isFault ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                title={!isFault ? `Bấm để ngắt điện ${fName}` : `Bấm để cấp điện ${fName}`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform ${
                                    !isFault ? 'translate-x-5.5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              </div>
          ) : selectedFeeder ? (
            <div className="space-y-4 text-xs">
              {/* 1. Feeder Control Card with Toggle Switch */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Điều khiển nguồn Mạch điện</span>
                  </span>
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                      feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    }`}
                  >
                    {feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                      ? 'ĐÃ NGẮT NGUỒN'
                      : 'ĐANG CẤP ĐIỆN'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                      {selectedFeeder.feeder_name || selectedFeeder.external_ref || selectedFeeder.feeder_id}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Đóng/ngắt điện toàn bộ cột đèn thuộc mạch này
                    </div>
                  </div>
                  {onToggleFeeder && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleFeeder(
                          selectedFeeder.feeder_id || selectedFeeder.external_ref,
                          selectedFeeder.feeder_name || selectedFeeder.external_ref
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                        feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] !== 'fault'
                          ? 'bg-emerald-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={
                        feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] !== 'fault'
                          ? 'Bấm để ngắt điện mạch'
                          : 'Bấm để cấp điện mạch'
                      }
                    >
                      <span
                        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform ${
                          feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] !== 'fault'
                            ? 'translate-x-5.5'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Feeder Specifications Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Thông số Kỹ thuật Mạch điện</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã hiệu mạch:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {selectedFeeder.external_ref || selectedFeeder.feeder_id}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tủ cấp nguồn:</span>
                    <strong className="text-indigo-700 dark:text-indigo-400 font-bold">
                      {selectedFeeder.cabinet_name || selectedFeeder.cabinet_id || selectedFeeder.from_id || 'Chưa gán'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuyến đường:</span>
                    <strong className="text-blue-700 dark:text-blue-400 font-semibold">
                      {selectedFeeder.segment_name || activeSegmentDetail.name || selectedFeeder.segment_id}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Số cột đèn quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {propsEffectivePoles.filter(
                        (p) =>
                          p.properties.feeder_id === selectedFeeder.feeder_id ||
                          p.properties.feeder_id === selectedFeeder.external_ref
                      ).length || selectedFeeder.pole_count || 0} cột đèn
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Điện áp định mức:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault' ? '0 V (Mất nguồn)' : '220 V'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Poles on this Feeder Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Danh sách Cột đèn thuộc Mạch ({selectedFeeder.external_ref || selectedFeeder.feeder_id})
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                      ? 'Tất cả đèn đang tắt'
                      : 'Đang cấp điện chiếu sáng'}
                  </span>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                  {propsEffectivePoles
                    .filter(
                      (p) =>
                        p.properties.feeder_id === selectedFeeder.feeder_id ||
                        p.properties.feeder_id === selectedFeeder.external_ref
                    )
                    .map((f: PoleFeature, index: number) => {
                      const isFeederOff =
                        feederStatusMap?.[selectedFeeder.feeder_id || selectedFeeder.external_ref] === 'fault'
                      const lampLabel = f.properties.lamp_code || `Đèn số ${index + 1}`

                      return (
                        <div
                          key={f.properties.pole_id}
                          onClick={() => handleSelectPole(f)}
                          className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer flex items-center justify-between border border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700/50 transition group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {f.properties.external_ref || f.properties.pole_id}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {lampLabel}
                            </span>
                          </div>
                          <span
                            className={`text-[9.5px] px-2 py-0.5 rounded font-bold ${
                              isFeederOff
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isFeederOff ? 'TẮT (Mất nguồn)' : 'SÁNG (220V)'}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* 1. Segment Overview Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Thông tin tuyến</span>
                  </span>
                  {activeSegmentDetail.hasActiveSegmentFault && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded border bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                      Sự cố mất điện lộ nguồn
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã tuyến:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{activeSegmentDetail.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tên tuyến:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cấp đường:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {activeSegmentDetail.road_class === 'urban'
                        ? 'Đường đô thị'
                        : activeSegmentDetail.road_class === 'rural'
                        ? 'Đường nông thôn'
                        : activeSegmentDetail.road_class === 'inter_commune'
                        ? 'Đường liên xã'
                        : activeSegmentDetail.road_class || 'Đường giao thông'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chiều dài tuyến:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.lengthM} m</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số cột:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.poleCount} cột</strong>
                  </div>
                </div>
              </div>

              {/* 2. Pole List on this Segment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Danh sách cột ({activeSegmentDetail.name})
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {activeSegmentDetail.poleCount} cột
                  </span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-0.5">
                  {(propsEffectivePoles || [])
                    .filter((f: PoleFeature) => f.properties?.segment_id === activeSegmentDetail.id)
                    .map((f: PoleFeature) => (
                      <div
                        key={f.properties.pole_id}
                        onClick={() => handleSelectPole(f)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer flex items-center justify-between border border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700/50 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {f.properties.external_ref || f.properties.pole_id}
                          </span>
                          {f.properties.near_sensitive_poi && (
                            <span
                              className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 shadow-xs"
                              title="Gần trường học"
                            >
                              !
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            f.properties.fixture_status === 'normal'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : f.properties.fixture_status === 'dim'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : f.properties.fixture_status === 'out'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {f.properties.fixture_status === 'normal'
                            ? 'Sáng'
                            : f.properties.fixture_status === 'dim'
                            ? 'Mờ'
                            : f.properties.fixture_status === 'out'
                            ? 'Tắt'
                            : 'Chưa quét'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </aside>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <h3 className="font-semibold text-xs text-slate-200">{lightboxImage.title}</h3>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-72 max-h-[70vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}


