import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  PlusCircle,
  X,
  MapPin,
  CheckCircle2,
  Trash2,
  Route,
  Layers,
  AlertCircle,
} from 'lucide-react'
import { DatePicker } from '../../../components/DatePicker'

export interface NewPoleData {
  pole_id: string
  segment_id: string
  segment_name: string
  commune_id: string
  commune_name: string
  lat: number
  lng: number
  lamp_watt: number
  power_source: 'grid'
  fixture_type: 'led_road_lamp'
  feeder_id: string
  warranty_expiry: string
  near_sensitive_poi: boolean
  atlas: string
}

export interface SegmentOption {
  segment_id: string
  segment_name: string
  commune_name?: string
  pole_count?: number
}

export interface CabinetOption {
  cabinet_id: string
  cabinet_name: string
  segment_id?: string
  segment_ids?: string[]
  role?: 'root_cabinet' | 'sub_cabinet' | string
}

interface AddPoleModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPole?: (data: NewPoleData) => void
  onAddPoles: (poles: NewPoleData[]) => void
  existingPoleCount: number
  availableSegments?: SegmentOption[]
  availableCabinets?: CabinetOption[]
}

interface PoleRowDraft {
  rowId: string
  pole_id: string
  lat: string
  lng: string
  lamp_watt: number
  atlas: string
  near_sensitive_poi: boolean
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

export const AddPoleModal: React.FC<AddPoleModalProps> = ({
  isOpen,
  onClose,
  onAddPole,
  onAddPoles,
  existingPoleCount,
  availableSegments,
  availableCabinets,
}) => {
  // Segments & Cabinets list
  const segmentList = availableSegments && availableSegments.length > 0 ? availableSegments : DEFAULT_SEGMENTS

  // Top Section States (Empty by default until user selects)
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [communeId, setCommuneId] = useState('')
  const [defaultWarranty, setDefaultWarranty] = useState('')

  const warrantyDate = defaultWarranty ? new Date(defaultWarranty.replace(/-/g, '/')) : null

  const handleWarrantyChange = (date: Date | null) => {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      setDefaultWarranty(`${y}-${m}-${d}`)
    } else {
      setDefaultWarranty('')
    }
  }

  // Bottom Section: Pole Rows State
  const [rows, setRows] = useState<PoleRowDraft[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Handle Commune change: reset segment selection
  const handleCommuneChange = (newCommuneId: string) => {
    setCommuneId(newCommuneId)
    setSelectedSegmentId('')
    setErrorMsg(null)
  }

  // Handle segment change without auto-filling other fields
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setErrorMsg(null)
  }

