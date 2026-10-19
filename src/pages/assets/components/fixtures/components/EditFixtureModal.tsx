import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit3, Check } from 'lucide-react'
import type { FixtureType, PowerSource, DataSource } from '../../../../../types/common/enums'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'

interface EditFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  fixture: ManagedFixture | null
  poles: PoleListItem[]
  onUpdateFixture: (updated: ManagedFixture) => void
}

export const EditFixtureModal: React.FC<EditFixtureModalProps> = ({
  isOpen,
  onClose,
  fixture,
  poles,
  onUpdateFixture,
}) => {
  const [poleId, setPoleId] = useState('')
  const [lampWatt, setLampWatt] = useState<number>(100)
  const [fixtureType, setFixtureType] = useState<FixtureType>('led_road_lamp')
  const [powerSource, setPowerSource] = useState<PowerSource>('grid')
  const [installDate, setInstallDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('field')

  useEffect(() => {
    if (fixture) {
      setPoleId(fixture.pole_id || '')
      setLampWatt(fixture.lamp_watt || 100)
      setFixtureType(fixture.fixture_type || 'led_road_lamp')
      setPowerSource(fixture.power_source || 'grid')
      setInstallDate(fixture.install_date || '')
      setWarrantyExpiry(fixture.warranty_expiry || '')
      setDataSource(fixture.data_source || 'field')
    }
  }, [fixture])

  if (!isOpen || !fixture) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updated: ManagedFixture = {
      ...fixture,
      pole_id: poleId || null,
      fixture_type: fixtureType,
      power_source: powerSource,
      lamp_watt: lampWatt,
      install_date: installDate || null,
      warranty_expiry: warrantyExpiry || null,
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
                <h3 className="font-bold text-slate-900 text-base">Cập Nhật Bóng Đèn</h3>
                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  {fixture.fixture_id || 'CHƯA ĐẶT'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Chỉnh sửa thông số kỹ thuật và vị trí cột gắn bóng</p>
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
          {/* Cột điện gắn bóng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cột Điện Lắp Đặt</label>
            <select
              value={poleId}
              onChange={(e) => setPoleId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
            >
              {poles.map((p) => (
                <option key={p.pole_id || ''} value={p.pole_id || ''}>
                  {p.pole_id} {p.segment_id ? `— Tuyến ${p.segment_id}` : ''} {p.feeder_id ? `(Tủ ${p.feeder_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Công suất */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Công Suất (Watt)</label>
              <select
                value={lampWatt}
                onChange={(e) => setLampWatt(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
              >
                <option value={60}>60 W (Ngõ xóm)</option>
                <option value={100}>100 W (Liên thôn)</option>
                <option value={120}>120 W (Liên xã)</option>
                <option value={150}>150 W (Đường chính)</option>
                <option value={200}>200 W (Giao lộ lớn)</option>
              </select>
            </div>

            {/* Nguồn điện */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nguồn Cấp Điện</label>
              <select
                value={powerSource}
                onChange={(e) => setPowerSource(e.target.value as PowerSource)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
              >
                <option value="grid">Điện lưới (Grid)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Loại bóng */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loại Bóng Đèn</label>
              <select
                value={fixtureType}
                onChange={(e) => setFixtureType(e.target.value as FixtureType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
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
