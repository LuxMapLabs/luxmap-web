import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Compass, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react'
import type { CommuneItem, CommuneBbox } from '../../../types/admin/communes'
import type { Geometry } from '../../../types/common/base'
import { CommuneBoundaryMap } from './CommuneBoundaryMap'
import { bboxToGeometry, countVertices, geometryToPolygons, polygonsToBbox } from '../../../utils/communeBoundary'

export interface CommuneFormModalProps {
  isOpen: boolean
  isSubmitting?: boolean
  commune?: CommuneItem | null
  /** Ranh giới đang lưu của địa bàn (chỉ khi sửa) */
  initialBoundary?: Geometry | null
  isLoadingBoundary?: boolean
  onClose: () => void
  /** boundary: undefined = giữ nguyên, null = xóa, Geometry = ranh giới mới */
  onSubmit: (payload: { name: string; bbox?: CommuneBbox | null; boundary?: Geometry | null }) => void
}

export const CommuneFormModal: React.FC<CommuneFormModalProps> = ({
  isOpen,
  isSubmitting = false,
  commune = null,
  initialBoundary = null,
  isLoadingBoundary = false,
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(commune)

  const [name, setName] = useState('')
  const [boundary, setBoundary] = useState<Geometry | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Đồng bộ state ngay trong pha render khi mở modal, đổi địa bàn hoặc ranh giới tải xong từ API
  const [prevSync, setPrevSync] = useState<{
    isOpen: boolean
    communeId: string | null
    initialBoundary: Geometry | null
  }>({ isOpen: false, communeId: null, initialBoundary: null })

  const currentCommuneId = commune?.commune_id ?? null

  // Xã chưa có ranh giới: dùng khung cũ (bbox) làm polygon 4 đỉnh để vẫn có viền và kéo chỉnh được
  const baseBoundary = useMemo(
    () => initialBoundary ?? (isEdit && !isLoadingBoundary ? bboxToGeometry(commune?.bbox) : null),
    [initialBoundary, isEdit, isLoadingBoundary, commune]
  )
  if (
    prevSync.isOpen !== isOpen ||
    prevSync.communeId !== currentCommuneId ||
    prevSync.initialBoundary !== baseBoundary
  ) {
    setPrevSync({ isOpen, communeId: currentCommuneId, initialBoundary: baseBoundary })
    if (isOpen) {
      if (prevSync.isOpen !== isOpen || prevSync.communeId !== currentCommuneId) {
        setName(commune?.name || '')
        setErrors({})
      }
      setBoundary(baseBoundary)
    }
  }

  const vertexCount = useMemo(() => countVertices(geometryToPolygons(boundary)), [boundary])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const newErrors: Record<string, string> = {}
    if (!trimmed) newErrors.name = 'Tên địa bàn không được để trống'
    else if (trimmed.length > 200) newErrors.name = 'Tên địa bàn tối đa 200 ký tự'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    // Khung bản đồ lấy từ hộp bao của ranh giới; chưa có ranh giới thì giữ khung cũ
    const bbox = boundary
      ? polygonsToBbox(geometryToPolygons(boundary))
      : (commune?.bbox ?? null)
    const changed = boundary !== baseBoundary
    onSubmit({
      name: trimmed,
      bbox,
      boundary: changed ? boundary : isEdit ? undefined : null,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/80 backdrop-blur-2xl dark:bg-slate-900 rounded-[28px] border border-white/80 dark:border-slate-800 shadow-2xl shadow-primary/30 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? `Cập nhật địa bàn: ${commune?.name || commune?.commune_id}` : 'Thêm địa bàn hành chính'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? 'Chỉnh sửa tên và ranh giới hành chính'
                  : 'Khai báo tên xã/thị trấn và vẽ ranh giới trên bản đồ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Grid 2 Cột */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Cột Trái: Thông tin địa bàn & tọa độ số */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tên địa bàn */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 h-6 flex items-center mb-1.5">
                Tên địa bàn (xã / thị trấn) <span className="text-rose-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Xã Phước Đồng, Thị trấn Diên Khánh, Phường Tân Phú..."
                className={`w-full px-3.5 py-2.5 bg-white/50 dark:bg-slate-800/80 border rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                  errors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.name && <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name}</p>}
            </div>

            {/* Ranh giới hành chính */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Ranh giới hành chính</h4>
                  <p className="text-[11px] text-slate-500">Viền đứt đỏ trên bản đồ là phạm vi quản lý của địa bàn này</p>
                </div>
                {isEdit && boundary !== baseBoundary && (
                  <button
                    type="button"
                    onClick={() => setBoundary(baseBoundary)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                    title="Khôi phục ranh giới về bản đang lưu"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-[11px]">
                {isLoadingBoundary ? (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang tải ranh giới...
                  </span>
                ) : vertexCount > 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã có ranh giới ({vertexCount} đỉnh)</span>
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">Chưa có ranh giới</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2 shadow-2xs">
              <span className="text-sm shrink-0">💡</span>
              <p className="leading-snug">
                Gõ tên xã/phường rồi <strong>chọn gợi ý</strong> để bản đồ vẽ sẵn ranh giới, sau đó <strong>kéo các chấm</strong> cho khớp. Không có sẵn ranh giới thì bấm <strong>&quot;Vẽ tay ranh giới&quot;</strong>.
              </p>
            </div>
          </div>

          {/* Cột Phải: Bản đồ 2 lớp gán nhãn BBox */}
          <div className="lg:col-span-7 flex flex-col min-h-[420px]">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 h-6 flex items-center mb-1.5 shrink-0">
              Vẽ và tinh chỉnh ranh giới trên bản đồ
            </label>
            <div className="w-full flex-1 rounded-2xl overflow-hidden min-h-[400px]">
              <CommuneBoundaryMap
                key={commune?.commune_id || 'new-commune-modal'}
                boundary={boundary}
                onChange={setBoundary}
                onPickName={(picked) => setName((current) => current.trim() ? current : picked)}
                height="400px"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-95 transition shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm địa bàn'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
export default CommuneFormModal
