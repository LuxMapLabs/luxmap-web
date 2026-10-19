import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Lightbulb,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Route,
  AlertCircle,
} from 'lucide-react'
import type { CreateFixtureRequest } from '../../../../../types/assets/fixtures'
import type { FixtureType, PowerSource, DataSource } from '../../../../../types/common/enums'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'

export interface AddFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  poles: PoleListItem[]
  segments?: SegmentListItem[]
  onAddFixture?: (data: CreateFixtureRequest) => void
  onAddFixtures?: (data: CreateFixtureRequest[]) => void
}

interface FixtureDraftRow {
  rowId: string
  lamp_watt: number
  fixture_type: FixtureType
  power_source: PowerSource
  install_date: string
  warranty_expiry: string
  data_source: DataSource
}

const DEFAULT_WATTS = [60, 100, 120, 150, 200, 250]

export const AddFixtureModal: React.FC<AddFixtureModalProps> = ({
  isOpen,
  onClose,
  poles,
  segments = [],
  onAddFixture,
  onAddFixtures,
}) => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const defaultWarranty = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 2)
    return d.toISOString().split('T')[0]
  }, [])

  // Section 1: State Tuyến đường & Cột điện (Mặc định rỗng khi mở)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')
  const [selectedPoleId, setSelectedPoleId] = useState<string>('')

  // Section 2: Danh sách bóng đèn gắn trên cột đã chọn (Mặc định mảng rỗng)
  const [rows, setRows] = useState<FixtureDraftRow[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Danh sách cột điện thuộc tuyến đường đã chọn
  const filteredPoles = useMemo(() => {
    if (!selectedSegmentId) {
      return []
    }
    return poles.filter((p) => p.segment_id === selectedSegmentId)
  }, [poles, selectedSegmentId])

  // Khởi tạo mặc định rỗng khi mở modal (Không tự động tạo dòng bóng nào)
  useEffect(() => {
    if (isOpen) {
      setValidationError(null)
      setSelectedSegmentId('')
      setSelectedPoleId('')
      setRows([])
    }
  }, [isOpen])

  // Khi người dùng chọn lại Tuyến đường -> Reset Cột điện và danh sách bóng
  const handleSegmentChange = (segId: string) => {
    setSelectedSegmentId(segId)
    setSelectedPoleId('')
    setRows([])
    setValidationError(null)
  }

  // Khi chọn Cột điện
  const handlePoleChange = (poleId: string) => {
    setSelectedPoleId(poleId)
    setRows([])
    setValidationError(null)
  }

  // Thêm bóng đèn mới vào bảng
  const handleAddRow = () => {
    if (!selectedPoleId) {
      setValidationError('Vui lòng chọn Cột điện trước khi thêm bóng đèn!')
      return
    }

    setValidationError(null)
    const nextIdx = rows.length + 1
    const newRow: FixtureDraftRow = {
      rowId: `fix-draft-${Date.now()}-${nextIdx}`,
      lamp_watt: rows.length > 0 ? rows[rows.length - 1].lamp_watt : 100,
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      install_date: today,
      warranty_expiry: defaultWarranty,
      data_source: 'field',
    }
    setRows((prev) => [...prev, newRow])
  }

  // Cập nhật từng ô trong dòng
  const handleUpdateRow = (
    rowId: string,
    field: keyof FixtureDraftRow,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row))
    )
  }

  // Xóa dòng bóng đèn
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  // Xác nhận lưu hàng loạt bóng đèn
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPoleId) {
      setValidationError('Vui lòng chọn Cột điện để lắp đặt bóng đèn!')
      return
    }

    if (rows.length === 0) {
      setValidationError('Danh sách bóng đèn không được để trống! Vui lòng bấm "+ Thêm Bóng Mới".')
      return
    }

    setValidationError(null)

    const requests: CreateFixtureRequest[] = rows.map((r) => ({
      pole_id: selectedPoleId || null,
      fixture_type: r.fixture_type,
      power_source: r.power_source,
      lamp_watt: Number(r.lamp_watt) || 100,
      install_date: r.install_date || null,
      removed_date: null,
      warranty_expiry: r.warranty_expiry || null,
      data_source: r.data_source,
    }))

    if (onAddFixtures) {
      onAddFixtures(requests)
    } else if (onAddFixture) {
      requests.forEach((req) => onAddFixture(req))
    }

    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Thêm Bóng Đèn Chiếu Sáng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lựa chọn tuyến đường, cột điện và cấu hình bóng đèn gắn trên cột (cần đơn, cần đôi)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ================= SECTION 1: CHỌN TUYẾN ĐƯỜNG & CỘT ĐIỆN ================= */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
              <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>1. Vị Trí Lắp Đặt Thiết Bị</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dropdown 1: Tuyến đường */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tuyến Đường Chiếu Sáng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="">-- Chọn tuyến đường chiếu sáng --</option>
                  {segments.map((s) => (
                    <option key={s.segment_id || s.external_ref || Math.random()} value={s.segment_id || ''}>
                      {s.segment_name || s.external_ref || s.segment_id || 'Tuyến không tên'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Cột điện thuộc tuyến */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cột Điện Lắp Đặt <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPoleId}
                  onChange={(e) => handlePoleChange(e.target.value)}
                  disabled={!selectedSegmentId}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed disabled:text-slate-400"
                  required
                >
                  {!selectedSegmentId ? (
                    <option value="">(Vui lòng chọn tuyến đường trước)</option>
                  ) : filteredPoles.length === 0 ? (
                    <option value="">(Tuyến này chưa có cột điện nào)</option>
                  ) : (
                    <>
                      <option value="">-- Chọn cột điện lắp đặt --</option>
                      {filteredPoles.map((p) => {
                        const label = p.external_ref || p.pole_id || 'Cột không tên'
                        const subInfo = p.feeder_id || p.cabinet_name ? ` (Nguồn: ${p.cabinet_name || p.feeder_id})` : ''
                        return (
                          <option key={p.pole_id || ''} value={p.pole_id || ''}>
                            {label} {subInfo}
                          </option>
                        )
                      })}
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: BẢNG DANH SÁCH BÓNG ĐÈN GẮN TRÊN CỘT ================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>2. Danh Sách Bóng Đèn Gắn Trên Cột</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {rows.length} bóng đã thêm
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                disabled={!selectedPoleId}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Thêm Bóng Mới</span>
              </button>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-32">Công suất (*)</th>
                      <th className="py-2.5 px-3 min-w-36">Loại bóng</th>
                      <th className="py-2.5 px-3 min-w-28">Nguồn điện</th>
                      <th className="py-2.5 px-3 min-w-32">Ngày lắp</th>
                      <th className="py-2.5 px-3 min-w-32">Hạn bảo hành</th>
                      <th className="py-2.5 px-3 w-14 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          {!selectedPoleId ? (
                            <span>Vui lòng chọn Tuyến đường và Cột điện ở Mục 1 để bắt đầu thêm bóng đèn.</span>
                          ) : (
                            <span>
                              Chưa có bóng đèn nào được cấu hình cho cột này. Bấm{' '}
                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer"
                              >
                                + Thêm Bóng Mới
                              </button>{' '}
                              để tạo bóng đèn.
                            </span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr
                          key={row.rowId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* STT */}
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">
                            {index + 1}
                          </td>

                          {/* Công suất (W) */}
                          <td className="py-2 px-3">
                            <select
                              value={row.lamp_watt}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.rowId,
                                  'lamp_watt',
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              {DEFAULT_WATTS.map((w) => (
                                <option key={w} value={w}>
                                  {w} W {w === 100 ? '(Chuẩn)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Loại bóng */}
                          <td className="py-2 px-3">
                            <select
                              value={row.fixture_type}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.rowId,
                                  'fixture_type',
                                  e.target.value as FixtureType
                                )
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="led_road_lamp">Đèn LED đường phố</option>
                            </select>
                          </td>

                          {/* Nguồn điện */}
                          <td className="py-2 px-3">
                            <select
                              value={row.power_source}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.rowId,
                                  'power_source',
                                  e.target.value as PowerSource
                                )
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="grid">Điện lưới (Grid)</option>
                            </select>
                          </td>

                          {/* Ngày lắp đặt */}
                          <td className="py-2 px-3">
                            <input
                              type="date"
                              value={row.install_date}
                              onChange={(e) =>
                                handleUpdateRow(row.rowId, 'install_date', e.target.value)
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Hạn bảo hành */}
                          <td className="py-2 px-3">
                            <input
                              type="date"
                              value={row.warranty_expiry}
                              onChange={(e) =>
                                handleUpdateRow(row.rowId, 'warranty_expiry', e.target.value)
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Xóa */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.rowId)}
                              title="Xóa bóng này"
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
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

          {/* ================= SECTION 3: FOOTER ACTIONS ================= */}
          <div className="p-4 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={rows.length === 0 || !selectedPoleId}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Thêm ({rows.length} Bóng)</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
