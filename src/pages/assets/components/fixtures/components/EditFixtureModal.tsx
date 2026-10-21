import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit3, Check } from 'lucide-react'
import type { FixtureType, PowerSource, DataSource } from '../../../../../types/common/enums'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'

interface EditFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  fixture: ManagedFixture | null
  poles: PoleListItem[]
  segments?: SegmentListItem[]
  onUpdateFixture: (updated: ManagedFixture) => void
}

export const EditFixtureModal: React.FC<EditFixtureModalProps> = ({
  isOpen,
  onClose,
  fixture,
  poles,
  segments = [],
  onUpdateFixture,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [poleId, setPoleId] = useState('')
  const [lampWatt, setLampWatt] = useState<number>(100)
  const [lampCount, setLampCount] = useState<number>(1)
  const [fixtureType, setFixtureType] = useState<FixtureType>('led_road_lamp')
  const [powerSource, setPowerSource] = useState<PowerSource>('grid')
  const [installDate, setInstallDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('field')

  useEffect(() => {
    if (fixture) {
      const currentPole = poles.find(
        (p) =>
          (fixture.pole_id && p.pole_id === fixture.pole_id) ||
          (fixture.pole_external_ref && p.external_ref === fixture.pole_external_ref) ||
          (fixture.fixture_id && p.active_fixture?.fixture_id === fixture.fixture_id)
      )
      const targetPoleId = currentPole?.pole_id || fixture.pole_id || ''
      setSelectedSegmentId(currentPole?.segment_id || '')
      setPoleId(targetPoleId)
      setLampWatt(fixture.lamp_watt || 100)
      setLampCount(fixture.lamp_count || 1)
      setFixtureType(fixture.fixture_type || 'led_road_lamp')
      setPowerSource(fixture.power_source || 'grid')
      setInstallDate(fixture.install_date || '')
      setWarrantyExpiry(fixture.warranty_expiry || '')
      setDataSource(fixture.data_source || 'field')
    }
  }, [fixture, poles])

  // Lọc cột điện theo tuyến đã chọn:
  // Cho phép giữ nguyên cột hiện tại của bộ đèn này hoặc chọn các cột trống chưa lắp bộ đèn nào
  const filteredPoles = useMemo(() => {
    if (!selectedSegmentId) return []
    return poles.filter((p) => {
      if (p.segment_id !== selectedSegmentId) return false
      // Cột hiện tại của bộ đèn này -> Cho phép giữ
      if (
        (fixture?.pole_id && p.pole_id === fixture.pole_id) ||
        (fixture?.pole_external_ref && p.external_ref === fixture.pole_external_ref)
      ) {
        return true
      }
      // Cột trống chưa lắp đặt bộ đèn nào
      return !p.active_fixture
    })
  }, [poles, selectedSegmentId, fixture?.pole_id, fixture?.pole_external_ref])

  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    // Nếu cột hiện tại không thuộc tuyến mới -> Reset poleId
    const currentPoleMatches = poles.some(
      (p) => p.pole_id === poleId && p.segment_id === newSegmentId
    )
    if (!currentPoleMatches) {
      setPoleId('')
    }
  }

  if (!isOpen || !fixture) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const targetPole = poles.find((p) => p.pole_id === poleId)
    const updated: ManagedFixture = {
      ...fixture,
      pole_id: poleId || null,
      pole_external_ref: targetPole?.external_ref || fixture.pole_external_ref || null,
      fixture_type: fixtureType,
      power_source: powerSource,
      lamp_watt: lampWatt,
      lamp_count: lampCount,
      install_date: installDate || null,
      warranty_expiry: warrantyExpiry || null,
      removed_date: fixture.removed_date || null,
      data_source: dataSource,
    }

    onUpdateFixture(updated)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Cập Nhật Bộ Đèn</h3>
                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  {fixture.fixture_id || 'CHƯA ĐẶT'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Chỉnh sửa thông số kỹ thuật và vị trí cột gắn bộ đèn</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          {/* Vị trí lắp đặt: Tuyến đường & Cột điện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tuyến Đường Chiếu Sáng <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSegmentId}
                onChange={(e) => handleSegmentChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition cursor-pointer"
                required
              >
                <option value="">-- Chọn tuyến đường --</option>
                {segments.map((s) => (
                  <option key={s.segment_id || ''} value={s.segment_id || ''}>
                    {s.segment_name || s.segment_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cột Điện Lắp Đặt <span className="text-rose-500">*</span>
              </label>
              <select
                value={poleId || ''}
                onChange={(e) => setPoleId(e.target.value)}
                disabled={!selectedSegmentId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                required
              >
                {!selectedSegmentId ? (
                  <option value="">(Vui lòng chọn tuyến đường trước)</option>
                ) : filteredPoles.length === 0 ? (
                  <option value="">(Không có cột điện khả dụng trên tuyến này)</option>
                ) : (
                  <>
                    <option value="">-- Chọn cột điện lắp đặt --</option>
                    {filteredPoles.map((p) => {
                      const isCurrentPole =
                        (fixture?.pole_id && p.pole_id === fixture.pole_id) ||
                        (fixture?.pole_external_ref && p.external_ref === fixture.pole_external_ref)
                      const label = p.external_ref || 'Cột chưa đặt mã'
                      const tag = isCurrentPole ? ' [Đang lắp]' : ' [Chưa lắp]'
                      return (
                        <option key={p.pole_id || ''} value={p.pole_id || ''}>
                          {label}{tag}
                        </option>
                      )
                    })}
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Số lượng bóng */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số Bóng / Bộ</label>
              <select
                value={lampCount}
                onChange={(e) => setLampCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition cursor-pointer"
              >
                <option value={1}>1 bóng</option>
                <option value={2}>2 bóng</option>
                <option value={3}>3 bóng</option>
                <option value={4}>4 bóng</option>
              </select>
            </div>

            {/* Công suất */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Công Suất Mỗi Bóng {lampCount > 1 && <span className="text-amber-600 font-bold">(Tổng: {lampWatt * lampCount}W)</span>}
              </label>
              <select
                value={lampWatt}
                onChange={(e) => setLampWatt(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition cursor-pointer"
              >
                <option value={60}>60 W (Ngõ xóm)</option>
                <option value={100}>100 W (Liên thôn)</option>
                <option value={120}>120 W (Liên xã)</option>
                <option value={150}>150 W (Đường chính)</option>
                <option value={200}>200 W (Giao lộ lớn)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Loại đèn */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loại Đèn Chiếu Sáng</label>
              <select
                value={fixtureType}
                onChange={(e) => setFixtureType(e.target.value as FixtureType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition cursor-pointer"
              >
                <option value="led_road_lamp">Đèn LED đường phố (led_road_lamp)</option>
              </select>
            </div>

            {/* Nguồn dữ liệu */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nguồn Dữ Liệu</label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as DataSource)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
              >
                <option value="field">Khảo sát thực địa (field)</option>
                <option value="public_imagery">Ảnh công cộng (public_imagery)</option>
                <option value="calibration_rig">Dàn cảm biến (calibration_rig)</option>
                <option value="simulated">Mô phỏng (simulated)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Ngày lắp đặt */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày Lắp Đặt</label>
              <input
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Hạn bảo hành */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hạn Bảo Hành</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 cursor-pointer transition shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