  // Reset all fields to empty/null when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setSelectedSegmentId('')
      setCommuneId('')
      setDefaultWarranty('')
      setRows([])
    }
  }, [isOpen])

  if (!isOpen) return null

  // Current active metadata
  const currentCommune = DEFAULT_COMMUNES.find((c) => c.id === communeId)
  const filteredSegments = segmentList.filter((s) => {
    if (!communeId || !currentCommune) return true
    if (!s.commune_name) return true
    return s.commune_name.toLowerCase().includes(currentCommune.name.toLowerCase())
  })
  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)
  const resolvedSegmentName = currentSegment?.segment_name || ''

  // Handler: Add New Pole Row at top/end
  const handleAddRow = () => {
    setErrorMsg(null)

    if (!communeId) {
      setErrorMsg('Vui lòng chọn Địa bàn Xã / Thị trấn ở mục 1 trước khi thêm cột!')
      return
    }

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm cột đèn!')
      return
    }

    // Calculate incremental coordinates from previous row if available
    let nextLat = ''
    let nextLng = ''
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1]
      const lastLat = parseFloat(lastRow.lat)
      const lastLng = parseFloat(lastRow.lng)
      if (!isNaN(lastLat) && !isNaN(lastLng)) {
        // approximate ~30-35m spacing along line
        nextLat = (lastLat + 0.00028).toFixed(6)
        nextLng = (lastLng + 0.00025).toFixed(6)
      }
    } else {
      nextLat = '10.9715'
      nextLng = '106.4925'
    }

    const newRow: PoleRowDraft = {
      rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pole_id: '',
      lat: nextLat,
      lng: nextLng,
      lamp_watt: 100,
      atlas: `Trụ số ${rows.length + 1} thuộc tuyến`,
      near_sensitive_poi: false,
    }

    setRows((prev) => {
      const updated = [...prev, newRow]
      return updated.map((r, idx) => ({
        ...r,
        pole_id: `POLE-${String(existingPoleCount + idx + 1).padStart(4, '0')}`,
      }))
    })
  }

  // Handler: Delete a Row & Re-sequence IDs
  const handleDeleteRow = (rowIdToDelete: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.rowId !== rowIdToDelete)
      return filtered.map((r, idx) => ({
        ...r,
        pole_id: `POLE-${String(existingPoleCount + idx + 1).padStart(4, '0')}`,
      }))
    })
  }

  // Handler: Update Row Field
  const handleUpdateRow = <K extends keyof PoleRowDraft>(rowId: string, field: K, value: PoleRowDraft[K]) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    )
  }

  // Handler: Final Submit & Batch Save
  const handleBatchSubmit = (e: React.FormEvent) => {
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

    if (rows.length === 0) {
      setErrorMsg('Danh sách đang trống. Vui lòng bấm "Thêm Cột Mới" để thêm ít nhất 1 cột đèn!')
      return
    }

    // Auto-resolve root feeder cabinet for the segment
    const rootCab = (availableCabinets || []).find(
      (cab) =>
        (cab.role === 'root_cabinet' || cab.cabinet_id.includes('ROOT')) &&
        (cab.segment_id === selectedSegmentId || (cab.segment_ids && cab.segment_ids.includes(selectedSegmentId)))
    )
    const resolvedFeederId =
      rootCab?.cabinet_id ||
      (selectedSegmentId === 'SEG-002'
        ? 'CAB-NVN-ROOT'
        : selectedSegmentId === 'SEG-003'
        ? 'CAB-HVC-ROOT'
        : 'CAB-TL8-ROOT')

    if (rows.length === 0) {
      setErrorMsg('Danh sách đang trống. Vui lòng bấm "Thêm Cột Mới" để thêm ít nhất 1 cột đèn!')
      return
    }

    // Validate rows
    const seenIds = new Set<string>()
    const validatedDataList: NewPoleData[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const trimmedId = (
        row.pole_id.trim() || `POLE-${String(existingPoleCount + i + 1).padStart(4, '0')}`
      ).toUpperCase()

      if (seenIds.has(trimmedId)) {
        setErrorMsg(`Hàng #${i + 1}: Mã cột "${trimmedId}" bị trùng lặp trong danh sách!`)
        return
      }
      seenIds.add(trimmedId)

      const latNum = parseFloat(row.lat)
      const lngNum = parseFloat(row.lng)
      if (isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedId}): Tọa độ GPS (Vĩ độ / Kinh độ) không hợp lệ! Vui lòng nhập số hợp lệ.`)
        return
      }

      validatedDataList.push({
        pole_id: trimmedId,
        segment_id: selectedSegmentId,
        segment_name: resolvedSegmentName,
        commune_id: communeId,
        commune_name: currentCommune?.name || '',
        lat: latNum,
        lng: lngNum,
        lamp_watt: row.lamp_watt,
        power_source: 'grid',
        fixture_type: 'led_road_lamp',
        feeder_id: resolvedFeederId,
        warranty_expiry: defaultWarranty,
        near_sensitive_poi: row.near_sensitive_poi,
        atlas: row.atlas.trim(),
      })
    }

    // Call onAddPoles (and onAddPole fallback if single)
    onAddPoles(validatedDataList)
    if (onAddPole && validatedDataList.length === 1) {
      onAddPole(validatedDataList[0])
    }

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#1f3864] dark:bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Đăng Ký Danh Sách Cột Đèn Theo Tuyến
              </h3>
              <p className="text-xs text-slate-200 dark:text-slate-400 mt-0.5">
                Chọn địa bàn, tuyến đường và khai báo hàng loạt danh sách cột đèn trực tiếp tại một giao diện
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

        {/* Modal Scrollable Body */}
        <form onSubmit={handleBatchSubmit} className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200 flex-1">
          {/* ================= SECTION 1: THÔNG TIN ĐỊA BÀN & TUYẾN ĐƯỜNG ================= */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50/90 dark:bg-slate-800/50 dark:hover:bg-slate-800/70 rounded-2xl border border-slate-200/90 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600 space-y-3 shadow-2xs hover:shadow-xs transition-all duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                <Route className="w-4 h-4 text-[#1f3864] dark:text-blue-400 drop-shadow-2xs" />
                <span>1. Thiết Lập Địa Bàn, Tuyến Đường & Thông Số Kỹ Thuật Chung</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                (Thao tác theo thứ tự: Chọn Xã → Chọn Tuyến)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Commune - Select First */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>1. Địa bàn Xã / Thị trấn:</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">(Chọn trước)</span>
                </label>
                <select
                  value={communeId}
                  onChange={(e) => handleCommuneChange(e.target.value)}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] ${
                    !communeId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
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

              {/* 2. Select Segment - Filtered by Commune */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>2. Tuyến đường áp dụng:</span>
                  {communeId && filteredSegments.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">({filteredSegments.length} tuyến khả dụng)</span>
                  )}
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  disabled={!communeId}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                    !selectedSegmentId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                  }`}
                >
                  <option value="" disabled className="text-slate-400 font-normal">
                    {communeId ? '-- Chọn tuyến đường áp dụng --' : '-- Vui lòng chọn Xã / Thị trấn trước --'}
                  </option>
                  {filteredSegments.map((seg) => (
                    <option key={seg.segment_id} value={seg.segment_id} className="text-slate-900 dark:text-slate-100">
                      {seg.segment_name} ({seg.segment_id} • {seg.pole_count || 0} cột)
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Warranty Expiry */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>3. Hạn bảo hành chung:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <DatePicker
                  value={warrantyDate}
                  onChange={handleWarrantyChange}
                  placeholder="Chọn hạn bảo hành"
                  align="right"
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: DANH SÁCH CỘT ĐÈN THUỘC TUYẾN ================= */}
          <div className="space-y-3">
            {/* Action Toolbar on Top of the List */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 drop-shadow-2xs" />
                  <span>2. Danh Sách Cột Đèn Thuộc Tuyến</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 shadow-2xs">
                    {rows.length} cột đã thiết lập
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tọa độ tự động tịnh tiến theo tuyến. Bạn có thể tự do sửa đổi hoặc xóa từng hàng.
                </p>
              </div>

              {/* "Thêm Cột Mới" Button right above the table */}
              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md hover:shadow-emerald-600/20 transition-all duration-200 flex items-center gap-2 cursor-pointer self-start sm:self-auto group"
              >
                <PlusCircle className="w-4 h-4 text-emerald-100 transition-transform duration-200 group-hover:rotate-90" />
                <span>Thêm Cột Mới</span>
              </button>
            </div>

            {/* Dynamic Pole Rows Table */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="max-h-[42vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs sticky top-0 z-10 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200/90 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-64">Tọa độ GPS (WGS84)</th>
                      <th className="py-2.5 px-3 w-32">Công suất</th>
                      <th className="py-2.5 px-3">Mốc vị trí (Atlas) / Địa chỉ</th>
                      <th className="py-2.5 px-3 w-24 text-center">Nhạy cảm</th>
                      <th className="py-2.5 px-3 w-14 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                              Chưa có cột nào trong danh sách
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Bấm vào nút <strong>"Thêm Cột Mới"</strong> ở trên để thêm cột đầu tiên
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr
                          key={row.rowId}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-150 animate-in fade-in-50 slide-in-from-top-1 duration-200 group"
                        >
                          {/* STT */}
                          <td className="py-2 px-3 text-center font-bold text-slate-400 text-[11px]">
                            {index + 1}
                          </td>

                          {/* Lat / Lng */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-2 text-[9px] font-bold text-slate-400 select-none">
                                  Lat
                                </span>
                                <input
                                  type="text"
                                  value={row.lat}
                                  onChange={(e) => handleUpdateRow(row.rowId, 'lat', e.target.value)}
                                  placeholder="10.9715"
                                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg font-mono text-[11.5px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                                />
                              </div>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-2 text-[9px] font-bold text-slate-400 select-none">
                                  Lng
                                </span>
                                <input
                                  type="text"
                                  value={row.lng}
                                  onChange={(e) => handleUpdateRow(row.rowId, 'lng', e.target.value)}
                                  placeholder="106.4925"
                                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg font-mono text-[11.5px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                                />
                              </div>
                            </div>
                          </td>

                          {/* Wattage */}
                          <td className="py-2 px-2.5">
                            <select
                              value={row.lamp_watt}
                              onChange={(e) => handleUpdateRow(row.rowId, 'lamp_watt', Number(e.target.value))}
                              className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] cursor-pointer transition-all duration-150"
                            >
                              <option value={50}>50W</option>
                              <option value={60}>60W</option>
                              <option value={100}>100W</option>
                              <option value={120}>120W</option>
                              <option value={150}>150W</option>
                              <option value={200}>200W</option>
                            </select>
                          </td>

                          {/* Atlas Landmark */}
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              value={row.atlas}
                              onChange={(e) => handleUpdateRow(row.rowId, 'atlas', e.target.value)}
                              placeholder="Mốc thực tế: đối diện nhà số X..."
                              className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                            />
                          </td>

                          {/* Sensitive POI */}
                          <td className="py-2 px-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.near_sensitive_poi}
                              onChange={(e) =>
                                handleUpdateRow(row.rowId, 'near_sensitive_poi', e.target.checked)
                              }
                              className="w-4 h-4 rounded text-[#1f3864] accent-[#1f3864] hover:scale-110 transition-transform cursor-pointer"
                              title="Gần trường học, bệnh viện..."
                            />
                          </td>

                          {/* Delete Button per row */}
                          <td className="py-2 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.rowId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:scale-110 active:scale-90 transition-all duration-150 cursor-pointer"
                              title="Xóa cột này khỏi danh sách"
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
              disabled={rows.length === 0}
              className={`px-6 py-2.5 font-bold rounded-xl text-xs shadow-xs hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2 ${
                rows.length > 0
                  ? 'bg-gradient-to-r from-[#172b4d] to-[#25457a] hover:from-[#1f3864] hover:to-[#2e5596] text-white hover:shadow-blue-950/25 cursor-pointer'
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
