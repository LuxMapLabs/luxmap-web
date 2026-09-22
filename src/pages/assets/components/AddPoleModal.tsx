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
  Zap,
} from 'lucide-react'
import { DatePicker } from '../../../components/DatePicker'

export interface NewPoleData {
  pole_id: string
  lamp_code?: string
  segment_id: string
  segment_name: string
  commune_id?: string
  commune_name?: string
  cabinet_id: string
  cabinet_name?: string
  feeder_id: string
  lat: number
  lng: number
  lamp_watt: number
  power_source: 'grid'
  fixture_type: 'led_road_lamp'
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
  feeder_id?: string
  segment_id?: string
  segment_ids?: string[]
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

const DEFAULT_SEGMENTS: SegmentOption[] = [
  { segment_id: 'SEG-001', segment_name: 'Tuyến A - Tỉnh Lộ 8', commune_name: 'Xã Phước Hậu', pole_count: 46 },
  { segment_id: 'SEG-002', segment_name: 'Tuyến B - Nguyễn Văn Ni', commune_name: 'Xã Phước Hậu', pole_count: 31 },
  { segment_id: 'SEG-003', segment_name: 'Tuyến C - Huỳnh Văn Cọ', commune_name: 'Xã Mỹ Hạnh Bắc', pole_count: 26 },
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

  // Top Section States
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [selectedCabinetId, setSelectedCabinetId] = useState('')
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

  // Current active metadata
  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)
  const resolvedSegmentName = currentSegment?.segment_name || ''
  const availableCabinetsOnSegment = (availableCabinets || []).filter(
    (cab) =>
      cab.segment_id === selectedSegmentId ||
      (cab.segment_ids && cab.segment_ids.includes(selectedSegmentId))
  )
  const currentCabinet = availableCabinetsOnSegment.find((c) => c.cabinet_id === selectedCabinetId)

