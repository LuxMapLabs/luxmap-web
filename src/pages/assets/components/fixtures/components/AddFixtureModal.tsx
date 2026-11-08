import React, { useState, useMemo, useEffect } from 'react'
import { Lightbulb, PlusCircle, Trash2, CheckCircle2, Route } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
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
  lamp_count: number
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

  // Danh sách tất cả cột điện thuộc tuyến đường đã chọn
  const polesOnSegment = useMemo(() => {
    if (!selectedSegmentId) return []
    return poles.filter((p) => p.segment_id === selectedSegmentId)
  }, [poles, selectedSegmentId])

  // Danh sách cột điện CHƯA LẮP BỘ ĐÈN thuộc tuyến đường đã chọn
  const filteredPoles = useMemo(() => {
    return polesOnSegment.filter((p) => !p.active_fixture)
  }, [polesOnSegment])

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
      lamp_count: 1,
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
      setValidationError('Danh sách bóng đèn không được để trống! Vui lòng bấm "Thêm Bộ Đèn Mới".')
      return
    }

    setValidationError(null)

    const requests: CreateFixtureRequest[] = rows.map((r) => ({
      pole_id: selectedPoleId || null,
      fixture_type: r.fixture_type,
      power_source: r.power_source,
      lamp_watt: Number(r.lamp_watt) || 100,
      lamp_count: Number(r.lamp_count) || 1,
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

  return (
    <AssetModalFrame widthClass="max-w-4xl">
      <AssetModalHeader
        icon={<Lightbulb className="w-5 h-5" />}
        accent="amber"
        title="Thêm Bộ Đèn Chiếu Sáng"
        subtitle="Lựa chọn tuyến đường, cột điện và cấu hình bộ đèn gắn trên cột"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
        <AssetModalError message={validationError} />
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
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
                  ) : polesOnSegment.length === 0 ? (
                    <option value="">(Tuyến này chưa có cột điện nào)</option>
                  ) : filteredPoles.length === 0 ? (
                    <option value="">(Tất cả cột trên tuyến này đã lắp bộ đèn)</option>
                  ) : (
                    <>
                      <option value="">-- Chọn cột điện lắp đặt --</option>
                      {filteredPoles.map((p) => {
                        const label = p.external_ref || 'Cột chưa đặt mã'
                        return (
                          <option key={p.pole_id || ''} value={p.pole_id || ''}>
                            {label}
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
                  <span>2. Danh Sách Bộ Đèn Gắn Trên Cột</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {rows.length} bộ đèn đã thêm
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                disabled={!selectedPoleId}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm Bộ Đèn Mới</span>
              </button>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-24">Số bóng / bộ</th>
                      <th className="py-2.5 px-3 min-w-24">Công suất (*)</th>
                      <th className="py-2.5 px-3 min-w-36">Loại đèn</th>
                      <th className="py-2.5 px-3 min-w-28">Nguồn điện</th>
                      <th className="py-2.5 px-3 min-w-28">Ngày lắp</th>
                      <th className="py-2.5 px-3 min-w-28">Hạn bảo hành</th>
                      <th className="py-2.5 px-3 w-14 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          {!selectedPoleId ? (
                            <span>Vui lòng chọn Tuyến đường và Cột điện ở Mục 1 để bắt đầu thêm bộ đèn.</span>
                          ) : (
                            <span>
                              Chưa có bộ đèn nào được cấu hình cho cột này. Bấm{' '}
                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer"
                              >
                                Thêm Bộ Đèn Mới
                              </button>{' '}
                              để tạo bộ đèn.
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

                          {/* Số lượng bóng */}
                          <td className="py-2 px-3">
                            <select
                              value={row.lamp_count}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.rowId,
                                  'lamp_count',
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value={1}>1 bóng</option>
                              <option value={2}>2 bóng</option>
                              <option value={3}>3 bóng</option>
                              <option value={4}>4 bóng</option>
                            </select>
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
                            {row.lamp_count > 1 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                Tổng: {row.lamp_watt * row.lamp_count} W
                              </div>
                            )}
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
                              title="Xóa bộ đèn này"
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

        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel={`Xác Nhận Thêm (${rows.length} Bộ Đèn)`}
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
          disabled={rows.length === 0 || !selectedPoleId}
        />
      </form>
    </AssetModalFrame>
  )
}
