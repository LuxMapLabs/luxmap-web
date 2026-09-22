import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Zap,
  CheckCircle2,
  Trash2,
  Route,
  AlertCircle,
  PlusCircle,
  Cpu,
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
  feeder_id?: string
  segment_id?: string
  segment_ids?: string[]
  segment_name?: string
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
  feeder_id: string
  segment_id: string
  segment_name: string
  voltage_v: number
  current_load_kw: number
  total_poles_managed: number
  landmark_note: string
  lat: number
  lng: number
  installed_at: string
}

interface CabinetRowDraft {
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

const DEFAULT_SEGMENTS: SegmentOption[] = [
  { segment_id: 'SEG-001', segment_name: 'Tuyến A - Tỉnh Lộ 8', commune_name: 'Xã Phước Hậu', pole_count: 46 },
  { segment_id: 'SEG-002', segment_name: 'Tuyến B - Nguyễn Văn Ni', commune_name: 'Xã Phước Hậu', pole_count: 31 },
  { segment_id: 'SEG-003', segment_name: 'Tuyến C - Huỳnh Văn Cọ', commune_name: 'Xã Mỹ Hạnh Bắc', pole_count: 26 },
]

export const AddCabinetModal: React.FC<AddCabinetModalProps> = ({
  isOpen,
  onClose,
  onAddCabinet,
  onAddCabinets,
  existingCount,
  availableSegments,
  availableCabinets = [],
}) => {
  const segmentList = availableSegments && availableSegments.length > 0 ? availableSegments : DEFAULT_SEGMENTS

  // Top Section: Segment, Date
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [installedDateStr, setInstalledDateStr] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // Cabinets Rows Draft List
  const [rows, setRows] = useState<CabinetRowDraft[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)
  const resolvedSegmentName = currentSegment?.segment_name || ''

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

  // Handle segment change
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setRows([])
    setErrorMsg(null)
  }

  // Handle Add Cabinet Row (Auto-generates ID & Name, starts clean for GPS and note)
  const handleAddRow = () => {
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm tủ điện!')
      return
    }

    const nextIdx = rows.length
    const segCabsCount = (availableCabinets || []).filter((c) => c.segment_id === selectedSegmentId).length
    const letter = String.fromCharCode(65 + segCabsCount + nextIdx)
    const segSuffix = selectedSegmentId.replace(/^SEG-0*/, '')
    const autoCabId = `CAB-TL${segSuffix}-${letter}`
    const defaultName = resolvedSegmentName
      ? `Tủ ${letter} - ${resolvedSegmentName.split(' - ')[1] || resolvedSegmentName}`
      : `Tủ ${letter}`

