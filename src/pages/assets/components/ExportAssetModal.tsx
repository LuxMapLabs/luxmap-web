import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  X,
  Route,
  Zap,
  Cable,
  Boxes,
  Lightbulb,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PoleListItem } from '../../../types/assets/poles'
import type { CabinetListItem } from '../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../types/assets/segments'
import type { FeederListItem } from '../../../types/assets/feeders'
import type { ManagedFixture } from '../../../hooks/assets/useAssetData'
import {
  exportPolesToCsv,
  exportCabinetsToCsv,
  exportFixturesToCsv,
  exportSegmentsToCsv,
  exportFeedersToCsv,
  downloadCsvWithBom,
  getExportFilename,
} from '../../../utils/assets/assetCsvExporter'

export type ExportableCategory = 'segments' | 'cabinets' | 'feeders' | 'poles' | 'fixtures'

export interface ExportAssetModalProps {
  isOpen: boolean
  onClose: () => void
  initialCategory?: ExportableCategory
  poles: PoleListItem[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  feeders: FeederListItem[]
  fixtures: ManagedFixture[]
  filteredData?: {
    category: ExportableCategory
    items: unknown[]
  }
}

interface CategoryOption {
  id: ExportableCategory
  name: string
  subtitle: string
  icon: React.ReactNode
  activeColor: string
  description: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'segments',
    name: 'Tuyến đường chiếu sáng',
    subtitle: 'Đường trục liên xã, liên thôn',
    icon: <Route className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    activeColor: 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30',
    description: 'Bao gồm tên tuyến, cấp đường, chiều dài (m) và hình học tọa độ LineString WKT.',
  },
  {
    id: 'cabinets',
    name: 'Tủ điện điều khiển',
    subtitle: 'Trạm tủ điều khiển chiếu sáng',
    icon: <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
    activeColor: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30',
    description: 'Bao gồm mã tủ, tên trạm tủ điện, xã/phường và tọa độ vị trí Point WKT.',
  },
  {
    id: 'feeders',
    name: 'Tuyến lộ cấp nguồn',
    subtitle: 'Mạch lộ cấp điện hạ thế',
    icon: <Cable className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    activeColor: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30',
    description: 'Bao gồm mã tuyến lộ, tên lộ cấp nguồn và mã tủ điện liên kết cấp nguồn.',
  },
  {
    id: 'poles',
    name: 'Cột điện chiếu sáng',
    subtitle: 'Cột đèn và liên kết tuyến',
    icon: <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    activeColor: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30',
    description: 'Bao gồm mã cột, liên kết tuyến đường, lộ cấp điện, địa bàn và tọa độ vị trí Point WKT.',
  },
  {
    id: 'fixtures',
    name: 'Bộ đèn chiếu sáng',
    subtitle: 'Bóng đèn lắp đặt trên cột',
    icon: <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
    activeColor: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30',
    description: 'Bao gồm mã cột gắn đèn, loại bóng LED, công suất (Watt), nguồn điện và ngày lắp đặt.',
  },
]

export const ExportAssetModal: React.FC<ExportAssetModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'poles',
  poles,
  cabinets,
  segments,
  feeders,
  fixtures,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<ExportableCategory[]>([initialCategory])

  // Khi modal mở, tự động chọn category tab hiện tại
  useEffect(() => {
    if (isOpen) {
      setSelectedCategories([initialCategory])
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  // Xử lý bật/tắt lựa chọn một danh mục
  const handleToggleCategory = (catId: ExportableCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  // Chọn tất cả
  const handleSelectAll = () => {
    setSelectedCategories(CATEGORY_OPTIONS.map((c) => c.id))
  }

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedCategories([])
  }

  const isAllSelected = selectedCategories.length === CATEGORY_OPTIONS.length

  // Xử lý xuất nhiều file CSV tương ứng
  const handleExport = () => {
    if (selectedCategories.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một danh mục tài sản để xuất!')
      return
    }

    try {
      selectedCategories.forEach((cat, index) => {
        setTimeout(() => {
          let csvContent = ''

          if (cat === 'poles') {
            csvContent = exportPolesToCsv(poles, segments, feeders)
          } else if (cat === 'cabinets') {
            csvContent = exportCabinetsToCsv(cabinets)
          } else if (cat === 'fixtures') {
            csvContent = exportFixturesToCsv(fixtures, poles)
          } else if (cat === 'segments') {
            csvContent = exportSegmentsToCsv(segments)
          } else if (cat === 'feeders') {
            csvContent = exportFeedersToCsv(feeders, cabinets)
          }

          const filename = getExportFilename(cat)
          downloadCsvWithBom(filename, csvContent)
        }, index * 200)
      })

      if (selectedCategories.length === 1) {
        toast.success(`Đang tải xuống tệp ${getExportFilename(selectedCategories[0])}`)
      } else {
        toast.success(`Đang tải xuống ${selectedCategories.length} tệp CSV riêng biệt...`)
      }

      onClose()
    } catch (error) {
      console.error('Lỗi khi xuất CSV:', error)
      toast.error('Có lỗi xảy ra khi tạo tệp CSV. Vui lòng thử lại!')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Main Dialog Window */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
                Xuất Dữ Liệu Tài Sản Ra CSV
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chọn các danh mục tài sản cần xuất (tải nhiều tệp CSV riêng biệt)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 text-xs text-slate-700 dark:text-slate-300 overflow-y-auto flex-1">
          {/* Danh mục tài sản (Multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Chọn danh mục tài sản xuất file:
              </label>
              <div className="flex items-center gap-2">
                {isAllSelected ? (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const isSelected = selectedCategories.includes(opt.id)

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleCategory(opt.id)}
                    className={`relative p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? `${opt.activeColor} border-2 shadow-xs`
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                        {opt.name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {opt.subtitle}
                      </p>
                    </div>

                    <div
                      className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedCategories.length === 0}
            className="px-5 py-2 bg-[#1f3864] hover:bg-[#1f3864]/90 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {selectedCategories.length > 0
                ? `Xác Nhận Xuất (${selectedCategories.length} tệp CSV)`
                : 'Xác Nhận Xuất File'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
