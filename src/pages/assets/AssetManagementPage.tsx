import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Upload,
  Eye,
  Edit2,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Zap,
  Route,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '../../components/StatusBadge'
import { AddPoleModal, type NewPoleData } from './components/AddPoleModal'
import { EditPoleModal, type EditablePoleData } from './components/EditPoleModal'
import { PoleDetailModal } from './components/PoleDetailModal'
import { ImportAssetModal } from './components/ImportAssetModal'
import { AddCabinetModal, type NewCabinetData } from './components/AddCabinetModal'
import { AddSegmentModal, type NewSegmentData } from './components/AddSegmentModal'
import { CabinetDetailModal } from './components/CabinetDetailModal'
import { SegmentDetailModal } from './components/SegmentDetailModal'

import mockPolesGeoJson from '../../data/mock-poles.geo.json'
import mockSegmentsGeoJson from '../../data/mock-segments.geo.json'
import mockCabinetsGeoJson from '../../data/mock-cabinets.geo.json'

export type AssetCategory = 'poles_and_fixtures' | 'cabinets' | 'segments'

export interface AssetPoleItem {
  id: string
  pole_id: string
  segment_id: string
  segment_name: string
  commune_id: string
  commune_name: string
  lamp_watt: number
  power_source: 'grid' | 'solar'
  fixture_type: 'led_road_lamp' | 'solar_all_in_one'
  fixture_status: 'normal' | 'dim' | 'out' | 'unknown'
  feeder_id: string
  warranty_expiry: string
  lat: number
  lng: number
  near_sensitive_poi: boolean
  atlas?: string
  lux_value?: number
  open_fault_count?: number
}

export interface AssetCabinetItem {
  id: string
  cabinet_id: string
  cabinet_name: string
  role: 'root_cabinet' | 'sub_cabinet'
  segment_id: string
  segment_name: string
  status: 'active' | 'fault'
  voltage_v: number
  current_load_kw: number
  power_factor: number
  total_poles_managed: number
  landmark_note: string
  installed_at: string
  lat: number
  lng: number
  fault_reason?: string
}

export interface AssetSegmentItem {
  id: string
  segment_id: string
  segment_name: string
  road_class: 'inter_commune' | 'inter_village' | 'alley'
  length_m: number
  pole_count: number
  has_active_fault: boolean
  commune_name: string
}

const COMMUNE_NAMES: Record<string, string> = {
  'COM-001': 'Xã Phước Hậu',
  'COM-002': 'Xã Mỹ Hạnh Bắc',
  'COM-003': 'Xã Đức Hòa Đông',
}

const SEGMENT_NAMES: Record<string, string> = {}
if (mockSegmentsGeoJson && Array.isArray((mockSegmentsGeoJson as any).features)) {
  ;(mockSegmentsGeoJson as any).features.forEach((f: any) => {
    if (f.properties?.segment_id) {
      SEGMENT_NAMES[f.properties.segment_id] = f.properties.segment_name || f.properties.segment_id
    }
  })
}

const INITIAL_POLES: AssetPoleItem[] = ((mockPolesGeoJson as any).features || []).map((f: any, idx: number) => {
  const p = f.properties || {}
  const coords = f.geometry?.coordinates || [106.4896, 10.9701]
  const cId = p.commune_id || 'COM-001'
  const sId = p.segment_id || 'SEG-001'

  return {
    id: p.pole_id || `POLE-${String(idx + 1).padStart(4, '0')}`,
    pole_id: p.pole_id || `POLE-${String(idx + 1).padStart(4, '0')}`,
    segment_id: sId,
    segment_name: SEGMENT_NAMES[sId] || 'Tuyến A - Tỉnh Lộ 8',
    commune_id: cId,
    commune_name: COMMUNE_NAMES[cId] || 'Xã Phước Hậu',
    lamp_watt: p.lamp_watt || 100,
    power_source: (p.power_source as any) || 'grid',
    fixture_type: (p.fixture_type as any) || 'led_road_lamp',
    fixture_status: (p.fixture_status as any) || 'normal',
    feeder_id: p.feeder_id || 'CAB-TL8-ROOT',
    warranty_expiry: p.warranty_expiry || '2026-12-31',
    lat: coords[1],
    lng: coords[0],
    near_sensitive_poi: !!p.near_sensitive_poi,
    atlas: p.atlas || '',
    lux_value: p.lux_value ?? (p.fixture_status === 'dim' ? 14.2 : p.fixture_status === 'out' ? 0.0 : 29.4),
    open_fault_count: p.open_fault_count || 0,
  }
})

