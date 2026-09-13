import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Zap,
  X,
  Activity,
  Info,
  Radio,
  Wrench,
  Clock,
  Maximize2,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { SegmentInfo, PoleFeature } from '../GisMapPage'
import mockPolesData from '../../../data/mock-poles.geo.json'
import mockPoleDetailData from '../../../data/mock-pole-detail.json'
import mockIotNodesData from '../../../data/mock-iot-nodes.geo.json'

interface LuminanceHistoryItem {
  observed_at: string
  baseline_ratio: number
  classified_as: 'normal' | 'dim' | 'out' | string
}

interface IotNodeProperties {
  node_id: string
  segment_id: string
  pole_id: string | null
  node_type: string
  node_status: 'online' | 'offline'
  battery_pct: number
  last_seen: string
}

interface IotNodeFeature {
  type: string
  geometry: {
    type: string
    coordinates: number[]
  }
  properties: IotNodeProperties
}

export interface GisDrawerPanelProps {
  selectedPole: PoleFeature | null
  setSelectedPole: (p: PoleFeature | null) => void
  setSelectedSegmentId: (s: string | null) => void
  activeSegmentDetail: SegmentInfo
  handleSelectPole: (f: PoleFeature) => void
}

interface IncidentRecord {
  id: string
  title: string
  time: string
  status: 'repairing' | 'resolved'
  technician: string
  workOrderId: string
  description: string
  beforePhoto: { url: string; label: string }
  afterPhoto?: { url: string; label: string }
}

