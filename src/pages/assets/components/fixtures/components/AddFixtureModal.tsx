import React, { useState, useMemo, useEffect } from 'react'
import { Lightbulb, CheckCircle2, Route, MapPin } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import type { ActiveFixture, CreateFixtureRequest, UpdateFixtureRequest } from '../../../../../types/assets/fixtures'
import type { FixtureType, PowerSource, DataSource } from '../../../../../types/common/enums'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import { useCloseAfterMutation } from '../../../../../hooks/assets/useCloseAfterMutation'

export interface AddFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  poles: PoleListItem[]
  segments?: SegmentListItem[]
  onAddFixture?: (data: CreateFixtureRequest) => void
  onAddFixtures?: (data: CreateFixtureRequest[]) => void
  /**
   * Gắn bộ đèn cho đúng một cột (Bản đồ GIS): bỏ bước chọn tuyến / cột. Chỉ mở khi cột chưa có bộ đèn đang dùng.
   * Nguồn dữ liệu lấy theo cột, không mặc định `field`.
   */
  fixedPole?: PoleListItem
  /**
   * Sửa bộ đèn đang dùng (cùng form với gắn): chỉ sửa thông tin nhập sai, không đổi cột.
   * Thay đèn thật ngoài hiện trường = tháo bộ cũ rồi gắn bộ mới, để giữ lịch sử và bảo hành.
   */
  editFixture?: { fixture: ActiveFixture & { fixture_id: string }; poleLabel: string }
  onUpdateFixture?: (fixtureId: string, data: UpdateFixtureRequest) => void
}

interface FixtureConfig {
  lamp_watt: number
  lamp_count: number
  fixture_type: FixtureType
  power_source: PowerSource
  install_date: string
  warranty_expiry: string
  data_source: DataSource
  note: string
}

const DEFAULT_WATTS = [60, 100, 120, 150, 200, 250]

const FIELD_CLASS =
  'w-full px-3 py-2 min-h-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus:border-blue-500 cursor-pointer shadow-2xs disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed disabled:text-slate-400'
const LABEL_CLASS = 'block font-semibold text-slate-700 dark:text-slate-300 mb-1'