const INITIAL_CABINETS: AssetCabinetItem[] = ((mockCabinetsGeoJson as any).features || []).map((f: any, idx: number) => {
  const p = f.properties || {}
  const coords = f.geometry?.coordinates || [106.4896, 10.9701]
  const cId = p.cabinet_id || `CAB-${String(idx + 1).padStart(3, '0')}`

  return {
    id: cId,
    cabinet_id: cId,
    cabinet_name: p.cabinet_name || `Tủ điện ${cId}`,
    role: (p.role as any) || 'root_cabinet',
    segment_id: p.segment_id || 'SEG-001',
    segment_name: p.segment_name || 'Tuyến A (Tỉnh Lộ 8)',
    status: (p.status as any) || 'active',
    voltage_v: p.voltage_v ?? 220,
    current_load_kw: p.current_load_kw ?? 15,
    power_factor: p.power_factor ?? 0.95,
    total_poles_managed: p.total_poles_managed || p.pole_count || 30,
    landmark_note: p.landmark_note || p.atlas || 'Mốc thực địa tại tuyến',
    installed_at: p.installed_at || '2023-01-15',
    lat: coords[1],
    lng: coords[0],
    fault_reason: p.fault_reason,
  }
})

const INITIAL_SEGMENTS: AssetSegmentItem[] = ((mockSegmentsGeoJson as any).features || []).map((f: any, idx: number) => {
  const p = f.properties || {}
  const sId = p.segment_id || `SEG-${String(idx + 1).padStart(3, '0')}`

  return {
    id: sId,
    segment_id: sId,
    segment_name: p.segment_name || `Tuyến đường ${sId}`,
    road_class: (p.road_class as any) || 'inter_commune',
    length_m: p.length_m || 1500,
    pole_count: p.pole_count || 40,
    has_active_fault: !!p.has_active_segment_fault,
    commune_name: 'Xã Phước Hậu',
  }
})

