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
import { DownloadIcon } from '../../../components/ops/DownloadIcon'
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
  icon: React.ElementType
  tile: string
  description: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'segments',
    tile: 'bg-teal-100 text-teal-700',
    name: 'Tuyến đường chiếu sáng',
    subtitle: 'Đường trục liên xã, liên thôn',
    icon: Route,
    description: 'Bao gồm tên tuyến, cấp đường, chiều dài (m) và hình học tọa độ LineString WKT.',
  },
  {
    id: 'cabinets',
    tile: 'bg-violet-100 text-violet-700',
    name: 'Tủ điện điều khiển',
    subtitle: 'Trạm tủ điều khiển chiếu sáng',
    icon: Zap,
    description: 'Bao gồm mã tủ, tên trạm tủ điện, xã/phường và tọa độ vị trí Point WKT.',
  },
  {
    id: 'feeders',
    tile: 'bg-emerald-100 text-emerald-700',
    name: 'Tuyến lộ cấp nguồn',
    subtitle: 'Mạch lộ cấp điện hạ thế',
    icon: Cable,
    description: 'Bao gồm mã tuyến lộ, tên lộ cấp nguồn và mã tủ điện liên kết cấp nguồn.',
  },
  {
    id: 'poles',
    tile: 'bg-sky-100 text-sky-700',
    name: 'Cột điện chiếu sáng',
    subtitle: 'Cột đèn và liên kết tuyến',
    icon: Boxes,
    description: 'Bao gồm mã cột, liên kết tuyến đường, lộ cấp điện, địa bàn và tọa độ vị trí Point WKT.',
  },
  {
    id: 'fixtures',
    tile: 'bg-rose-100 text-rose-700',
    name: 'Bộ đèn chiếu sáng',
    subtitle: 'Bóng đèn lắp đặt trên cột',
    icon: Lightbulb,
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
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl border bg-blue-50 text-blue-600 border-blue-200 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Xuất dữ liệu tài sản ra CSV</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn các danh mục tài sản cần xuất (tải nhiều tệp CSV riêng biệt)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
              Chọn danh mục tài sản xuất file:
            </span>
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="text-[13px] font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4 transition-colors cursor-pointer"
            >
              {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = selectedCategories.includes(opt.id)
              const Icon = opt.icon

              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleToggleCategory(opt.id)}
                  className={`group relative p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/70 shadow-[0_10px_22px_-14px_rgba(190,69,122,0.7)]'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${opt.tile}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 pr-6">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px] block">{opt.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block line-clamp-1">
                      {opt.subtitle}
                    </span>
                  </span>
                  <span
                    className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'border-2 border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3.5]" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <span className="hidden sm:block text-[13px] text-slate-500">
            Đã chọn {selectedCategories.length}/{CATEGORY_OPTIONS.length} danh mục
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[13px] font-semibold transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={selectedCategories.length === 0}
              className="download-trigger px-5 py-2 bg-linear-to-br from-teal-500 to-teal-700 hover:shadow-[0_10px_20px_-10px_rgba(190,69,122,0.75)] hover:-translate-y-px active:scale-[0.97] text-white rounded-xl text-[13px] font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>
                {selectedCategories.length > 0
                  ? `Xác nhận xuất (${selectedCategories.length} tệp CSV)`
                  : 'Xác nhận xuất File'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
