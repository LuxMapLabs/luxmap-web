import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  X,
  Zap,
  CheckCircle2,
  Trash2,
  Route,
  AlertCircle,
  PlusCircle,
  Cpu,
  MapPin,
  HelpCircle,
} from 'lucide-react'
import { DatePicker } from '../../../../../components/DatePicker'
import { AddCabinetMap } from './AddCabinetMap'
import { parseLineStringWkt } from '../../../../../utils/gis-map/routeUtils'
import { fetchMapLayersRequest } from '../../../../../feature/map/mapSlice'
import type { RootState } from '../../../../../redux/rootReducer'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'

interface CabinetRowDraft {
  rowId: string
  cabinet_id: string
  cabinet_name: string
  lat: string
  lng: string
}

interface AddCabinetModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCabinet?: (data: CabinetListItem) => void
  onAddCabinets?: (cabinets: CabinetListItem[]) => void
  existingCount: number
  availableSegments?: SegmentListItem[]
  availableCabinets?: CabinetListItem[]
}

export const AddCabinetModal: React.FC<AddCabinetModalProps> = ({
  isOpen,
  onClose,
  onAddCabinet,
  onAddCabinets,
  availableSegments,
  availableCabinets = [],
}) => {
  const dispatch = useDispatch()
  const segmentList = availableSegments || []

  // Map segments from Redux for real GIS line
  const mapSegments = useSelector((state: RootState) => state.map.segments)

  // Top Section: Segment, Date
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [installedDateStr, setInstalledDateStr] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // Cabinets Rows Draft List
  const [rows, setRows] = useState<CabinetRowDraft[]>([])
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)
  const resolvedSegmentName = currentSegment?.segment_name || ''

  // Fetch map layers if empty
  useEffect(() => {
    if (isOpen && (!mapSegments || mapSegments.length === 0)) {
      dispatch(fetchMapLayersRequest())
    }
  }, [isOpen, mapSegments, dispatch])

  // Extract real coordinates of current route
  const segmentCoords = useMemo<[number, number][]>(() => {
    if (!selectedSegmentId) return []

    // 1. PostGIS backend LineString
    const mapSeg = mapSegments.find((s) => s.properties?.segment_id === selectedSegmentId)
    if (mapSeg && mapSeg.geometry?.type === 'LineString' && Array.isArray(mapSeg.geometry.coordinates)) {
      const valid = mapSeg.geometry.coordinates.filter(
        (c) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
      ) as [number, number][]
      if (valid.length >= 2) return valid
    }

    // 2. Fallback to geom_wkt
    if (currentSegment && 'geom_wkt' in currentSegment && typeof currentSegment.geom_wkt === 'string') {
      const parsed = parseLineStringWkt(currentSegment.geom_wkt)
      if (parsed.length >= 2) return parsed
    }

    return []
  }, [selectedSegmentId, mapSegments, currentSegment])

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

  // Handle Segment Change: recalculate IDs
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setErrorMsg(null)

    const seg = segmentList.find((s) => s.segment_id === newSegmentId)
    const segName = seg?.segment_name || newSegmentId

    let segCode = 'TL8'
    if (segName.includes('Nguyễn Văn Ni') || newSegmentId.includes('002')) segCode = 'NVN'
    else if (segName.includes('Huỳnh Văn Cọ') || newSegmentId.includes('003')) segCode = 'HVC'

    setRows((prev) =>
      prev.map((row, idx) => {
        const letter = String.fromCharCode(65 + idx)
        return {
          ...row,
          cabinet_id: `CAB-${segCode}-${letter}`,
          cabinet_name: `Tủ ${letter} - ${segName}`,
        }
      })
    )
  }

  // Reset when open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setSelectedSegmentId('')
      setRows([])
      setSelectedRowId(null)
    }
  }, [isOpen])

  // Add Row
  const handleAddRow = useCallback((coords?: { lat: number; lng: number }) => {
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm tủ điện!')
      return
    }

    const nextIndex = rows.length
    const letter = String.fromCharCode(65 + (nextIndex % 26))

    let segCode = 'TL8'
    if (resolvedSegmentName.includes('Nguyễn Văn Ni') || selectedSegmentId.includes('002')) segCode = 'NVN'
    else if (resolvedSegmentName.includes('Huỳnh Văn Cọ') || selectedSegmentId.includes('003')) segCode = 'HVC'

    const autoCabinetId = `CAB-${segCode}-${letter}`
    const autoCabinetName = `Tủ ${letter} - ${resolvedSegmentName || selectedSegmentId}`

    let baseLat = 10.9701
    let baseLng = 106.4896

    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      baseLat = coords.lat
      baseLng = coords.lng
    } else if (segmentCoords.length > 0) {
      // Place near start of route
      baseLng = segmentCoords[0][0]
      baseLat = segmentCoords[0][1]
    } else if (rows.length > 0) {
      const lastRow = rows[rows.length - 1]
      const lLat = parseFloat(lastRow.lat)
      const lLng = parseFloat(lastRow.lng)
      if (!isNaN(lLat) && !isNaN(lLng)) {
        baseLat = lLat + 0.002
        baseLng = lLng + 0.002
      }
    }

    const newId = `cab-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newDraft: CabinetRowDraft = {
      rowId: newId,
      cabinet_id: autoCabinetId,
      cabinet_name: autoCabinetName,
      lat: baseLat.toFixed(6),
      lng: baseLng.toFixed(6),
    }

    setRows((prev) => [...prev, newDraft])
    setSelectedRowId(newId)
  }, [selectedSegmentId, rows, resolvedSegmentName, segmentCoords])

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
    if (selectedRowId === rowId) {
      setSelectedRowId(null)
    }
  }

  const handleUpdateRow = <K extends keyof CabinetRowDraft>(rowId: string, field: K, value: CabinetRowDraft[K]) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    )
  }

  // Update coords from map (drag or map click)
  const handleMapUpdateCoords = useCallback((rowId: string, coords: { lat: number; lng: number }) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              lat: coords.lat.toFixed(6),
              lng: coords.lng.toFixed(6),
            }
          : r
      )
    )
  }, [])

  // Map click when no row is selected or user wants to add by map click
  const handleMapClickAdd = useCallback((coords: { lat: number; lng: number }) => {
    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi chọn vị trí trên bản đồ!')
      return
    }

    if (selectedRowId) {
      // If a row is already selected, update its position to the clicked point
      handleMapUpdateCoords(selectedRowId, coords)
    } else {
      // If no row is selected, add a new row at this clicked location
      handleAddRow(coords)
    }
  }, [selectedSegmentId, selectedRowId, handleMapUpdateCoords, handleAddRow])

  // Submit Handler
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1!')
      return
    }

    if (rows.length === 0) {
      setErrorMsg('Vui lòng bấm "+ Thêm Tủ Điện" để thêm ít nhất một tủ điện vào tuyến!')
      return
    }

    const idSet = new Set<string>()
    const cabinetsToSave: CabinetListItem[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const trimmedName = row.cabinet_name.trim()
      const autoId = row.cabinet_id.trim()

      if (!trimmedName) {
        setErrorMsg(`Hàng #${i + 1}: Tên tủ điện không được để trống!`)
        return
      }

      if (idSet.has(autoId.toLowerCase())) {
        setErrorMsg(`Mã tủ "${autoId}" bị trùng lặp trong đợt thêm này!`)
        return
      }
      idSet.add(autoId.toLowerCase())

      const alreadyExists = availableCabinets.some(
        (c) =>
          (c.cabinet_id && c.cabinet_id.toLowerCase() === autoId.toLowerCase()) ||
          (c.external_ref && c.external_ref.toLowerCase() === autoId.toLowerCase())
      )
      if (alreadyExists) {
        setErrorMsg(`Mã tủ điện "${autoId}" đã tồn tại trên hệ thống GIS! Vui lòng chọn ký hiệu khác!`)
        return
      }

      const parsedLat = parseFloat(row.lat)
      const parsedLng = parseFloat(row.lng)

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setErrorMsg(`Hàng #${i + 1} (${trimmedName}): Vui lòng nhập Tọa độ GPS hợp lệ!`)
        return
      }

      cabinetsToSave.push({
        cabinet_id: autoId,
        external_ref: autoId,
        cabinet_name: trimmedName,
        commune_id: currentSegment?.commune_id || 'COM-001',
        data_source: 'field',
        location: {
          lat: parsedLat,
          lng: parsedLng,
        },
        feeder_ids: [],
        updated_at: new Date().toISOString(),
      })
    }

    if (onAddCabinets) {
      onAddCabinets(cabinetsToSave)
    } else if (onAddCabinet && cabinetsToSave.length > 0) {
      onAddCabinet(cabinetsToSave[0])
    }

    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-purple-900/40 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#581c87] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Cpu className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Khai Báo Danh Sách Tủ Điện Điều Khiển Tuyến
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Thiết lập vị trí tọa độ GIS trực quan và thông tin tủ điện trên tuyến đường
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

        {/* Modal 2-Column Split Body */}
        <form onSubmit={handleFinalSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs text-slate-800 dark:text-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column (6/12 cols): Route setup & Cabinets list */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              {/* SECTION 1: THÔNG TIN TUYẾN ĐƯỜNG & NGÀY VẬN HÀNH */}
              <div className="p-4 bg-purple-50/50 hover:bg-purple-50/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 rounded-2xl border border-purple-200/80 hover:border-purple-300 dark:border-purple-900/50 space-y-3 shadow-2xs transition-all duration-200">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-900/40 pb-2">
                  <div className="flex items-center gap-2 font-bold text-purple-950 dark:text-purple-200 text-xs">
                    <Route className="w-4 h-4 text-purple-700 dark:text-purple-400 drop-shadow-2xs" />
                    <span>1. Thiết Lập Tuyến Đường Cài Đặt Tủ</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Segment */}
                  <div className="space-y-1">
                    <label className="font-bold text-purple-950 dark:text-purple-200 text-xs flex items-center justify-between">
                      <span>Tuyến đường:</span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">(Bắt buộc)</span>
                    </label>
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => handleSegmentChange(e.target.value)}
                      className={`w-full p-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 ${
                        !selectedSegmentId
                          ? 'text-slate-400 border-purple-200 dark:border-purple-900/60'
                          : 'text-slate-900 dark:text-slate-100 border-purple-300 hover:border-purple-400 dark:border-purple-800'
                      }`}
                    >
                      <option value="" disabled className="text-slate-400 font-normal">
                        -- Chọn tuyến đường áp dụng --
                      </option>
                      {segmentList.map((seg) => (
                        <option key={seg.segment_id || ''} value={seg.segment_id || ''} className="text-slate-900 dark:text-slate-100">
                          {seg.segment_name} ({seg.segment_id} • {seg.pole_count || 0} cột)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Installed Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-purple-950 dark:text-purple-200 text-xs flex items-center justify-between">
                      <span>Ngày vận hành:</span>
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

              {/* SECTION 2: DANH SÁCH TỦ ĐIỆN THUỘC TUYẾN */}
              <div className="space-y-2.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>2. Danh Sách Tủ Điện</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {rows.length} tủ điện
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddRow()}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Thêm Tủ Điện</span>
                  </button>
                </div>

                {/* Table Container */}
                <div className="border border-purple-200/80 dark:border-purple-900/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex-1 min-h-[180px]">
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 sticky top-0 z-10 font-bold border-b border-purple-200 dark:border-purple-900/60">
                        <tr>
                          <th className="py-2 px-2.5 w-9 text-center">#</th>
                          <th className="py-2 px-2.5">Tên Tủ Điện</th>
                          <th className="py-2 px-2.5 w-44">Tọa Độ Lat / Lng</th>
                          <th className="py-2 px-2 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Zap className="w-7 h-7 text-purple-300 dark:text-purple-800 stroke-[1.5]" />
                                <p className="font-medium text-xs">Chưa có tủ điện nào trong danh sách.</p>
                                <p className="text-[11px] text-slate-400">
                                  Bấm <strong className="text-purple-600 font-bold">"+ Thêm Tủ Điện"</strong> hoặc click trực tiếp lên bản đồ GIS bên phải.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, index) => {
                            const isSelected = row.rowId === selectedRowId
                            return (
                              <tr
                                key={row.rowId}
                                onClick={() => setSelectedRowId(row.rowId)}
                                className={`cursor-pointer transition-colors duration-100 ${
                                  isSelected
                                    ? 'bg-purple-100/70 dark:bg-purple-900/40 font-semibold'
                                    : 'hover:bg-purple-50/30 dark:hover:bg-purple-950/20'
                                }`}
                              >
                                <td className="py-2 px-2.5 text-center text-purple-600 dark:text-purple-400 font-mono text-[11px]">
                                  {index + 1}
                                </td>
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    value={row.cabinet_name}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleUpdateRow(row.rowId, 'cabinet_name', e.target.value)}
                                    placeholder="Tủ A - Tuyến đường"
                                    className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-purple-200 hover:border-purple-300 dark:border-purple-900 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={row.lat}
                                      onChange={(e) => handleUpdateRow(row.rowId, 'lat', e.target.value)}
                                      placeholder="Lat"
                                      className="w-20 p-1 bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-900 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none"
                                    />
                                    <span className="text-slate-400 text-[10px]">,</span>
                                    <input
                                      type="text"
                                      value={row.lng}
                                      onChange={(e) => handleUpdateRow(row.rowId, 'lng', e.target.value)}
                                      placeholder="Lng"
                                      className="w-20 p-1 bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-900 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(row.rowId)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Mẹo:</strong> Click chọn hàng tủ điện để chỉnh vị trí trên bản đồ, hoặc bấm trực tiếp trên bản đồ vệ tinh bên phải để kéo/đặt tủ điện.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (6/12 cols): Interactive GIS Map */}
            <div className="lg:col-span-6 flex flex-col space-y-2 min-h-[380px] lg:min-h-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Vị Trí Tủ Điện Trên Bản Đồ Vệ Tinh (GIS)</span>
                </span>
                {selectedRowId && (
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 animate-pulse">
                    Đang chọn: {rows.find((r) => r.rowId === selectedRowId)?.cabinet_name || 'Tủ'}
                  </span>
                )}
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden border border-purple-200 dark:border-purple-900/60 shadow-inner flex flex-col min-h-[380px]">
                <AddCabinetMap
                  segmentCoords={segmentCoords}
                  existingCabinets={availableCabinets}
                  rows={rows}
                  selectedRowId={selectedRowId}
                  onSelectRow={setSelectedRowId}
                  onUpdateCoords={handleMapUpdateCoords}
                  onMapClickAdd={handleMapClickAdd}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-purple-100 dark:border-purple-950/80 bg-purple-50/40 dark:bg-purple-950/20 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={rows.length === 0}
              className={`px-6 py-2.5 font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-2 ${
                rows.length > 0
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white cursor-pointer hover:from-purple-800 hover:to-indigo-800 shadow-purple-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Danh Sách Tủ ({rows.length})</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
