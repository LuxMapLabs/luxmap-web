import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Zap,
  CheckCircle2,
  Trash2,
  Route,
  GitBranch,
  Crown,
  AlertCircle,
  PlusCircle,
} from 'lucide-react'
import { DatePicker } from '../../../components/DatePicker'

export interface SegmentOption {
  segment_id: string
  segment_name: string
  commune_name?: string
  pole_count?: number
}

export interface CabinetOption {
  id?: string
  cabinet_id: string
  cabinet_name: string
  role?: 'root_cabinet' | 'sub_cabinet' | string
  segment_id?: string
  segment_ids?: string[]
  segment_name?: string
  parent_cabinet_id?: string
  subordinated_cabinets?: string[]
  voltage_v?: number
  current_load_kw?: number
  power_factor?: number
  lat?: number
  lng?: number
  landmark_note?: string
}

export interface NewCabinetData {
  cabinet_id: string
  cabinet_name: string
  role: 'root_cabinet' | 'sub_cabinet'
  parent_cabinet_id?: string
  branch_start_pole?: string
  segment_id: string
  segment_name: string
  commune_id?: string
  commune_name?: string
  voltage_v: number
  current_load_kw: number
  total_poles_managed: number
  landmark_note: string
  lat: number
  lng: number
  installed_at: string
}

interface SubCabinetRowDraft {
  rowId: string
  cabinet_id: string
  cabinet_name: string
  voltage_v: number
  current_load_kw: string
  lat: string
  lng: string
  landmark_note: string
}

interface AddCabinetModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCabinet?: (data: NewCabinetData) => void
  onAddCabinets?: (cabinets: NewCabinetData[]) => void
  existingCount: number
  availableSegments?: SegmentOption[]
  availableCabinets?: CabinetOption[]
}

const DEFAULT_COMMUNES = [
  { id: 'COM-001', name: 'Xã Phước Hậu' },
  { id: 'COM-002', name: 'Xã Mỹ Hạnh Bắc' },
  { id: 'COM-003', name: 'Xã Đức Hòa Đông' },
]

const DEFAULT_SEGMENTS: SegmentOption[] = [
  { segment_id: 'SEG-001', segment_name: 'Tuyến A - Tỉnh Lộ 8', commune_name: 'Xã Phước Hậu', pole_count: 40 },
  { segment_id: 'SEG-002', segment_name: 'Tuyến B - Hương Lộ 2', commune_name: 'Xã Phước Hậu', pole_count: 32 },
  { segment_id: 'SEG-003', segment_name: 'Tuyến C - Huỳnh Văn Cọ', commune_name: 'Xã Mỹ Hạnh Bắc', pole_count: 28 },
]