export const GisDrawerPanel: React.FC<GisDrawerPanelProps> = ({
  selectedPole,
  setSelectedPole,
  setSelectedSegmentId,
  activeSegmentDetail,
  handleSelectPole,
}) => {
  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string
    title: string
  } | null>(null)

  // Maintenance Status
  const poleId = selectedPole?.properties?.pole_id || ''
  const isUnderRepair =
    selectedPole?.properties?.fixture_status === 'dim' ||
    poleId === 'POLE-0083' ||
    ((selectedPole?.properties?.open_fault_count || 0) > 0 && selectedPole?.properties?.fixture_status !== 'out')
  const isFaulted = selectedPole?.properties?.fixture_status === 'out'

  const maintenanceStatus = isUnderRepair ? 'repairing' : isFaulted ? 'fault' : 'normal'

  // Find IoT node for selected pole (if this pole has a sampled_fixture IoT node)
  const poleIotNode = useMemo(() => {
    if (!selectedPole) return null
    const features = (mockIotNodesData.features || []) as unknown as IotNodeFeature[]
    const found = features.find((f: IotNodeFeature) => f.properties?.pole_id === selectedPole.properties?.pole_id)
    return found ? found.properties : null
  }, [selectedPole])

  // Accordion state: auto-open if pole has issue, otherwise collapsed
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(isUnderRepair || isFaulted)

  // Load More state (default showing 2 recent incidents)
  const [visibleCount, setVisibleCount] = useState<number>(2)

  // Incident history list with multiple records to demonstrate load more
  const incidentHistory: IncidentRecord[] = [
    {
      id: `INC-2026-${poleId ? poleId.replace('POLE-', '') : '0083'}-01`,
      title: isUnderRepair ? 'Cháy chấn lưu LED 60W & chập nguồn nhánh' : 'Đứt bóng LED 60W sau mưa dông',
      time: '24/08/2026 19:45',
      status: isUnderRepair ? 'repairing' : 'resolved',
      technician: 'Nguyễn Văn Hùng (Tổ 2 Củ Chi)',
      workOrderId: 'WO-2026-0824',
      description: isUnderRepair
        ? 'Đang thay thế cụm module LED 60W và kiểm tra aptomat nhánh.'
        : 'Đã thay mới module LED Philips 60W, đo sáng đạt chuẩn.',
      beforePhoto: {
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&auto=format&fit=crop&q=80',
        label: 'Trước sửa chữa (Lúc hỏng)',
      },
      afterPhoto: isUnderRepair
        ? undefined
        : {
            url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80',
            label: 'Nghiệm thu sau sửa chữa',
          },
    },
    {
      id: `INC-2025-${poleId ? poleId.replace('POLE-', '') : '0083'}-02`,
      title: 'Đèn mờ sụt quang thông (Dimming < 80% Baseline)',
      time: '12/10/2025 18:30',
      status: 'resolved',
      technician: 'Lê Quốc Bảo (Tổ 1)',
      workOrderId: 'WO-2025-1012',
      description: 'Quang thông suy giảm do bụi bám dày chao quang học. Đã vệ sinh và thay tụ nguồn.',
      beforePhoto: {
        url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=900&auto=format&fit=crop&q=80',
        label: 'Chao quang học bị bám bụi',
      },
      afterPhoto: {
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80',
        label: 'Nghiệm thu sau vệ sinh và thay tụ',
      },
    },
    {
      id: `INC-2024-${poleId ? poleId.replace('POLE-', '') : '0083'}-03`,
      title: 'Hở mối nối dây nguồn trên thân cột',
      time: '15/07/2024 10:15',
      status: 'resolved',
      technician: 'Phạm Minh Đức (Tổ 2 Củ Chi)',
      workOrderId: 'WO-2024-0715',
      description: 'Mối nối dây bọc cách điện bị lão hóa gây phóng tia lửa nhẹ. Đã quấn lại băng keo chuyên dụng và bọc ống co nhiệt.',
      beforePhoto: {
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&auto=format&fit=crop&q=80',
        label: 'Mối nối bị hở cách điện',
      },
      afterPhoto: {
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80',
        label: 'Đã bọc lại cách điện an toàn',
      },
    },
    {
      id: `INC-2023-${poleId ? poleId.replace('POLE-', '') : '0083'}-04`,
      title: 'Bảo trì định kỳ & cân chỉnh góc chiếu đèn',
      time: '05/03/2023 15:00',
      status: 'resolved',
      technician: 'Nguyễn Văn Hùng (Tổ 2 Củ Chi)',
      workOrderId: 'WO-2023-0305',
      description: 'Kiểm tra siết bu lông móng cột và siết chặt quai ôm chao đèn trước mùa mưa bão.',
      beforePhoto: {
        url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=900&auto=format&fit=crop&q=80',
        label: 'Kiểm tra bu lông móng',
      },
      afterPhoto: {
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80',
        label: 'Hoàn tất bảo dưỡng móng',
      },
    },
  ]



  const polePhotoUrl =
    'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=900&auto=format&fit=crop&q=80'

  return (
    <>
      <aside className="w-[390px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20 shrink-0 font-sans">
        
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                selectedPole
                  ? maintenanceStatus === 'repairing'
                    ? 'bg-amber-100 text-amber-700'
                    : maintenanceStatus === 'fault'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                  : activeSegmentDetail.hasActiveSegmentFault
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {selectedPole ? (
                maintenanceStatus === 'repairing' ? (
                  <Wrench className="w-4 h-4 text-amber-600" />
                ) : maintenanceStatus === 'fault' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : (
                  <Zap className="w-4 h-4 text-emerald-600" />
                )
              ) : (
                <Radio className="w-4 h-4 text-blue-600" />
              )}
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>{selectedPole ? selectedPole.properties?.pole_id : activeSegmentDetail.name}</span>

                {selectedPole?.properties?.has_iot_node && (
                  <span
                    className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0"
                    title="Điểm gắn IoT"
                  >
                    ⚡
                  </span>
                )}

                {selectedPole?.properties?.near_sensitive_poi && (
                  <span
                    className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0"
                    title="Gần trường, cầu"
                  >
                    !
                  </span>
                )}

                {/* Single Concise Status Badge */}
                {selectedPole ? (
                  maintenanceStatus === 'repairing' ? (
                    <span className="text-[10.5px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                      Đang sửa chữa
                    </span>
                  ) : maintenanceStatus === 'fault' ? (
                    <span className="text-[10.5px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200">
                      Báo hỏng
                    </span>
                  ) : (
                    <span className="text-[10.5px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      Bình thường
                    </span>
                  )
                ) : (
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                      activeSegmentDetail.hasActiveSegmentFault
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {activeSegmentDetail.hasActiveSegmentFault ? 'Sự cố lộ' : 'Cấp điện ổn định'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {selectedPole ? activeSegmentDetail.name : `${activeSegmentDetail.id} · Tủ ${activeSegmentDetail.cabinet}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPole(null)
              setSelectedSegmentId(null)
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {selectedPole ? (
            <div className="space-y-4 text-xs">
                  {/* 1. Actual Pole Photo */}
                  <div
                    onClick={() =>
                      setLightboxImage({
                        url: polePhotoUrl,
                        title: `Ảnh hiện trường: ${selectedPole.properties.pole_id}`,
                      })
                    }
                    className="relative h-44 rounded-xl overflow-hidden cursor-pointer group border border-slate-200 bg-slate-900 shadow-2xs"
                  >
                    <img
                      src={polePhotoUrl}
                      alt={selectedPole.properties.pole_id}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end justify-between p-2.5 text-white">
                      <span className="text-[11px] font-medium drop-shadow-sm font-mono">
                        {selectedPole.properties.pole_id}
                      </span>
                      <div className="p-1 rounded bg-black/40 group-hover:bg-blue-600 text-white transition">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Technical Specs Card (Core Asset Identity) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>Thông số kỹ thuật</span>
                    </div>

                    <div className="space-y-1.5 text-[11.5px] text-slate-600">
                      <div className="flex justify-between">
                        <span>Tuyến:</span>
                        <strong className="text-slate-900">{selectedPole.properties.segment_id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Nguồn cấp:</span>
                        <strong className="text-slate-900">
                          {selectedPole.properties.power_source === 'solar' ? 'Năng lượng mặt trời' : 'Điện lưới 220V'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bóng đèn:</span>
                        <strong className="text-slate-900">
                          {selectedPole.properties.fixture_type || 'LED'} ({selectedPole.properties.lamp_watt || 100}W)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tọa độ GPS:</span>
                        <strong className="text-slate-900 font-mono">
                          {selectedPole.geometry.coordinates[1].toFixed(5)}° N, {selectedPole.geometry.coordinates[0].toFixed(5)}° E
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Lắp đặt:</span>
                        <span className="text-slate-800">{selectedPole.properties.install_date || '2022-03-24'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bảo hành đến:</span>
                        <span className="text-slate-800">{selectedPole.properties.warranty_expiry || '2027-03-24'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cảm biến IoT:</span>
                        {poleIotNode ? (
                          <strong className="text-blue-600 font-mono flex items-center gap-1">
                            ⚡ {poleIotNode.node_id} (Pin {poleIotNode.battery_pct}%)
                          </strong>
                        ) : (
                          <span className="text-slate-400">Không trang bị</span>
                        )}
                      </div>
                      {selectedPole.properties.near_sensitive_poi && (
                        <div className="flex justify-between items-center text-slate-600 font-medium">
                          <span>Vị trí nhạy cảm:</span>
                          <span className="flex items-center gap-1.5 text-violet-700 font-semibold">
                            <span className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold">!</span>
                            Gần trường, cầu
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Dedicated Pole IoT Sensor Card (Only if pole has a sampled_fixture IoT node) */}
                  {poleIotNode && (
                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/70 space-y-2">
                      <div className="flex items-center justify-between border-b border-blue-200/50 pb-1.5">
                        <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-600" />
                          <span>Cảm biến IoT trên cột ({poleIotNode.node_id})</span>
                        </span>
                        <span
                          className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${
                            poleIotNode.node_status === 'online'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {poleIotNode.node_status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div className="p-2 bg-white rounded-lg border border-blue-100">
                          <span className="text-slate-500 block text-[10px]">Mức pin dự trữ</span>
                          <strong className="text-slate-900 font-mono text-xs flex items-center gap-1">
                            {poleIotNode.battery_pct}%
                            {poleIotNode.battery_pct < 50 && (
                              <span className="text-[9px] text-amber-600 font-semibold">(Pin yếu)</span>
                            )}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-blue-100">
                          <span className="text-slate-500 block text-[10px]">Thời gian phát sáng</span>
                          <strong className="text-slate-900 font-mono text-xs">
                            {selectedPole.properties.pole_id === 'POLE-0047' ? '6.65 h/đêm' : '10.5 h/đêm'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Luminance Baseline History (Operational Telemetry) */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        <span>Quang thông 3 đêm gần nhất</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Baseline</span>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      {((mockPoleDetailData.luminance_history || []) as unknown as LuminanceHistoryItem[])
                        .slice(0, 3)
                        .map((item: LuminanceHistoryItem, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                          >
                            <span className="font-mono text-slate-600">{item.observed_at.split('T')[0]}</span>
                            <span className="font-bold text-slate-900">{Math.round(item.baseline_ratio * 100)}%</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                item.classified_as === 'normal'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.classified_as === 'normal' ? 'Sáng' : 'Mờ'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 4. Collapsible Maintenance & Incident History (Accordion at the bottom) */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer text-xs font-bold text-slate-800 select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lịch sử sự cố & bảo trì</span>
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isHistoryOpen && (
                      <div className="p-3 pt-2 space-y-3 border-t border-slate-100 bg-white">
                        {incidentHistory.slice(0, visibleCount).map((inc) => (
                          <div
                            key={inc.id}
                            className={`p-2.5 rounded-lg border space-y-2 ${
                              inc.status === 'repairing'
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-slate-50/80 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-slate-800">{inc.id}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  inc.status === 'repairing'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {inc.status === 'repairing' ? 'Đang sửa' : 'Đã sửa'}
                              </span>
                            </div>

                            <div className="space-y-0.5 text-[11px] text-slate-700">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Lỗi:</span>
                                <strong className="text-slate-800 text-right">{inc.title}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Thời gian:</span>
                                <span className="font-mono text-slate-600 text-[10.5px]">{inc.time}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Kỹ thuật:</span>
                                <span className="text-slate-800 font-medium">{inc.technician}</span>
                              </div>
                            </div>

                            {/* Before / After Photos */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <div
                                onClick={() =>
                                  setLightboxImage({
                                    url: inc.beforePhoto.url,
                                    title: `${inc.id} - ${inc.beforePhoto.label}`,
                                  })
                                }
                                className="relative h-20 rounded-lg overflow-hidden cursor-pointer group border border-slate-300 bg-slate-900"
                              >
                                <img
                                  src={inc.beforePhoto.url}
                                  alt="Lúc hỏng"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-1 text-white">
                                  <span className="text-[9px] font-semibold text-amber-200">Lúc hỏng</span>
                                  <Maximize2 className="w-3 h-3 text-white/80" />
                                </div>
                              </div>

                              {inc.afterPhoto ? (
                                <div
                                  onClick={() =>
                                    setLightboxImage({
                                      url: inc.afterPhoto!.url,
                                      title: `${inc.id} - ${inc.afterPhoto!.label}`,
                                    })
                                  }
                                  className="relative h-20 rounded-lg overflow-hidden cursor-pointer group border border-slate-300 bg-slate-900"
                                >
                                  <img
                                    src={inc.afterPhoto.url}
                                    alt="Nghiệm thu"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-1 text-white">
                                    <span className="text-[9px] font-semibold text-emerald-200">Nghiệm thu</span>
                                    <Maximize2 className="w-3 h-3 text-white/80" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-20 rounded-lg border border-dashed border-amber-300 bg-amber-100/40 flex flex-col items-center justify-center p-1 text-center text-amber-800 text-[10px]">
                                  <Clock className="w-3.5 h-3.5 mb-0.5 text-amber-600" />
                                  <span>Đang sửa chữa...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {visibleCount < incidentHistory.length ? (
                          <button
                            type="button"
                            onClick={() => setVisibleCount((prev) => prev + 2)}
                            className="w-full py-2 text-center text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 rounded-lg transition cursor-pointer border border-blue-200/60"
                          >
                            Xem thêm sự cố cũ hơn ↓
                          </button>
                        ) : incidentHistory.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => setVisibleCount(2)}
                            className="w-full py-1.5 text-center text-[10.5px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            Thu gọn ↑
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* 1. Segment Overview Card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông tin tuyến</span>
                  </span>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                      activeSegmentDetail.hasActiveSegmentFault
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {activeSegmentDetail.hasActiveSegmentFault ? 'Sự cố lộ' : 'Bình thường'}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11.5px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Mã tuyến:</span>
                    <strong className="text-slate-900 font-mono">{activeSegmentDetail.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tên tuyến:</span>
                    <strong className="text-slate-900">{activeSegmentDetail.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chiều dài tuyến:</span>
                    <strong className="text-slate-900">{activeSegmentDetail.lengthM} m</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số cột:</span>
                    <strong className="text-slate-900">{activeSegmentDetail.poleCount} cột</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tủ điều khiển:</span>
                    <strong className="text-slate-900">{activeSegmentDetail.cabinet}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Segment Cabinet IoT Card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông số Tủ {activeSegmentDetail.cabinet}</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      activeSegmentDetail.iotStatus === 'online'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {activeSegmentDetail.iotStatus === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Điện áp</span>
                    <strong className="text-slate-900 font-mono text-xs">221.4 V</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Dòng điện</span>
                    <strong className="text-slate-900 font-mono text-xs">18.6 A</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Cos φ</span>
                    <strong className="text-slate-900 font-mono text-xs">0.94</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                  <span>Aptomat:</span>
                  <strong>
                    {activeSegmentDetail.hasActiveSegmentFault ? (
                      <span className="text-rose-600 font-bold">Đã Nhảy (Trip)</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Đang Đóng (ON)</span>
                    )}
                  </strong>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Cập nhật:</span>
                  <span className="text-slate-800 font-mono">1 phút trước</span>
                </div>
              </div>

              {/* 3. Pole List on this Segment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-xs">
                    Danh sách cột ({activeSegmentDetail.name})
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {activeSegmentDetail.poleCount} cột
                  </span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-0.5">
                  {((mockPolesData.features || []) as unknown as PoleFeature[])
                    .filter((f: PoleFeature) => f.properties?.segment_id === activeSegmentDetail.id)
                    .map((f: PoleFeature) => (
                      <div
                        key={f.properties.pole_id}
                        onClick={() => handleSelectPole(f)}
                        className="p-2.5 bg-slate-50 hover:bg-blue-50/80 rounded-lg cursor-pointer flex items-center justify-between border border-slate-100 hover:border-blue-200 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-800 text-xs group-hover:text-blue-700 transition-colors">
                            {f.properties.pole_id}
                          </span>
                          {f.properties.has_iot_node && (
                            <span className="text-[9.5px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold font-mono flex items-center gap-0.5">
                              ⚡ IoT
                            </span>
                          )}
                          {f.properties.near_sensitive_poi && (
                            <span
                              className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 shadow-xs"
                              title="Gần trường, cầu"
                            >
                              !
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            f.properties.fixture_status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.properties.fixture_status === 'dim'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {f.properties.fixture_status === 'normal'
                            ? 'Sáng'
                            : f.properties.fixture_status === 'dim'
                            ? 'Mờ'
                            : 'Tắt'}
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