export const AssetManagementPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('poles_and_fixtures')

  // Lists state
  const [poles, setPoles] = useState<AssetPoleItem[]>(INITIAL_POLES)
  const [cabinets, setCabinets] = useState<AssetCabinetItem[]>(INITIAL_CABINETS)
  const [segments, setSegments] = useState<AssetSegmentItem[]>(INITIAL_SEGMENTS)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Modals state
  const [isAddPoleModalOpen, setIsAddPoleModalOpen] = useState(false)
  const [isAddCabinetModalOpen, setIsAddCabinetModalOpen] = useState(false)
  const [isAddSegmentModalOpen, setIsAddSegmentModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const [detailPole, setDetailPole] = useState<AssetPoleItem | null>(null)
  const [editPole, setEditPole] = useState<EditablePoleData | null>(null)
  const [detailCabinet, setDetailCabinet] = useState<AssetCabinetItem | null>(null)
  const [detailSegment, setDetailSegment] = useState<AssetSegmentItem | null>(null)

  // Success Banner state
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const showBanner = (msg: string) => {
    setSuccessBanner(msg)
    toast.success(msg)
    setTimeout(() => setSuccessBanner(null), 4000)
  }

  // Switch category
  const handleCategoryChange = (cat: AssetCategory) => {
    setActiveCategory(cat)
    setSearchQuery('')
    setStatusFilter('all')
    setSourceFilter('all')
    setCurrentPage(1)
  }

  // 1. Filtered Poles
  const filteredPoles = useMemo(() => {
    return poles.filter((pole) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        pole.pole_id.toLowerCase().includes(q) ||
        pole.segment_name.toLowerCase().includes(q) ||
        pole.commune_name.toLowerCase().includes(q) ||
        (pole.atlas && pole.atlas.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'all' || pole.fixture_status === statusFilter
      const matchesSource = sourceFilter === 'all' || pole.power_source === sourceFilter

      return matchesQuery && matchesStatus && matchesSource
    })
  }, [poles, searchQuery, statusFilter, sourceFilter])

  // 2. Filtered Cabinets
  const filteredCabinets = useMemo(() => {
    return cabinets.filter((cab) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        cab.cabinet_id.toLowerCase().includes(q) ||
        cab.cabinet_name.toLowerCase().includes(q) ||
        cab.segment_name.toLowerCase().includes(q) ||
        cab.landmark_note.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || cab.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [cabinets, searchQuery, statusFilter])

  // 3. Filtered Segments
  const filteredSegments = useMemo(() => {
    return segments.filter((seg) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        seg.segment_id.toLowerCase().includes(q) ||
        seg.segment_name.toLowerCase().includes(q) ||
        seg.commune_name.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'fault'
          ? seg.has_active_fault
          : !seg.has_active_fault

      return matchesQuery && matchesStatus
    })
  }, [segments, searchQuery, statusFilter])

  // Pagination for current tab
  const currentListLength =
    activeCategory === 'poles_and_fixtures'
      ? filteredPoles.length
      : activeCategory === 'cabinets'
      ? filteredCabinets.length
      : filteredSegments.length

  const totalPages = Math.ceil(currentListLength / pageSize) || 1

  const paginatedPoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPoles.slice(start, start + pageSize)
  }, [filteredPoles, currentPage, pageSize])

  const paginatedCabinets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCabinets.slice(start, start + pageSize)
  }, [filteredCabinets, currentPage, pageSize])

  const paginatedSegments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSegments.slice(start, start + pageSize)
  }, [filteredSegments, currentPage, pageSize])

  // Handlers for Add
  const handleAddPole = (data: NewPoleData) => {
    const newItem: AssetPoleItem = {
      id: data.pole_id,
      pole_id: data.pole_id,
      segment_id: data.segment_id,
      segment_name: data.segment_name,
      commune_id: data.commune_id,
      commune_name: data.commune_name,
      lamp_watt: data.lamp_watt,
      power_source: data.power_source,
      fixture_type: data.fixture_type,
      fixture_status: 'normal',
      feeder_id: data.feeder_id,
      warranty_expiry: data.warranty_expiry,
      lat: data.lat,
      lng: data.lng,
      near_sensitive_poi: data.near_sensitive_poi,
      atlas: data.atlas,
      lux_value: 30.0,
      open_fault_count: 0,
    }

    setPoles((prev) => [newItem, ...prev])
    setCurrentPage(1)
    showBanner(`Đã đăng ký thành công cột đèn "${data.pole_id}" vào Bản đồ GIS!`)
  }

  const handleAddCabinet = (data: NewCabinetData) => {
    const newItem: AssetCabinetItem = {
      id: data.cabinet_id,
      cabinet_id: data.cabinet_id,
      cabinet_name: data.cabinet_name,
      role: data.role,
      segment_id: data.segment_id,
      segment_name: data.segment_name,
      status: 'active',
      voltage_v: data.voltage_v,
      current_load_kw: data.current_load_kw,
      power_factor: 0.95,
      total_poles_managed: data.total_poles_managed,
      landmark_note: data.landmark_note,
      installed_at: data.installed_at,
      lat: data.lat,
      lng: data.lng,
    }

    setCabinets((prev) => [newItem, ...prev])
    setCurrentPage(1)
    showBanner(`Đã đăng ký thành công tủ điện "${data.cabinet_id}" vào Cơ sở Dữ liệu GIS!`)
  }

  const handleAddSegment = (data: NewSegmentData) => {
    const newItem: AssetSegmentItem = {
      id: data.segment_id,
      segment_id: data.segment_id,
      segment_name: data.segment_name,
      road_class: data.road_class,
      length_m: data.length_m,
      pole_count: data.pole_count,
      has_active_fault: false,
      commune_name: data.commune_name,
    }

    setSegments((prev) => [newItem, ...prev])
    setCurrentPage(1)
    showBanner(`Đã tạo tuyến đường mới "${data.segment_name}" thành công!`)
  }

  const handleUpdatePole = (updated: EditablePoleData) => {
    setPoles((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              segment_name: updated.segment_name,
              lamp_watt: updated.lamp_watt,
              power_source: updated.power_source,
              fixture_status: updated.fixture_status,
              feeder_id: updated.feeder_id,
              warranty_expiry: updated.warranty_expiry,
              atlas: updated.atlas,
            }
          : item
      )
    )

    if (detailPole && detailPole.id === updated.id) {
      setDetailPole((prev) =>
        prev
          ? {
              ...prev,
              segment_name: updated.segment_name,
              lamp_watt: updated.lamp_watt,
              power_source: updated.power_source,
              fixture_status: updated.fixture_status,
              feeder_id: updated.feeder_id,
              warranty_expiry: updated.warranty_expiry,
              atlas: updated.atlas,
            }
          : null
      )
    }

    showBanner(`Đã cập nhật thông số cột đèn "${updated.pole_id}"!`)
  }

  const handleImportSuccess = (count: number, newPoles?: AssetPoleItem[]) => {
    if (newPoles && newPoles.length > 0) {
      setPoles((prev) => {
        const map = new Map(prev.map((p) => [p.pole_id, p]))
        newPoles.forEach((p) => map.set(p.pole_id, p))
        return Array.from(map.values())
      })
      setCurrentPage(1)
    }
    showBanner(`Đã nạp thành công ${count} tài sản từ file vào Cơ sở Dữ liệu GIS!`)
  }


  // Calculate quick metrics
  const totalRoadKm = (segments.reduce((acc, s) => acc + s.length_m, 0) / 1000).toFixed(1)
  const activeCabinetsCount = cabinets.filter((c) => c.status === 'active').length
  const faultCabinetsCount = cabinets.length - activeCabinetsCount
  const normalPolesCount = poles.filter((p) => p.fixture_status === 'normal').length
  const poleHealthPct = poles.length > 0 ? ((normalPolesCount / poles.length) * 100).toFixed(1) : '100'

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {/* Top Notification Banner */}
        {successBanner && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-md font-bold">
              Hệ thống GIS
            </span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-xs">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Quản Lý Tài Sản Hạ Tầng Chiếu Sáng
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Quản lý số hóa 3 phân lớp tài sản: Tuyến đường, Tủ điện điều khiển và Cột & Bóng đèn GIS
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Import Dữ Liệu</span>
            </button>
          </div>
        </div>

        {/* Slim KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tuyến đường</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {segments.length} tuyến <span className="text-xs font-medium text-slate-400 dark:text-slate-500">({totalRoadKm} km)</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3 hover:border-amber-300 dark:hover:border-amber-700 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tủ điều khiển</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {cabinets.length} tủ{' '}
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-bold">
                  ({activeCabinetsCount} cấp điện{faultCabinetsCount > 0 ? `, ${faultCabinetsCount} sự cố` : ''})
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cột chiếu sáng</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {poles.length} cột <span className="text-xs font-medium text-slate-400 dark:text-slate-500">(100% WGS84)</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bóng đèn hoạt động</div>
              <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {poleHealthPct}% <span className="text-xs font-medium text-slate-400 dark:text-slate-500">({normalPolesCount}/{poles.length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented Control Navigation Tabs */}
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryChange('poles_and_fixtures')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'poles_and_fixtures'
                ? 'bg-[#1f3864] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Cột & Bóng đèn</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeCategory === 'poles_and_fixtures'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {poles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('cabinets')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'cabinets'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Tủ điện điều khiển</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeCategory === 'cabinets'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cabinets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('segments')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'segments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Tuyến đường chiếu sáng</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeCategory === 'segments'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {segments.length}
            </span>
          </button>
        </div>

        {/* Search & Dynamic Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="flex-1 min-w-[240px] relative">
              <input
                type="text"
                placeholder={
                  activeCategory === 'poles_and_fixtures'
                    ? 'Tìm theo mã cột (POLE-0001), tuyến đường, xã...'
                    : activeCategory === 'cabinets'
                    ? 'Tìm theo mã tủ (CAB-TL8), tên tủ, mốc thực địa...'
                    : 'Tìm theo mã tuyến (SEG-001), tên tuyến đường...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* FILTERS FOR POLES */}
            {activeCategory === 'poles_and_fixtures' && (
              <>
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="normal">Bình thường (Đang sáng)</option>
                    <option value="dim">Đèn mờ (Suy hao Lux)</option>
                    <option value="out">Hỏng / Tắt nguồn</option>
                    <option value="unknown">Chưa quét / Không rõ</option>
                  </select>
                </div>

                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                >
                  <option value="all">Tất cả nguồn cấp</option>
                  <option value="grid">Lưới điện 220V</option>
                  <option value="solar">Năng lượng Mặt trời</option>
                </select>
              </>
            )}

            {/* FILTERS FOR CABINETS */}
            {activeCategory === 'cabinets' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái tủ</option>
                  <option value="active">Đang cấp điện ổn định</option>
                  <option value="fault">Sự cố ngắt tải (Trip/Mất điện)</option>
                </select>
              </div>
            )}

            {/* FILTERS FOR SEGMENTS */}
            {activeCategory === 'segments' && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="normal">Lưới điện ổn định</option>
                <option value="fault">Có sự cố phân đoạn</option>
              </select>
            )}
          </div>

          {/* Right: Contextual Add Button */}
          {activeCategory === 'poles_and_fixtures' && (
            <button
              type="button"
              onClick={() => setIsAddPoleModalOpen(true)}
              className="px-3.5 py-2 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng ký Cột mới</span>
            </button>
          )}

          {activeCategory === 'cabinets' && (
            <button
              type="button"
              onClick={() => setIsAddCabinetModalOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tủ Điện</span>
            </button>
          )}

          {activeCategory === 'segments' && (
            <button
              type="button"
              onClick={() => setIsAddSegmentModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tuyến Đường</span>
            </button>
          )}
        </div>

        {/* 1. TABLE FOR POLES & FIXTURES */}
        {activeCategory === 'poles_and_fixtures' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/80">
                  <tr>
                    <th className="p-3.5">Mã cột</th>
                    <th className="p-3.5">Tuyến đường</th>
                    <th className="p-3.5">Tủ điện nguồn</th>
                    <th className="p-3.5">Địa bàn</th>
                    <th className="p-3.5">Công suất</th>
                    <th className="p-3.5">Nguồn cấp</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Bảo hành</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedPoles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Không tìm thấy cột đèn nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedPoles.map((pole) => (
                      <tr key={pole.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              pole.fixture_status === 'normal'
                                ? 'bg-emerald-500'
                                : pole.fixture_status === 'dim'
                                ? 'bg-amber-500'
                                : pole.fixture_status === 'out'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="font-mono">{pole.pole_id}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate" title={pole.segment_name}>
                          {pole.segment_name}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {pole.feeder_id}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">{pole.commune_name}</td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{pole.lamp_watt}W</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                            {pole.power_source === 'grid' ? 'Lưới điện' : 'Năng lượng MT'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <StatusBadge type="fixture" status={pole.fixture_status} size="sm" />
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">
                          {pole.warranty_expiry || '—'}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDetailPole(pole)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1f3864] dark:text-blue-400 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditPole(pole)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TABLE FOR CABINETS */}
        {activeCategory === 'cabinets' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/80">
                  <tr>
                    <th className="p-3.5">Mã tủ điện</th>
                    <th className="p-3.5">Tên tủ & Phân cấp</th>
                    <th className="p-3.5">Tuyến đường cấp nguồn</th>
                    <th className="p-3.5">Số cột quản lý</th>
                    <th className="p-3.5">Điện áp & Tải</th>
                    <th className="p-3.5">Tọa độ GIS</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedCabinets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Không tìm thấy tủ điện nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedCabinets.map((cab) => (
                      <tr key={cab.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              cab.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                            }`}
                          />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{cab.cabinet_id}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{cab.cabinet_name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cab.role === 'root_cabinet' ? 'Tủ xuất tuyến chính (Root)' : 'Tủ phân đoạn nhánh (Sub)'}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200 max-w-[200px] truncate" title={cab.segment_name}>
                          {cab.segment_name}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {cab.total_poles_managed} cột
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {cab.voltage_v > 0 ? `${cab.voltage_v} V` : '0 V (Mất nguồn)'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{cab.current_load_kw} kW (cosφ {cab.power_factor})</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {cab.lat.toFixed(4)}, {cab.lng.toFixed(4)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                              cab.status === 'active'
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {cab.status === 'active' ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Cấp điện tốt</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>Sự cố ngắt tải</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDetailCabinet(cab)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1f3864] dark:text-blue-400 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TABLE FOR SEGMENTS */}
        {activeCategory === 'segments' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/80">
                  <tr>
                    <th className="p-3.5">Mã tuyến</th>
                    <th className="p-3.5">Tên tuyến đường</th>
                    <th className="p-3.5">Cấp đường</th>
                    <th className="p-3.5">Chiều dài (m)</th>
                    <th className="p-3.5">Số cột chiếu sáng</th>
                    <th className="p-3.5">Địa bàn Xã</th>
                    <th className="p-3.5">Trạng thái lưới</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedSegments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Không tìm thấy tuyến đường nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedSegments.map((seg) => (
                      <tr key={seg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                          {seg.segment_id}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-[240px] truncate">
                          {seg.segment_name}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                              seg.road_class === 'inter_commune'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : seg.road_class === 'inter_village'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {seg.road_class === 'inter_commune'
                              ? 'Đường liên xã'
                              : seg.road_class === 'inter_village'
                              ? 'Đường liên thôn'
                              : 'Đường ngõ xóm'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {seg.length_m.toLocaleString()} m ({((seg.length_m) / 1000).toFixed(1)} km)
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {seg.pole_count} cột
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">
                          {seg.commune_name}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                              !seg.has_active_fault
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {!seg.has_active_fault ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Vận hành tốt</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>Có sự cố phân đoạn</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDetailSegment(seg)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1f3864] dark:text-blue-400 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {currentListLength === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {Math.min(currentPage * pageSize, currentListLength)}
            </strong>{' '}
            trên tổng số <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentListLength}</strong> bản ghi{' '}
            {activeCategory === 'poles_and_fixtures'
              ? 'cột đèn'
              : activeCategory === 'cabinets'
              ? 'tủ điện'
              : 'tuyến đường'}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-slate-700 dark:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-slate-700 dark:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals Container */}
      <AddPoleModal
        isOpen={isAddPoleModalOpen}
        onClose={() => setIsAddPoleModalOpen(false)}
        onAddPole={handleAddPole}
        existingPoleCount={poles.length}
      />

      <AddCabinetModal
        isOpen={isAddCabinetModalOpen}
        onClose={() => setIsAddCabinetModalOpen(false)}
        onAddCabinet={handleAddCabinet}
        existingCount={cabinets.length}
      />

      <AddSegmentModal
        isOpen={isAddSegmentModalOpen}
        onClose={() => setIsAddSegmentModalOpen(false)}
        onAddSegment={handleAddSegment}
        existingCount={segments.length}
      />

      <EditPoleModal
        isOpen={!!editPole}
        pole={editPole}
        onClose={() => setEditPole(null)}
        onSave={handleUpdatePole}
      />

      <PoleDetailModal
        isOpen={!!detailPole}
        pole={detailPole}
        onClose={() => setDetailPole(null)}
        onOpenEdit={(p) => {
          setDetailPole(null)
          setEditPole(p)
        }}
      />

      <CabinetDetailModal
        cabinet={detailCabinet}
        onClose={() => setDetailCabinet(null)}
      />

      <SegmentDetailModal
        segment={detailSegment}
        onClose={() => setDetailSegment(null)}
      />

      <ImportAssetModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}

export default AssetManagementPage
