import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Check, Calendar } from 'lucide-react'
import type { RetireFixtureRequest } from '../../../../../types/assets/fixtures'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'

interface RetireFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  fixture: ManagedFixture | null
  onConfirm: (fixtureId: string, req: RetireFixtureRequest) => void
}

export const RetireFixtureModal: React.FC<RetireFixtureModalProps> = ({
  isOpen,
  onClose,
  fixture,
  onConfirm,
}) => {
  const [removedDate, setRemovedDate] = useState('')

  useEffect(() => {
    if (isOpen) {
      setRemovedDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen])

  if (!isOpen || !fixture) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fixture.fixture_id) return
    onConfirm(fixture.fixture_id, {
      removed_date: removedDate || new Date().toISOString().split('T')[0],
    })
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
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Tháo Dỡ Bộ Đèn</h3>
                <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {fixture.fixture_id || 'CHƯA ĐẶT'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Xác nhận gỡ bỏ bộ đèn khỏi cột chiếu sáng</p>
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

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          {/* Thông tin bộ đèn */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cột điện đang gắn:</span>
              <span className="font-bold text-slate-800">
                {fixture.pole_external_ref || fixture.pole_id || 'Chưa gắn cột'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cấu hình đèn:</span>
              <span className="font-bold text-slate-800">
                {fixture.lamp_watt}W ({fixture.lamp_count || 1} bóng)
              </span>
            </div>
            {fixture.install_date && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày lắp đặt:</span>
                <span className="text-slate-700">{fixture.install_date}</span>
              </div>
            )}
          </div>

          {/* Ô chọn ngày tháo dỡ */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Ngày Tháo Dỡ</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={removedDate}
              onChange={(e) => setRemovedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-amber-500 focus:outline-none transition cursor-pointer"
              required
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 leading-relaxed">
            Lưu ý: Sau khi tháo dỡ, bộ đèn sẽ được lưu trạng thái đã thu hồi và vị trí cột điện sẽ trở về trạng thái trống (sẵn sàng lắp đặt bộ đèn mới).
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận Tháo Dỡ</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
