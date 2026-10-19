import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Archive, RotateCcw } from 'lucide-react'
import type { RetireFixtureRequest } from '../../../../../types/assets/fixtures'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'

interface RetireFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  fixture: ManagedFixture | null
  onRetireFixture: (fixtureId: string, req: RetireFixtureRequest) => void
}

export const RetireFixtureModal: React.FC<RetireFixtureModalProps> = ({
  isOpen,
  onClose,
  fixture,
  onRetireFixture,
}) => {
  const today = new Date().toISOString().split('T')[0]
  const [removedDate, setRemovedDate] = useState(today)

  if (!isOpen || !fixture) return null

  const isAlreadyRetired = Boolean(fixture.removed_date)

  const handleConfirm = () => {
    onRetireFixture(fixture.fixture_id || '', {
      removed_date: isAlreadyRetired ? null : removedDate,
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
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isAlreadyRetired
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              {isAlreadyRetired ? <RotateCcw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAlreadyRetired ? 'Kích Hoạt Lại Bóng Đèn' : 'Đăng Ký Tháo Dỡ Bóng Đèn'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAlreadyRetired ? 'Khôi phục trạng thái hoạt động trên cột' : 'Ghi nhận bóng đèn đã tháo dỡ khỏi cột'}
              </p>
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã bóng đèn:</span>
              <span className="font-mono font-bold text-slate-900">{fixture.fixture_id || 'CHƯA ĐẶT'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cột điện gắn:</span>
              <span className="font-mono font-bold text-blue-600">{fixture.pole_id || 'Không có'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Công suất:</span>
              <span className="font-semibold text-slate-800">{fixture.lamp_watt} W</span>
            </div>
          </div>

          {!isAlreadyRetired ? (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Ngày Tháo Dỡ Thực Tế (removed_date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={removedDate}
                onChange={(e) => setRemovedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-amber-500 focus:outline-none transition"
              />
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Bóng đèn sau khi tháo dỡ sẽ chuyển sang trạng thái <strong>Đã tháo dỡ (Retired)</strong> và không còn tính vào phụ tải hoạt động của cột điện.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              Bóng đèn này hiện đang ở trạng thái đã tháo dỡ (ngày {fixture.removed_date}). Bạn có chắc muốn xóa ngày tháo dỡ để đưa bóng đèn trở lại trạng thái <strong>Đang hoạt động</strong>?
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 cursor-pointer transition shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-5 py-2 text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isAlreadyRetired ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isAlreadyRetired ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Kích Hoạt Lại</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Xác Nhận Tháo Dỡ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