    const newRow: CabinetRowDraft = {
      rowId: `cab-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cabinet_id: autoCabId,
      cabinet_name: defaultName,
      voltage_v: 220,
      current_load_kw: '10.0',
      lat: '',
      lng: '',
      landmark_note: '',
    }

    setRows((prev) => [...prev, newRow])
  }

  // Handle Delete Row
  const handleDeleteRow = (rowIdToDelete: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowIdToDelete))
  }

  // Handle Update Row Field
  const handleUpdateRow = <K extends keyof CabinetRowDraft>(
    rowId: string,
    field: K,
    value: CabinetRowDraft[K]
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    )
  }

  // Reset form when opening modal
  useEffect(() => {
    if (isOpen) {
      setSelectedSegmentId('')
      setRows([])
      setErrorMsg(null)
    }
  }, [isOpen, existingCount])

  if (!isOpen) return null

  // Handle Final Submit
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1!')
      return
    }

    if (rows.length === 0) {
      setErrorMsg('Danh sách tủ đang trống. Vui lòng bấm "+ Thêm Tủ Điện" để thêm ít nhất 1 tủ điện!')
      return
    }

    const cabinetsToSave: NewCabinetData[] = []
    const segCabsCount = (availableCabinets || []).filter((c) => c.segment_id === selectedSegmentId).length

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const letter = String.fromCharCode(65 + segCabsCount + i)
      const segSuffix = selectedSegmentId.replace(/^SEG-0*/, '')
      const autoId = `CAB-TL${segSuffix}-${letter}`
      const trimmedName = row.cabinet_name.trim() || `Tủ ${letter}`

      const parsedLat = parseFloat(row.lat)
      const parsedLng = parseFloat(row.lng)

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedName}): Vui lòng nhập Tọa độ GPS (Vĩ độ và Kinh độ)!`)
        return
      }

      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedName}): Tọa độ GPS vượt quá phạm vi địa lý hợp lệ!`)
        return
      }

      const feederId = `FDR-TL${segSuffix}-${letter}`

      cabinetsToSave.push({
        cabinet_id: autoId,
        cabinet_name: trimmedName,
        feeder_id: feederId,
        segment_id: selectedSegmentId,
        segment_name: resolvedSegmentName || selectedSegmentId,
        voltage_v: row.voltage_v || 220,
        current_load_kw: parseFloat(row.current_load_kw) || 10.0,
        total_poles_managed: 0,
        landmark_note: row.landmark_note.trim() || `Bệ tủ vỉa hè ${trimmedName} trên tuyến ${resolvedSegmentName}`,
        lat: parsedLat,
        lng: parsedLng,
        installed_at: installedDateStr || new Date().toISOString().split('T')[0],
      })
    }

    // Dispatch saving
    if (onAddCabinets) {
      onAddCabinets(cabinetsToSave)
    } else if (onAddCabinet && cabinetsToSave.length > 0) {
      onAddCabinet(cabinetsToSave[0])
    }

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-purple-900/40 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header Modal - Distinctive Technical Purple / Indigo Theme */}
        <div className="p-5 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#581c87] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Cpu className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Khai Báo Danh Sách Tủ Điện Điều Khiển Tuyến
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Thiết lập các tủ điện cấp nguồn trên tuyến đường (Mỗi tủ cấp nguồn cho 1 tuyến điện độc lập)
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
        <form onSubmit={handleFinalSubmit} className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200 flex-1">
          {/* ================= SECTION 1: THÔNG TIN TUYẾN ĐƯỜNG & NGÀY VẬN HÀNH ================= */}
          <div className="p-4 bg-purple-50/50 hover:bg-purple-50/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 rounded-2xl border border-purple-200/80 hover:border-purple-300 dark:border-purple-900/50 space-y-3 shadow-2xs transition-all duration-200">
            <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-900/40 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-purple-950 dark:text-purple-200 text-xs">
                <Route className="w-4 h-4 text-purple-700 dark:text-purple-400 drop-shadow-2xs" />
                <span>1. Thiết Lập Tuyến Đường Cài Đặt Tủ Điện</span>
              </div>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">
                (1 Tuyến đường có thể có nhiều tủ điện phụ trách các lộ độc lập)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Segment */}
              <div className="space-y-1">
                <label className="font-bold text-purple-950 dark:text-purple-200 text-xs flex items-center justify-between">
                  <span>1. Tuyến đường áp dụng:</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">(Bắt buộc)</span>
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  className={`w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 ${
                    !selectedSegmentId
                      ? 'text-slate-400 border-purple-200 dark:border-purple-900/60'
                      : 'text-slate-900 dark:text-slate-100 border-purple-300 hover:border-purple-400 dark:border-purple-800'
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

              {/* Installed Date */}
              <div className="space-y-1">
                <label className="font-semibold text-purple-950 dark:text-purple-200 text-xs flex items-center justify-between">
                  <span>2. Ngày đưa vào vận hành:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Áp dụng chung)</span>
                </label>
                <DatePicker
                  value={installedDate}
                  onChange={handleDateChange}
                  placeholder="Chọn ngày vận hành"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: DANH SÁCH TỦ ĐIỆN THUỘC TUYẾN ================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>2. Danh Sách Tủ Điện Thuộc Tuyến</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {rows.length} tủ điện
                </span>
                {resolvedSegmentName && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    trên <strong className="text-purple-700 dark:text-purple-400">{resolvedSegmentName}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Thêm Tủ Điện</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="border border-purple-200/80 dark:border-purple-900/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 sticky top-0 z-10 font-bold border-b border-purple-200 dark:border-purple-900/60">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-52">Tên Tủ Điện</th>
                      <th className="py-2.5 px-3 w-28">Điện Áp</th>
                      <th className="py-2.5 px-3 w-28">Công Suất (kW)</th>
                      <th className="py-2.5 px-3 w-60">Tọa Độ GPS (Lat / Lng)</th>
                      <th className="py-2.5 px-3">Ghi Chú Mốc Thực Địa</th>
                      <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Zap className="w-8 h-8 text-purple-300 dark:text-purple-800 stroke-[1.5]" />
                            <p className="font-medium text-xs">Chưa có tủ điện nào trong danh sách.</p>
                            <p className="text-[11px] text-slate-400">
                              Chọn Tuyến đường ở trên và bấm <strong className="text-purple-600 font-bold">"+ Thêm Tủ Điện"</strong> để bắt đầu khai báo.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr
                          key={row.rowId}
                          className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors duration-100 group"
                        >
                          {/* Row Index */}
                          <td className="py-2 px-3 text-center text-purple-600 dark:text-purple-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* Cabinet Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.cabinet_name}
                              onChange={(e) => handleUpdateRow(row.rowId, 'cabinet_name', e.target.value)}
                              placeholder="Tủ A - Tỉnh Lộ 8"
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 dark:hover:border-purple-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-150"
                            />
                          </td>

                          {/* Voltage */}
                          <td className="py-2 px-3">
                            <select
                              value={row.voltage_v}
                              onChange={(e) => handleUpdateRow(row.rowId, 'voltage_v', Number(e.target.value))}
                              className="w-full p-1.5 bg-white dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                            >
                              <option value={220}>220V</option>
                              <option value={380}>380V</option>
                            </select>
                          </td>

                          {/* Load kW */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={row.current_load_kw}
                              onChange={(e) => handleUpdateRow(row.rowId, 'current_load_kw', e.target.value)}
                              placeholder="10.5"
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
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
                                  placeholder="10.9701"
                                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg font-mono text-[11.5px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                                  placeholder="106.4896"
                                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg font-mono text-[11.5px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                              </div>
                            </div>
                          </td>

                          {/* Landmark Note */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.landmark_note}
                              onChange={(e) => handleUpdateRow(row.rowId, 'landmark_note', e.target.value)}
                              placeholder="Mốc thực tế: ngã ba..."
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                          </td>

                          {/* Delete Button */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.rowId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:scale-110 active:scale-90 transition-all duration-150 cursor-pointer"
                              title="Xóa tủ này"
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
          <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-purple-100 dark:border-purple-950/80 bg-purple-50/40 dark:bg-purple-950/20 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
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
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white hover:shadow-purple-950/25 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Danh Sách Tủ</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