  // Handle segment change: reset cabinet selection
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setSelectedCabinetId('')
    setErrorMsg(null)
  }

  // Reset all fields to empty/null when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setSelectedSegmentId('')
      setSelectedCabinetId('')
      setDefaultWarranty('')
      setRows([])
    }
  }, [isOpen])

  if (!isOpen) return null

  // Handler: Add New Pole Row at top/end
  const handleAddRow = () => {
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm cột đèn!')
      return
    }

    if (!selectedCabinetId) {
      setErrorMsg('Vui lòng chọn Tủ điện điều khiển trực tiếp quản lý các cột đèn này!')
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
      atlas: `Trụ số ${rows.length + 1} thuộc ${currentCabinet?.cabinet_name || selectedCabinetId}`,
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

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1!')
      return
    }

    if (!selectedCabinetId) {
      setErrorMsg('Vui lòng chọn Tủ điện điều khiển trực tiếp quản lý các cột đèn!')
      return
    }

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

      const parsedLat = parseFloat(row.lat)
      const parsedLng = parseFloat(row.lng)

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedId}): Tọa độ GPS không hợp lệ (Vĩ độ và Kinh độ phải là số)!`)
        return
      }

      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedId}): Tọa độ vượt quá phạm vi địa lý (Lat: -90..90, Lng: -180..180)!`)
        return
      }

      validatedDataList.push({
        pole_id: trimmedId,
        segment_id: selectedSegmentId,
        segment_name: resolvedSegmentName || selectedSegmentId,
        commune_name: currentSegment?.commune_name,
        cabinet_id: selectedCabinetId,
        cabinet_name: currentCabinet?.cabinet_name,
        feeder_id: currentCabinet?.feeder_id || `FDR-${selectedCabinetId}`,
        lat: parsedLat,
        lng: parsedLng,
        lamp_watt: row.lamp_watt || 100,
        power_source: 'grid',
        fixture_type: 'led_road_lamp',
        warranty_expiry: defaultWarranty || '2026-12-31',
        near_sensitive_poi: !!row.near_sensitive_poi,
        atlas: row.atlas.trim() || `Trụ đèn thuộc ${currentCabinet?.cabinet_name || selectedCabinetId}`,
      })
    }

    if (onAddPoles) {
      onAddPoles(validatedDataList)
    } else if (onAddPole && validatedDataList.length > 0) {
      onAddPole(validatedDataList[0])
    }

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header Modal */}
        <div className="p-5 bg-gradient-to-r from-[#172b4d] via-[#1f3864] to-[#25457a] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Đăng Ký Danh Sách Cột Đèn Theo Tuyến
              </h3>
              <p className="text-xs text-slate-200 dark:text-slate-400 mt-0.5">
                Chọn tuyến đường, tủ điện điều khiển và khai báo hàng loạt danh sách cột đèn trực tiếp
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
          {/* ================= SECTION 1: THÔNG TIN TUYẾN ĐƯỜNG & TỦ ĐIỆN ================= */}
          <div className="p-4 bg-slate-50/70 hover:bg-slate-50/90 dark:bg-slate-800/50 dark:hover:bg-slate-800/70 rounded-2xl border border-slate-200/90 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600 space-y-3 shadow-2xs hover:shadow-xs transition-all duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                <Route className="w-4 h-4 text-[#1f3864] dark:text-blue-400 drop-shadow-2xs" />
                <span>1. Thiết Lập Tuyến Đường, Tủ Điện & Thông Số Chung</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                (1 Cột đèn được quản lý bởi duy nhất 1 Tủ điện)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Select Segment */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>1. Tuyến đường áp dụng:</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">(Bắt buộc)</span>
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] ${
                    !selectedSegmentId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                  }`}
                >
                  <option value="" disabled className="text-slate-400 font-normal">
                    -- Chọn tuyến đường áp dụng --
                  </option>
                  {segmentList.map((seg) => (
                    <option key={seg.segment_id} value={seg.segment_id} className="text-slate-900 dark:text-slate-100">
                      {seg.segment_name} ({seg.segment_id} • {seg.pole_count || 0} cột)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Cabinet */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>2. Tủ điện điều khiển trực tiếp:</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">(1 Cột - 1 Tủ)</span>
                </label>
                <select
                  value={selectedCabinetId}
                  onChange={(e) => {
                    setSelectedCabinetId(e.target.value)
                    setErrorMsg(null)
                  }}
                  disabled={!selectedSegmentId}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                    !selectedCabinetId
                      ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                  }`}
                >
                  <option value="" disabled className="text-slate-400 font-normal">
                    {selectedSegmentId
                      ? availableCabinetsOnSegment.length > 0
                        ? '-- Chọn tủ điện quản lý --'
                        : '-- Tuyến này chưa có tủ điện --'
                      : '-- Vui lòng chọn Tuyến trước --'}
                  </option>
                  {availableCabinetsOnSegment.map((cab) => (
                    <option key={cab.cabinet_id} value={cab.cabinet_id} className="text-slate-900 dark:text-slate-100">
                      ⚡️ {cab.cabinet_name} ({cab.cabinet_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Warranty Date */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>3. Hạn bảo hành mặc định:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Áp dụng cả lô)</span>
                </label>
                <DatePicker
                  value={warrantyDate}
                  onChange={handleWarrantyChange}
                  placeholder="Chọn hạn bảo hành"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: DANH SÁCH CỘT ĐÈN ================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>2. Danh Sách Cột Đèn Thuộc Tủ</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {rows.length} cột đã thêm
                </span>
                {currentCabinet && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-500" />
                    <span>{currentCabinet.cabinet_name}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Thêm Cột Mới</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 sticky top-0 z-10 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-60">Tọa Độ GPS (Vĩ độ / Kinh độ)</th>
                      <th className="py-2.5 px-3 w-28">Công Suất</th>
                      <th className="py-2.5 px-3">Ghi Chú Mốc Thực Địa (Atlas)</th>
                      <th className="py-2.5 px-3 w-20 text-center">Khu Nhạy Cảm</th>
                      <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                            <p className="font-medium text-xs">Chưa có cột đèn nào trong danh sách.</p>
                            <p className="text-[11px] text-slate-400">
                              Chọn Tuyến đường, Tủ điện ở trên và bấm <strong className="text-emerald-600 font-bold">"+ Thêm Cột Mới"</strong> để bắt đầu khai báo.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr
                          key={row.rowId}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors duration-100 group"
                        >
                          {/* Row Index */}
                          <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* Lat / Lng */}
                          <td className="py-2 px-3">
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
                          <td className="py-2 px-3">
                            <select
                              value={row.lamp_watt}
                              onChange={(e) => handleUpdateRow(row.rowId, 'lamp_watt', Number(e.target.value))}
                              className="w-full p-1.5 bg-white dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] cursor-pointer transition-all duration-150"
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
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.atlas}
                              onChange={(e) => handleUpdateRow(row.rowId, 'atlas', e.target.value)}
                              placeholder="Mốc thực tế: đối diện nhà số X..."
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                            />
                          </td>

                          {/* Sensitive POI */}
                          <td className="py-2 px-3 text-center">
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
                          <td className="py-2 px-3 text-center">
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
              <span>Lưu Danh Sách Cột</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