export const AddFixtureModal: React.FC<AddFixtureModalProps> = ({
  isOpen,
  onClose,
  poles,
  segments = [],
  onAddFixture,
  onAddFixtures,
  fixedPole,
  editFixture,
  onUpdateFixture,
}) => {
  const isEdit = !!editFixture
  const { isSaving, markSent } = useCloseAfterMutation(onClose)
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const defaultWarranty = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 2)
    return d.toISOString().split('T')[0]
  }, [])

  const makeDefaultConfig = (): FixtureConfig => ({
    lamp_watt: 100,
    lamp_count: 1,
    fixture_type: 'led_road_lamp',
    power_source: 'grid',
    install_date: today,
    warranty_expiry: defaultWarranty,
    data_source: 'field',
    note: '',
  })

  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>([])
  const [config, setConfig] = useState<FixtureConfig>(makeDefaultConfig)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Cột thuộc tuyến đã chọn, xếp theo mã cột (số tự nhiên)
  const polesOnSegment = useMemo(() => {
    if (!selectedSegmentId) return []
    return poles
      .filter((p) => p.segment_id === selectedSegmentId)
      .sort((a, b) =>
        (a.external_ref || a.pole_id || '').localeCompare(b.external_ref || b.pole_id || '', 'vi', { numeric: true })
      )
  }, [poles, selectedSegmentId])

  // Chỉ những cột CHƯA có bộ đèn mới được chọn
  const availablePoles = useMemo(() => polesOnSegment.filter((p) => !p.active_fixture), [polesOnSegment])
  const hiddenCount = polesOnSegment.length - availablePoles.length
  const allSelected = availablePoles.length > 0 && selectedPoleIds.length === availablePoles.length

  useEffect(() => {
    if (isOpen) {
      setValidationError(null)
      setSelectedSegmentId(fixedPole?.segment_id || '')
      setSelectedPoleIds(fixedPole?.pole_id ? [fixedPole.pole_id] : [])
      const current = editFixture?.fixture
      setConfig(
        current
          ? {
              lamp_watt: current.lamp_watt || 100,
              lamp_count: current.lamp_count || 1,
              fixture_type: current.fixture_type || 'led_road_lamp',
              power_source: current.power_source || 'grid',
              install_date: current.install_date || '',
              warranty_expiry: current.warranty_expiry || '',
              data_source: current.data_source,
              note: current.note || '',
            }
          : makeDefaultConfig()
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSegmentChange = (segId: string) => {
    setSelectedSegmentId(segId)
    setSelectedPoleIds([])
    setValidationError(null)
  }

  const togglePole = (poleId: string) => {
    setValidationError(null)
    setSelectedPoleIds((prev) => (prev.includes(poleId) ? prev.filter((id) => id !== poleId) : [...prev, poleId]))
  }

  const toggleAll = () => {
    setValidationError(null)
    setSelectedPoleIds(allSelected ? [] : availablePoles.map((p) => p.pole_id || '').filter(Boolean))
  }

  const updateConfig = <K extends keyof FixtureConfig>(field: K, value: FixtureConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editFixture) {
      if (!config.install_date) {
        setValidationError('Vui lòng nhập Ngày lắp.')
        return
      }
      setValidationError(null)
      onUpdateFixture?.(editFixture.fixture.fixture_id, {
        fixture_type: config.fixture_type,
        power_source: config.power_source,
        lamp_watt: Number(config.lamp_watt) || 100,
        lamp_count: Number(config.lamp_count) || 1,
        install_date: config.install_date,
        warranty_expiry: config.warranty_expiry || null,
        note: config.note.trim() || null,
      })
      markSent()
      return
    }

    if (!fixedPole && !selectedSegmentId) {
      setValidationError('Vui lòng chọn Tuyến đường trước!')
      return
    }
    if (selectedPoleIds.length === 0) {
      setValidationError('Vui lòng chọn ít nhất một Cột điện để gắn bộ đèn!')
      return
    }
    setValidationError(null)

    // Giữ đúng thứ tự cột trong danh sách, mỗi cột một bộ đèn cùng cấu hình
    const targets = fixedPole ? [fixedPole] : availablePoles
    const requests: CreateFixtureRequest[] = targets
      .filter((p) => p.pole_id && selectedPoleIds.includes(p.pole_id))
      .map((p) => ({
        pole_id: p.pole_id || null,
        fixture_type: config.fixture_type,
        power_source: config.power_source,
        lamp_watt: Number(config.lamp_watt) || 100,
        lamp_count: Number(config.lamp_count) || 1,
        install_date: config.install_date || null,
        removed_date: null,
        warranty_expiry: config.warranty_expiry || null,
        data_source: fixedPole ? p.data_source || config.data_source : config.data_source,
        note: config.note.trim() || null,
      }))

    if (onAddFixtures) {
      onAddFixtures(requests)
    } else if (onAddFixture) {
      requests.forEach((req) => onAddFixture(req))
    }

    markSent()
  }

  if (!isOpen) return null

  return (
    <AssetModalFrame widthClass="max-w-3xl">
      <AssetModalHeader
        icon={<Lightbulb className="w-5 h-5" />}
        accent="amber"
        title={
          editFixture
            ? `Sửa bộ đèn ${editFixture.fixture.fixture_id} (cột ${editFixture.poleLabel})`
            : fixedPole
              ? `Gắn bộ đèn cho cột ${fixedPole.external_ref || fixedPole.pole_id}`
              : 'Thêm bộ đèn chiếu sáng'
        }
        subtitle={
          editFixture
            ? 'Chỉ để sửa thông tin nhập sai. Thay đèn ngoài hiện trường: tháo bộ cũ rồi gắn bộ mới.'
            : fixedPole
              ? 'Chọn số bóng và công suất của bộ đèn bên dưới'
              : 'Chọn tuyến đường, tick các cột cần gắn và cấu hình bộ đèn dùng chung'
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
        <AssetModalError message={validationError} />
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {fixedPole || isEdit ? null : (
          <>
          {/* ===== 1. TUYẾN ĐƯỜNG ===== */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
              <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>1. Tuyến Đường Chiếu Sáng</span>
            </div>
            <div>
              <label htmlFor="add-fixture-segment" className={LABEL_CLASS}>
                Tuyến đường <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <select
                id="add-fixture-segment"
                value={selectedSegmentId}
                onChange={(e) => handleSegmentChange(e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">-- Chọn tuyến đường chiếu sáng --</option>
                {segments.map((s) => (
                  <option key={s.segment_id || s.external_ref} value={s.segment_id || ''}>
                    {s.segment_name || s.external_ref || s.segment_id || 'Tuyến không tên'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== 2. CHỌN CỘT ===== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>2. Chọn Cột Điện Cần Gắn Bộ Đèn</span>
                </span>
                <span
                  aria-live="polite"
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  {selectedPoleIds.length}/{availablePoles.length} cột đã chọn
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                disabled={availablePoles.length === 0}
                className="px-3 min-h-9 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs">
              {!selectedSegmentId ? (
                <p className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                  Vui lòng chọn Tuyến đường ở Mục 1 để xem danh sách cột.
                </p>
              ) : polesOnSegment.length === 0 ? (
                <p className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">Tuyến này chưa có cột điện nào.</p>
              ) : availablePoles.length === 0 ? (
                <p className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                  Tất cả cột trên tuyến này đã lắp bộ đèn.
                </p>
              ) : (
                <ul
                  aria-label="Danh sách cột điện chưa lắp bộ đèn"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 max-h-56 overflow-y-auto"
                >
                  {availablePoles.map((p) => {
                    const id = p.pole_id || ''
                    const checked = selectedPoleIds.includes(id)
                    return (
                      <li key={id}>
                        <label
                          className={`flex items-center gap-2 px-3 min-h-10 rounded-xl border cursor-pointer transition-colors font-semibold ${
                            checked
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePole(id)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                          <span className="truncate">{p.external_ref || 'Cột chưa đặt mã'}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {hiddenCount > 0 && availablePoles.length > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đã ẩn {hiddenCount} cột đã có bộ đèn trên tuyến này.
              </p>
            )}
          </div>

          </>
          )}

          {/* ===== 3. CẤU HÌNH BỘ ĐÈN CHUNG ===== */}
          <fieldset className="space-y-3" disabled={!isEdit && selectedPoleIds.length === 0}>
            <legend className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>{fixedPole || isEdit ? 'Cấu hình bộ đèn' : '3. Cấu Hình Bộ Đèn (áp dụng cho mọi cột đã chọn)'}</span>
            </legend>
            {!isEdit && selectedPoleIds.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Chọn ít nhất một cột để cấu hình bộ đèn.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="add-fixture-count" className={LABEL_CLASS}>Số bóng / bộ</label>
                <select
                  id="add-fixture-count"
                  value={config.lamp_count}
                  onChange={(e) => updateConfig('lamp_count', parseInt(e.target.value, 10))}
                  className={FIELD_CLASS}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} bóng</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-fixture-watt" className={LABEL_CLASS}>Công suất (W)</label>
                <select
                  id="add-fixture-watt"
                  value={config.lamp_watt}
                  onChange={(e) => updateConfig('lamp_watt', parseInt(e.target.value, 10))}
                  className={FIELD_CLASS}
                >
                  {DEFAULT_WATTS.map((w) => (
                    <option key={w} value={w}>{w} W {w === 100 ? '(Chuẩn)' : ''}</option>
                  ))}
                </select>
                {config.lamp_count > 1 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold mt-1">
                    Tổng: {config.lamp_watt * config.lamp_count} W / cột
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="add-fixture-type" className={LABEL_CLASS}>Loại đèn</label>
                <select
                  id="add-fixture-type"
                  value={config.fixture_type}
                  onChange={(e) => updateConfig('fixture_type', e.target.value as FixtureType)}
                  className={FIELD_CLASS}
                >
                  <option value="led_road_lamp">Đèn LED đường phố</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-fixture-install" className={LABEL_CLASS}>Ngày lắp</label>
                <input
                  id="add-fixture-install"
                  type="date"
                  value={config.install_date}
                  required={isEdit}
                  onChange={(e) => updateConfig('install_date', e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="add-fixture-warranty" className={LABEL_CLASS}>Hạn bảo hành</label>
                <input
                  id="add-fixture-warranty"
                  type="date"
                  value={config.warranty_expiry}
                  onChange={(e) => updateConfig('warranty_expiry', e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <div>
              <label htmlFor="add-fixture-note" className={LABEL_CLASS}>Ghi chú</label>
              <textarea
                id="add-fixture-note"
                rows={2}
                maxLength={1000}
                value={config.note}
                onChange={(e) => updateConfig('note', e.target.value)}
                placeholder="Trường hợp đặc biệt, ví dụ: thực tế chỉ thay 1 bóng"
                className={`${FIELD_CLASS} cursor-text resize-y`}
              />
            </div>
          </fieldset>
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel={
            isSaving
              ? 'Đang lưu…'
              : isEdit
                ? 'Lưu thay đổi'
                : fixedPole
                  ? 'Gắn bộ đèn'
                  : `Xác nhận thêm (${selectedPoleIds.length} Bộ Đèn)`
          }
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
          loading={isSaving}
          disabled={!isEdit && selectedPoleIds.length === 0}
        />
      </form>
    </AssetModalFrame>
  )
}