export const AddCabinetModal: React.FC<AddCabinetModalProps> = ({
  isOpen,
  onClose,
  onAddCabinet,
  onAddCabinets,
  existingCount,
  availableSegments,
  availableCabinets,
}) => {
  const segmentList = availableSegments && availableSegments.length > 0 ? availableSegments : DEFAULT_SEGMENTS

  // Top Section: Commune, Segment, Date
  const [communeId, setCommuneId] = useState('')
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [installedDateStr, setInstalledDateStr] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // New Root Cabinet form state (used if route does not have a root cabinet yet)
  const [newRootId, setNewRootId] = useState('')
  const [newRootName, setNewRootName] = useState('')
  const [newRootVoltage, setNewRootVoltage] = useState('220.0')
  const [newRootLoadKw, setNewRootLoadKw] = useState('18.0')
  const [newRootLat, setNewRootLat] = useState('10.9710')
  const [newRootLng, setNewRootLng] = useState('106.4910')
  const [newRootLandmark, setNewRootLandmark] = useState('')

  // Sub-Cabinets Rows Draft List
  const [subRows, setSubRows] = useState<SubCabinetRowDraft[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Current selected commune & filtered segments
  const currentCommune = DEFAULT_COMMUNES.find((c) => c.id === communeId)
  const filteredSegments = segmentList.filter((s) => {
    if (!communeId || !currentCommune) return true
    if (!s.commune_name) return true
    return s.commune_name.toLowerCase().includes(currentCommune.name.toLowerCase())
  })
  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)

  // Find existing Root Cabinet on the selected segment
  const existingRootCabinet = (availableCabinets || []).find((c) => {
    const isRoot = c.role === 'root_cabinet' || c.cabinet_id.includes('ROOT')
    if (!isRoot) return false
    if (!selectedSegmentId) return false
    return (
      c.segment_id === selectedSegmentId ||
      (c.segment_ids && c.segment_ids.includes(selectedSegmentId)) ||
      (currentSegment && c.segment_name?.trim() === currentSegment.segment_name?.trim())
    )
  })

  // DatePicker handler
  const installedDate = installedDateStr ? new Date(installedDateStr.replace(/-/g, '/')) : null
  const handleDateChange = (date: Date | null) => {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      setInstalledDateStr(`${y}-${m}-${d}`)
    } else {
      setInstalledDateStr('')
    }
  }

  // Handle commune change
  const handleCommuneChange = (newCommuneId: string) => {
    setCommuneId(newCommuneId)
    setSelectedSegmentId('')
    setSubRows([])
    setErrorMsg(null)
  }

  // Helper: Extract short route code for cabinet ID
  const getRouteCode = (segName: string, segId: string) => {
    if (segName.includes('Tỉnh Lộ 8')) return 'TL8'
    if (segName.includes('Nguyễn Văn Ni')) return 'NVN'
    if (segName.includes('Hương Lộ 2')) return 'HL2'
    if (segName.includes('Huỳnh Văn Cọ')) return 'HVC'
    return segId.replace('SEG-', 'S')
  }

  // Handle segment change
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setSubRows([])
    setErrorMsg(null)

    const seg = segmentList.find((s) => s.segment_id === newSegmentId)
    const segName = seg?.segment_name || 'Tuyến mới'

    // Check if route already has a root cabinet
    const rootCab = (availableCabinets || []).find((c) => {
      const isRoot = c.role === 'root_cabinet' || c.cabinet_id.includes('ROOT')
      if (!isRoot) return false
      return (
        c.segment_id === newSegmentId ||
        (c.segment_ids && c.segment_ids.includes(newSegmentId)) ||
        c.segment_name?.trim() === segName.trim()
      )
    })

    if (!rootCab) {
      setNewRootId('')
      setNewRootName('')
      setNewRootVoltage('220.0')
      setNewRootLoadKw('')
      setNewRootLat('')
      setNewRootLng('')
      setNewRootLandmark('')
    }
  }

  // Handle Add Sub Cabinet Row (Always start empty/null for user input)
  const handleAddSubRow = () => {
    setErrorMsg(null)

    if (!communeId) {
      setErrorMsg('Vui lòng chọn Địa bàn Xã / Thị trấn ở mục 1 trước khi thêm tủ nhánh!')
      return
    }

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm tủ nhánh!')
      return
    }

    const newSubRow: SubCabinetRowDraft = {
      rowId: `sub-row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      cabinet_id: '',
      cabinet_name: '',
      voltage_v: 220,
      current_load_kw: '',
      lat: '',
      lng: '',
      landmark_note: '',
    }

    setSubRows((prev) => [...prev, newSubRow])
  }

  // Handle Delete Sub Row
  const handleDeleteSubRow = (rowIdToDelete: string) => {
    setSubRows((prev) => prev.filter((r) => r.rowId !== rowIdToDelete))
  }

  // Handle Update Sub Row Field
  const handleUpdateSubRow = <K extends keyof SubCabinetRowDraft>(
    rowId: string,
    field: K,
    value: SubCabinetRowDraft[K]
  ) => {
    setSubRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    )
  }

  // Reset form when opening modal
  useEffect(() => {
    if (isOpen) {
      setCommuneId('')
      setSelectedSegmentId('')
      setSubRows([])
      setErrorMsg(null)
      setNewRootId('')
      setNewRootName('')
    }
  }, [isOpen, existingCount])

  if (!isOpen) return null

  // Handle Final Submit
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!communeId) {
      setErrorMsg('Vui lòng chọn Địa bàn Xã / Thị trấn ở mục 1!')
      return
    }

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1!')
      return
    }

    const seg = segmentList.find((s) => s.segment_id === selectedSegmentId)
    const segName = seg?.segment_name || 'Tuyến đường chiếu sáng'
    const com = DEFAULT_COMMUNES.find((c) => c.id === communeId)

    const cabinetsToSave: NewCabinetData[] = []
    let rootCabId = existingRootCabinet ? existingRootCabinet.cabinet_id : newRootId.trim()

    // 1. If no existing root cabinet, validate and prepare new root cabinet
    if (!existingRootCabinet) {
      if (!newRootId.trim()) {
        setErrorMsg('Vui lòng nhập Mã định danh cho Tủ Đỉnh nguồn chính!')
        return
      }
      if (!newRootName.trim()) {
        setErrorMsg('Vui lòng nhập Tên Tủ Đỉnh nguồn chính!')
        return
      }

      rootCabId = newRootId.trim()

      cabinetsToSave.push({
        cabinet_id: rootCabId,
        cabinet_name: newRootName.trim(),
        role: 'root_cabinet',
        segment_id: selectedSegmentId,
        segment_name: segName,
        commune_id: communeId,
        commune_name: com?.name || 'Xã Phước Hậu',
        voltage_v: parseFloat(newRootVoltage) || 220,
        current_load_kw: parseFloat(newRootLoadKw) || 18,
        total_poles_managed: 0,
        landmark_note: newRootLandmark.trim() || `Đầu tuyến ${segName}`,
        lat: parseFloat(newRootLat) || 10.971,
        lng: parseFloat(newRootLng) || 106.491,
        installed_at: installedDateStr || new Date().toISOString().split('T')[0],
      })
    }

    // 2. Prepare sub cabinets
    for (let i = 0; i < subRows.length; i++) {
      const row = subRows[i]
      const codePart = getRouteCode(segName, selectedSegmentId)
      const cabId = row.cabinet_id.trim() || `CAB-${codePart}-SUB-${String(i + 1).padStart(2, '0')}`
      const cabName = row.cabinet_name.trim() || `Tủ Nhánh Phân Đoạn ${i + 1}`

      cabinetsToSave.push({
        cabinet_id: cabId,
        cabinet_name: cabName,
        role: 'sub_cabinet',
        parent_cabinet_id: rootCabId,
        segment_id: selectedSegmentId,
        segment_name: segName,
        commune_id: communeId,
        commune_name: com?.name || 'Xã Phước Hậu',
        voltage_v: row.voltage_v || 220,
        current_load_kw: parseFloat(row.current_load_kw) || 0,
        total_poles_managed: 0,
        landmark_note: row.landmark_note.trim(),
        lat: parseFloat(row.lat) || 0,
        lng: parseFloat(row.lng) || 0,
        installed_at: installedDateStr || new Date().toISOString().split('T')[0],
      })
    }

    if (cabinetsToSave.length === 0) {
      setErrorMsg('Tuyến này đã có Tủ Đỉnh và danh sách tủ nhánh đang trống. Vui lòng bấm "+ Thêm Tủ Nhánh" để khai báo tủ nhánh mới!')
      return
    }

    // Dispatch saving
    if (onAddCabinets) {
      onAddCabinets(cabinetsToSave)
    } else if (onAddCabinet) {
      cabinetsToSave.forEach((c) => onAddCabinet(c))
    }

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Header (Warm Amber/Orange Electrical Theme distinct from Poles) */}
        <div className="p-5 border-b border-amber-600/30 dark:border-amber-900/50 flex items-center justify-between bg-gradient-to-r from-amber-700 via-amber-800 to-orange-800 dark:from-amber-950 dark:via-orange-950 dark:to-slate-950 text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 border border-amber-300/30 flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-5 h-5 text-amber-200 fill-amber-300/30 drop-shadow-xs" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                <span>Đăng Ký Danh Sách Tủ Điện Theo Tuyến</span>
              </h3>
              <p className="text-xs text-amber-100/90 dark:text-amber-200/80 mt-0.5 font-medium">
                Chọn địa bàn, tuyến đường; xác lập thông tin tủ đỉnh và khai báo danh sách tủ nhánh trực tiếp tại một giao diện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleFinalSubmit} className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200 flex-1">
          {/* ================= SECTION 1: ĐỊA BÀN & TUYẾN ĐƯỜNG ================= */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50/90 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                <Route className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>1. Thiết Lập Địa Bàn, Tuyến Đường & Thời Gian Đóng Điện</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                (Thao tác theo thứ tự: Chọn Xã → Chọn Tuyến)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Commune */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>1. Địa bàn Xã / Thị trấn:</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Chọn trước)</span>
                </label>
                <select
                  value={communeId}
                  onChange={(e) => handleCommuneChange(e.target.value)}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 ${
                    !communeId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600'
                  }`}
                >
                  <option value="" disabled className="text-slate-400 font-normal">
                    -- Chọn xã / thị trấn quản lý --
                  </option>
                  {DEFAULT_COMMUNES.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100">
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Segment */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>2. Tuyến đường áp dụng:</span>
                  {communeId && filteredSegments.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">({filteredSegments.length} tuyến)</span>
                  )}
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  disabled={!communeId}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                    !selectedSegmentId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600'
                  }`}
                >
                  <option value="" disabled className="text-slate-400 font-normal">
                    {communeId ? '-- Chọn tuyến đường áp dụng --' : '-- Vui lòng chọn Xã / Thị trấn trước --'}
                  </option>
                  {filteredSegments.map((seg) => (
                    <option key={seg.segment_id} value={seg.segment_id} className="text-slate-900 dark:text-slate-100">
                      {seg.segment_name} ({seg.segment_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Installed Date */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>3. Ngày đóng điện / Lắp đặt:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Định dạng chuẩn)</span>
                </label>
                <DatePicker
                  value={installedDate}
                  onChange={handleDateChange}
                  placeholder="Chọn ngày đóng điện"
                  align="right"
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: TỦ ĐỈNH NGUỒN CHÍNH (ROOT CABINET) ================= */}
          {selectedSegmentId && (
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>2. Tủ Đỉnh Nguồn Chính Của Tuyến (Root Cabinet)</span>
                </div>
                {existingRootCabinet ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ĐÃ CÓ TỦ ĐỈNH HIỆN HỮU
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-1 shadow-2xs">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    CHƯA CÓ TỦ ĐỈNH (CẦN KHAI BÁO)
                  </span>
                )}
              </div>

              {/* Case A: Already has Root Cabinet */}
              {existingRootCabinet ? (
                <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono font-black text-xs shadow-xs">
                        {existingRootCabinet.cabinet_id}
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 text-xs">
                        {existingRootCabinet.cabinet_name}
                      </strong>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Điện áp: <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">{existingRootCabinet.voltage_v || 220}V</span> • Tải: <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{existingRootCabinet.current_load_kw || 15} kW</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2 border-t border-amber-200/50 dark:border-amber-800/40 pt-1.5">
                    <div>
                      Mốc thực địa: <strong className="text-slate-700 dark:text-slate-300">{existingRootCabinet.landmark_note || 'Đầu tuyến'}</strong>
                    </div>
                    <div className="font-mono">
                      GPS: {existingRootCabinet.lat?.toFixed(4)}, {existingRootCabinet.lng?.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                    <span>✓ Tuyến đã có Tủ Đỉnh xuất tuyến. Các tủ nhánh bên dưới sẽ tự động nhận nguồn cấp từ tủ này.</span>
                  </div>
                </div>
              ) : (
                /* Case B: Route does NOT have a Root Cabinet -> Form to define one */
                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl space-y-3">
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    ⚠️ Tuyến này chưa có Tủ Đỉnh nguồn chính. Vui lòng khai báo Tủ Đỉnh để làm nguồn cấp cho toàn bộ tuyến và các tủ nhánh:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Mã định danh Tủ Đỉnh (ID) <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newRootId}
                        onChange={(e) => setNewRootId(e.target.value)}
                        placeholder="VD: CAB-TL8-ROOT"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Tên Tủ Đỉnh mô tả <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newRootName}
                        onChange={(e) => setNewRootName(e.target.value)}
                        placeholder="VD: Tủ Đỉnh Tuyến A (Tỉnh Lộ 8)..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-medium text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Điện áp danh định (V):
                      </label>
                      <select
                        value={newRootVoltage}
                        onChange={(e) => setNewRootVoltage(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="220.0">220.0 V (1 Pha hạ thế)</option>
                        <option value="380.0">380.0 V (3 Pha động lực)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Công suất thiết kế (kW):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newRootLoadKw}
                        onChange={(e) => setNewRootLoadKw(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Vĩ độ (Lat WGS84):
                      </label>
                      <input
                        type="text"
                        value={newRootLat}
                        onChange={(e) => setNewRootLat(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Kinh độ (Lng WGS84):
                      </label>
                      <input
                        type="text"
                        value={newRootLng}
                        onChange={(e) => setNewRootLng(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Mốc thực địa:
                      </label>
                      <input
                        type="text"
                        value={newRootLandmark}
                        onChange={(e) => setNewRootLandmark(e.target.value)}
                        placeholder="VD: Đầu tuyến, cạnh trạm biến áp..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 3: DANH SÁCH TỦ NHÁNH (Amber/Orange Electrical Theme) ================= */}
          <div className="space-y-3">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-amber-600 dark:text-amber-400 drop-shadow-2xs" />
                  <span>3. Danh Sách Tủ Nhánh Thuộc Tuyến</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 shadow-2xs">
                    {subRows.length} tủ đã thiết lập
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tủ phân đoạn bảo vệ phụ tải rẽ nhánh. Bạn có thể tự do thêm, sửa hoặc xóa từng tủ nhánh.
                </p>
              </div>

              {/* "+ Thêm Tủ Nhánh" Button (Amber/Orange gradient) */}
              <button
                type="button"
                onClick={handleAddSubRow}
                disabled={!selectedSegmentId}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md hover:shadow-amber-600/25 transition-all duration-200 flex items-center gap-2 cursor-pointer self-start sm:self-auto group disabled:opacity-40 disabled:pointer-events-none"
              >
                <PlusCircle className="w-4 h-4 text-amber-100 transition-transform duration-200 group-hover:rotate-90" />
                <span>Thêm Tủ Nhánh</span>
              </button>
            </div>

            {/* Dynamic Sub-Cabinets Table */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="max-h-[38vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-amber-50/75 dark:bg-slate-800/90 backdrop-blur-xs sticky top-0 z-10 text-[11px] font-bold text-amber-950 dark:text-amber-200 border-b border-amber-200/80 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-64">Mã & Tên Tủ Nhánh</th>
                      <th className="py-2.5 px-3 w-60">Tọa độ GPS (WGS84)</th>
                      <th className="py-2.5 px-3 w-28">Tải (kW)</th>
                      <th className="py-2.5 px-3">Mốc vị trí (Atlas) / Địa chỉ</th>
                      <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                    {subRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Zap className="w-8 h-8 text-amber-400 dark:text-amber-500 fill-amber-400/20" />
                            <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                              Chưa có tủ nhánh nào trong danh sách
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Bấm vào nút <strong>"Thêm Tủ Nhánh"</strong> ở trên để thêm tủ phân đoạn đầu tiên
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subRows.map((row, index) => (
                        <tr
                          key={row.rowId}
                          className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors duration-150 group"
                        >
                          {/* STT */}
                          <td className="py-2 px-3 text-center font-bold text-slate-400 text-[11px]">
                            {index + 1}
                          </td>

                          {/* Code & Name */}
                          <td className="py-2 px-2.5 space-y-1">
                            <input
                              type="text"
                              value={row.cabinet_id}
                              onChange={(e) => handleUpdateSubRow(row.rowId, 'cabinet_id', e.target.value)}
                              placeholder="Mã tủ (Tùy chọn)"
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded font-mono font-bold text-[11px] text-amber-800 dark:text-amber-400 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="text"
                              value={row.cabinet_name}
                              onChange={(e) => handleUpdateSubRow(row.rowId, 'cabinet_name', e.target.value)}
                              placeholder="Nhập tên tủ nhánh..."
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded text-[11px] font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Lat / Lng */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-1.5 top-1.5 text-[9px] font-bold text-slate-400 select-none">
                                  Lat
                                </span>
                                <input
                                  type="text"
                                  value={row.lat}
                                  onChange={(e) => handleUpdateSubRow(row.rowId, 'lat', e.target.value)}
                                  placeholder="10.97xx"
                                  className="w-full pl-6 pr-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded font-mono text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="relative flex-1">
                                <span className="absolute left-1.5 top-1.5 text-[9px] font-bold text-slate-400 select-none">
                                  Lng
                                </span>
                                <input
                                  type="text"
                                  value={row.lng}
                                  onChange={(e) => handleUpdateSubRow(row.rowId, 'lng', e.target.value)}
                                  placeholder="106.49xx"
                                  className="w-full pl-6 pr-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded font-mono text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </td>

                          {/* Load kW */}
                          <td className="py-2 px-2.5">
                            <div className="relative">
                              <input
                                type="text"
                                value={row.current_load_kw}
                                onChange={(e) => handleUpdateSubRow(row.rowId, 'current_load_kw', e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-slate-400 font-bold">
                                kW
                              </span>
                            </div>
                          </td>

                          {/* Landmark Note */}
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              value={row.landmark_note}
                              onChange={(e) => handleUpdateSubRow(row.rowId, 'landmark_note', e.target.value)}
                              placeholder="Mốc thực địa, vị trí..."
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 hover:border-amber-400 rounded text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Delete */}
                          <td className="py-2 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteSubRow(row.rowId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:scale-110 active:scale-90 transition-all duration-150 cursor-pointer"
                              title="Xóa tủ nhánh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!selectedSegmentId || (Boolean(existingRootCabinet) && subRows.length === 0)}
              className={`px-6 py-2.5 font-bold rounded-xl text-xs shadow-xs hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2 ${
                selectedSegmentId && (!existingRootCabinet || subRows.length > 0)
                  ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white hover:shadow-amber-900/30 cursor-pointer shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
