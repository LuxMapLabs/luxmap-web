import React, { useState, useMemo } from 'react'
import { X, Compass, AlertCircle, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react'
import type { CommuneItem, CommuneBbox } from '../../../types/admin/communes'
import { CommuneBboxMap } from './CommuneBboxMap'

export interface CommuneFormModalProps {
  isOpen: boolean
  isSubmitting?: boolean
  commune?: CommuneItem | null
  onClose: () => void
  onSubmit: (payload: { name: string; bbox?: CommuneBbox | null }) => void
}

export const CommuneFormModal: React.FC<CommuneFormModalProps> = ({
  isOpen,
  isSubmitting = false,
  commune = null,
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(commune)

  const [name, setName] = useState('')
  const [bbox, setBbox] = useState<CommuneBbox | null>(null)
  const [hasBbox, setHasBbox] = useState(false)
  const [resetBboxKey, setResetBboxKey] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Đồng bộ state ngay trong pha render khi mở modal hoặc đổi địa bàn để bản đồ nhận ngay BBox ở frame đầu tiên (0ms)
  const [prevSyncTrigger, setPrevSyncTrigger] = useState<{
    isOpen: boolean
    communeId: string | number | null
  }>({ isOpen: false, communeId: null })

  const currentCommuneId = commune?.commune_id ?? null
  if (prevSyncTrigger.isOpen !== isOpen || prevSyncTrigger.communeId !== currentCommuneId) {
    setPrevSyncTrigger({ isOpen, communeId: currentCommuneId })
    if (isOpen) {
      if (commune) {
        setName(commune.name || '')
        if (commune.bbox) {
          setBbox({ ...commune.bbox })
          setHasBbox(true)
        } else {
          setBbox(null)
          setHasBbox(false)
        }
      } else {
        setName('')
        setBbox(null)
        setHasBbox(false)
      }
      setResetBboxKey(0)
      setErrors({})
    }
  }

  // Tính kích thước X × Y (km) của khung BBox
  const bboxDimensionText = useMemo(() => {
    if (!hasBbox || !bbox) return ''
    const minLng = Number(bbox.min_lng)
    const maxLng = Number(bbox.max_lng)
    const minLat = Number(bbox.min_lat)
    const maxLat = Number(bbox.max_lat)
    if (
      !Number.isFinite(minLng) ||
      !Number.isFinite(maxLng) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat)
    ) {
      return ''
    }
    const widthKm = (Math.abs(maxLng - minLng) * 109.2).toFixed(2)
    const heightKm = (Math.abs(maxLat - minLat) * 111.32).toFixed(2)
    return `${widthKm} km × ${heightKm} km`
  }, [bbox, hasBbox])

  if (!isOpen) return null

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = 'Tên địa bàn không được để trống'
    } else if (name.trim().length > 200) {
      newErrors.name = 'Tên địa bàn tối đa 200 ký tự'
    }

    if (hasBbox && bbox) {
      const { min_lng, min_lat, max_lng, max_lat } = bbox
      if (
        typeof min_lng !== 'number' ||
        typeof min_lat !== 'number' ||
        typeof max_lng !== 'number' ||
        typeof max_lat !== 'number' ||
        !Number.isFinite(min_lng) ||
        !Number.isFinite(min_lat) ||
        !Number.isFinite(max_lng) ||
        !Number.isFinite(max_lat)
      ) {
        newErrors.bbox = 'Tọa độ 4 cạnh của khung BBox phải là số hợp lệ'
      } else {
        if (min_lng >= max_lng) {
          newErrors.bbox = 'Kinh độ Tây (min_lng) phải nhỏ hơn Kinh độ Đông (max_lng)'
        }
        if (min_lat >= max_lat) {
          newErrors.bbox = 'Vĩ độ Nam (min_lat) phải nhỏ hơn Vĩ độ Bắc (max_lat)'
        }
        if (min_lng < -180 || max_lng > 180 || min_lat < -90 || max_lat > 90) {
          newErrors.bbox = 'Tọa độ nằm ngoài phạm vi địa lý toàn cầu (EPSG:4326)'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      name: name.trim(),
      bbox: hasBbox ? bbox : null,
    })
  }

  // Cập nhật từng cạnh BBox từ ô input hỗ trợ cả dấu phẩy lẫn dấu chấm
  const handleCoordInputChange = (key: keyof CommuneBbox, val: string) => {
    const normalized = val.trim().replace(',', '.')
    const num = parseFloat(normalized)
    setBbox((prev) => {
      const current = prev || { min_lng: 106.47, min_lat: 10.95, max_lng: 106.53, max_lat: 11.01 }
      return {
        ...current,
        [key]: isNaN(num) ? (val as any) : num,
      }
    })
    setHasBbox(true)
  }

  // Đặt lại khung BBox về giá trị gốc ban đầu của địa bàn
  const handleResetBbox = () => {
    if (commune?.bbox) {
      setBbox({ ...commune.bbox })
      setHasBbox(true)
    } else {
      setBbox(null)
      setHasBbox(false)
    }
    setErrors((prev) => {
      const next = { ...prev }
      delete next.bbox
      return next
    })
    setResetBboxKey((prev) => prev + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? `Cập Nhật Địa Bàn: ${commune?.name || commune?.commune_id}` : 'Thêm Địa Bàn Hành Chính Mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? 'Chỉnh sửa tên và thiết lập khung bao bản đồ (BBox)'
                  : 'Khai báo tên xã/thị trấn và vẽ khung bản đồ định vị'}
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
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Tên Địa Bàn Xã / Thị Trấn <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Thị trấn Củ Chi, Xã Tân An Hội..."
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                  errors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.name && <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name}</p>}
            </div>

            {/* Toggle Khung BBox */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Khung Bao Bản Đồ (Bounding Box BBox)
                  </h4>
                  <p className="text-[11px] text-slate-500">Giới hạn vùng camera khi người dùng mở bản đồ địa bàn này</p>
                </div>
                {isEdit
                  ? commune?.bbox && (
                      <button
                        type="button"
                        onClick={handleResetBbox}
                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                        title="Khôi phục tọa độ khung BBox về giá trị gốc ban đầu"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại</span>
                      </button>
                    )
                  : hasBbox && (
                      <button
                        type="button"
                        onClick={handleResetBbox}
                        className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Xóa bỏ khung BBox vừa vẽ để vẽ lại từ đầu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa bỏ</span>
                      </button>
                    )}
              </div>

              {errors.bbox && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.bbox}</span>
                </div>
              )}

              {/* 4 Ô Nhập Số Tọa Độ */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Kinh độ Tây (min_lng)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={bbox?.min_lng ?? ''}
                      onChange={(e) => handleCoordInputChange('min_lng', e.target.value)}
                      placeholder="106.45..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Vĩ độ Nam (min_lat)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={bbox?.min_lat ?? ''}
                      onChange={(e) => handleCoordInputChange('min_lat', e.target.value)}
                      placeholder="10.95..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Kinh độ Đông (max_lng)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={bbox?.max_lng ?? ''}
                      onChange={(e) => handleCoordInputChange('max_lng', e.target.value)}
                      placeholder="106.52..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Vĩ độ Bắc (max_lat)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={bbox?.max_lat ?? ''}
                      onChange={(e) => handleCoordInputChange('max_lat', e.target.value)}
                      placeholder="11.02..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Kích thước:{' '}
                    <strong className="text-blue-600 dark:text-blue-400 font-mono">
                      {bboxDimensionText || '—'}
                    </strong>
                  </span>
                  {hasBbox ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã gắn khung</span>
                    </span>
                  ) : (
                    <span className="text-amber-500">Chưa có khung BBox</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hướng dẫn thao tác nhanh */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1 text-[11px] text-blue-900 dark:text-blue-300">
              <p className="font-bold">💡 Mẹo tinh chỉnh khung BBox trên bản đồ:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-800 dark:text-blue-400">
                <li>Nắm kéo <strong>4 chốt góc vuông</strong> hoặc <strong>4 nhãn hướng (Bắc, Nam, Tây, Đông)</strong> trên cạnh khung để kéo dài hoặc thu nhỏ khung.</li>
                <li>Tick vào <strong>&quot;Di chuyển khung&quot;</strong> trên góc bản đồ để nắm kéo di chuyển toàn bộ khung BBox; bỏ tick để khóa vị trí khung.</li>
                {isEdit ? (
                  <li>Bấm <strong>&quot;Đặt lại&quot;</strong> để khôi phục tọa độ khung về trạng thái gốc ban đầu.</li>
                ) : (
                  <li>Bấm <strong>&quot;Xóa bỏ&quot;</strong> nếu muốn xóa khung BBox vừa vẽ để vẽ lại khung mới.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Cột Phải: Bản đồ 2 lớp gán nhãn BBox */}
          <div className="lg:col-span-7 flex flex-col min-h-[420px]">
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 shrink-0">
              Bản Đồ Vẽ & Tinh Chỉnh Khung BBox Trực Quan
            </label>
            <div className="w-full flex-1 rounded-2xl overflow-hidden min-h-[400px]">
              <CommuneBboxMap
                key={commune?.commune_id || 'new-commune-modal'}
                bbox={bbox}
                communeName={name}
                onChangeBbox={(newBbox) => {
                  setBbox(newBbox)
                  setHasBbox(Boolean(newBbox))
                }}
                readOnly={false}
                isCreateMode={!isEdit}
                height="400px"
                resetKey={resetBboxKey}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end gap-3">
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
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu Thay Đổi' : 'Thêm Địa Bàn'}
          </button>
        </div>
      </div>
    </div>
  )
}
export default CommuneFormModal
