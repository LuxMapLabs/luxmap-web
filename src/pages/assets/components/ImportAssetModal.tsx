import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  UploadCloud,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Route,
  Zap,
  Boxes,
  Check,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Info,
  Lightbulb,
  AlertTriangle,
  ShieldAlert,
  Bookmark,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import {
  importAssetRequest,
  resetImportState,
  type ImportAssetCategory,
} from '../../../feature/assets/assetSlice'
import type { ImportRowError } from '../../../types/assets/import'
import type { AssetCategory } from '../AssetManagementPage'
import type { PoleListItem } from '../../../types/assets/poles'
import type { ActiveFixture } from '../../../types/assets/fixtures'
import type { ManagedFixture } from '../../../hooks/assets/useAssetData'
import {
  validateImportRow,
  type FieldDiff,
  type ParsedItemReview,
} from '../../../validations/assetImport.schema'
import { formatCommuneDisplayName, getCommuneName } from '../../../constants/communes'

export type { FieldDiff, ParsedItemReview }

interface CategoryConfig {
  id: AssetCategory
  label: string
  title: string
  icon: React.ReactNode
  templateFileName: string
  templateUrl: string
  description: string
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  poles: {
    id: 'poles' as AssetCategory,
    label: 'Cột điện',
    title: 'Cột Điện Chiếu Sáng',
    icon: <Boxes className="w-5 h-5 text-blue-600" />,
    templateFileName: 'poles.csv',
    templateUrl: '/templates/poles.csv',
    description: 'Nạp danh mục Cột điện theo chuẩn Backend. Hệ thống tự động so khớp tọa độ WKT và các thuộc tính cột.',
  },
  fixtures: {
    id: 'fixtures' as AssetCategory,
    label: 'Bóng đèn',
    title: 'Bóng Đèn Chiếu Sáng',
    icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
    templateFileName: 'fixtures.csv',
    templateUrl: '/templates/fixtures.csv',
    description: 'Nạp danh mục Bóng đèn gắn lên cột. Quản lý công suất (Watt), nguồn điện, ngày lắp đặt và hạn bảo hành theo chuẩn Backend.',
  },
  poles_and_fixtures: {
    id: 'poles_and_fixtures' as AssetCategory,
    label: 'Cột & Bóng đèn',
    title: 'Cột & Bóng Đèn',
    icon: <Boxes className="w-5 h-5 text-blue-600" />,
    templateFileName: 'poles.csv',
    templateUrl: '/templates/poles.csv',
    description: 'Nạp danh mục Cột đèn & Bóng đèn. Hệ thống tự động phát hiện bản ghi Mới, Cập nhật thông số và ẩn các bản ghi không thay đổi.',
  },
  cabinets: {
    id: 'cabinets' as AssetCategory,
    label: 'Tủ điện',
    title: 'Tủ Điện',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    templateFileName: 'cabinets.csv',
    templateUrl: '/templates/cabinets.csv',
    description: 'Nạp danh mục trạm tủ điện chiếu sáng theo chuẩn Backend.',
  },
  segments: {
    id: 'segments' as AssetCategory,
    label: 'Tuyến đường chiếu sáng',
    title: 'Tuyến Đường Chiếu Sáng',
    icon: <Route className="w-5 h-5 text-indigo-600" />,
    templateFileName: 'segments.csv',
    templateUrl: '/templates/segments.csv',
    description: 'Nạp danh mục các tuyến đường giao thông liên xã, liên thôn và trục không gian chiếu sáng.',
  },
}

interface ImportAssetModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (
    importedCount: number,
    newPoles?: PoleListItem[],
    importedFixtures?: ManagedFixture[]
  ) => void
  category?: AssetCategory
}

// Robust CSV Line parser supporting quotes and commas
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result.map((s) => s.replace(/^"|"$/g, ''))
}

const REQUIRED_HEADERS_BY_CATEGORY: Record<string, string[]> = {
  poles: ['external_ref', 'segment_external_ref', 'commune_id', 'geom_wkt', 'data_source'],
  poles_and_fixtures: ['external_ref', 'segment_external_ref', 'commune_id', 'geom_wkt', 'data_source'],
  fixtures: ['pole_external_ref', 'fixture_type', 'power_source', 'lamp_watt', 'install_date', 'data_source'],
  cabinets: ['external_ref', 'cabinet_name', 'commune_id', 'geom_wkt', 'data_source'],
  segments: ['external_ref', 'segment_name', 'road_class', 'length_m', 'geom_wkt', 'commune_id', 'data_source'],
}

export const ImportAssetModal: React.FC<ImportAssetModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  category = 'poles',
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.poles

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string>('')

  // Parsed Items
  const [allParsedItems, setAllParsedItems] = useState<ParsedItemReview[]>([])
  const [totalRowsDetected, setTotalRowsDetected] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importStage, setImportStage] = useState<number>(1)

  // Redux State - Single Source of Truth trực tiếp từ Backend Redux Store
  const dispatch = useDispatch()
  const {
    isImporting,
    importResult,
    poles = [],
    cabinets = [],
    segments = [],
  } = useSelector((state: RootState) => state.assets)

  // Lifecycle hiệu ứng import theo giai đoạn
  useEffect(() => {
    if (isImporting) {
      setImportStage(1)
      const t1 = setTimeout(() => setImportStage(2), 2000)
      const t2 = setTimeout(() => setImportStage(3), 4500)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else {
      setImportStage(1)
    }
  }, [isImporting])

  // Fixtures được trích xuất trực tiếp từ các cột có bóng đèn đang hoạt động
  const fixtures: ManagedFixture[] = React.useMemo(() => {
    return poles
      .filter((p) => p.active_fixture)
      .map((p) => ({
        ...(p.active_fixture as ActiveFixture),
        pole_id: p.pole_id,
        removed_date: null,
      }))
  }, [poles])

  const handleCloseModal = () => {
    dispatch(resetImportState())
    onClose()
  }

  const handleCompleteAndClose = () => {
    if (importResult) {
      const totalSuccess = (importResult.inserted ?? 0) + (importResult.updated ?? 0)
      if (totalSuccess > 0) {
        onImportSuccess(totalSuccess)
      }
    }
    handleCloseModal()
  }

  // Reset state when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null)
      setFileName('')
      setAllParsedItems([])
      setTotalRowsDetected(0)
      setErrorMessage(null)
      dispatch(resetImportState())
    }
  }, [isOpen, category, dispatch])

  if (!isOpen) return null

  // Metric counts
  const newCount = allParsedItems.filter((i) => i.actionType === 'new').length
  const updatedCount = allParsedItems.filter((i) => i.actionType === 'updated').length
  const unchangedCount = allParsedItems.filter((i) => i.actionType === 'unchanged').length
  const invalidCount = allParsedItems.filter((i) => i.actionType === 'invalid').length

  // Actionable import items (new and updated records)
  const importableCount = newCount + updatedCount
  const hasChanges = importableCount > 0

  // CRITICAL REQUIREMENT: Review rows only show NEW, UPDATED, and INVALID items. Unchanged rows are hidden!
  const reviewRows = allParsedItems.filter((i) => i.actionType !== 'unchanged')

  const processCsvText = (text: string, customName?: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        setErrorMessage('Tệp CSV không có dữ liệu (ít nhất cần 1 dòng tiêu đề và 1 dòng dữ liệu)!')
        return
      }

      setFileName(customName || 'file_data.csv')
      setErrorMessage(null)
      dispatch(resetImportState())

      const headerLine = lines[0]
      const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim())

      // KIỂM TRA RÀNG BUỘC CỘT TIÊU ĐỀ THEO TỪNG CATEGORY
      const required = REQUIRED_HEADERS_BY_CATEGORY[category] || []
      const missing = required.filter((r) => !headers.includes(r))
      if (category === 'cabinets') {
        if (!headers.includes('cabinet_name') && !headers.includes('feeder_name')) {
          missing.push('cabinet_name')
        }
      }

      if (missing.length > 0) {
        setAllParsedItems([])
        setTotalRowsDetected(0)
        setErrorMessage(
          `Tệp CSV không đúng định dạng của danh mục này (Thiếu các cột bắt buộc: ${missing.join(', ')}). Vui lòng kiểm tra lại tab đang chọn hoặc tải tệp mẫu chuẩn.`
        )
        return
      }

      const dataLines = lines.slice(1)
      setTotalRowsDetected(dataLines.length)

      const parsed: ParsedItemReview[] = []

      dataLines.forEach((line, index) => {
        const cols = parseCsvLine(line)
        if (cols.length === 0 || (cols.length === 1 && !cols[0])) return

        const rowObj: Record<string, string> = {}
        headers.forEach((h, hIdx) => {
          rowObj[h] = cols[hIdx] !== undefined ? cols[hIdx].trim() : ''
        })

        const reviewedItem = validateImportRow(
          category,
          rowObj,
          { poles, fixtures, cabinets, segments },
          index
        )
        parsed.push(reviewedItem)
      })

      setAllParsedItems(parsed)
    } catch {
      setErrorMessage('Đã xảy ra lỗi khi đọc và phân tích tệp dữ liệu. Vui lòng kiểm tra định dạng CSV!')
    }
  }

  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        processCsvText(text, file.name)
      }
    }
    reader.readAsText(file)
  }

  // Handle Execute Import via Backend API through Redux-Saga
  const handleExecuteImport = () => {
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn một tệp dữ liệu CSV trước khi nạp!')
      return
    }

    if (invalidCount > 0) {
      setErrorMessage(`Tệp chứa ${invalidCount} dòng dữ liệu không hợp lệ hoặc thiếu thông tin. Vui lòng kiểm tra lại bảng xem trước!`)
      return
    }

    if (allParsedItems.length > 0 && !hasChanges) {
      setErrorMessage('Tệp CSV không có dữ liệu mới hoặc thông số kỹ thuật nào thay đổi để nạp vào hệ thống!')
      return
    }

    setErrorMessage(null)
    dispatch(
      importAssetRequest({
        category: category as ImportAssetCategory,
        file: selectedFile,
      })
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={isImporting ? undefined : handleCloseModal}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Main Modal Window */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  Nạp & Kiểm Tra Dữ Liệu: {config.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 overflow-y-auto flex-1">
          {/* Màn hình Loading State khi đang gửi dữ liệu lên Backend */}
          {isImporting ? (
            <div className="py-14 px-6 text-center space-y-5 flex flex-col items-center justify-center animate-in fade-in duration-300">
              {/* Pulsing Glowing Ring */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-lg relative z-10">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>

              {/* Dynamic Status Text */}
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight transition-all duration-300">
                  {importStage === 1 && 'Đang phân tích cấu trúc tệp dữ liệu...'}
                  {importStage === 2 && 'Đang gửi lên máy chủ và kiểm tra ràng buộc không gian...'}
                  {importStage >= 3 && 'Đang đồng bộ hóa vào Cơ sở dữ liệu...'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {importStage === 1 && 'Hệ thống đang tiền xử lý các dòng dữ liệu và ánh xạ trường chuẩn hóa.'}
                  {importStage === 2 && 'Máy chủ Backend đang xác thực tọa độ WKT GIS và quan hệ liên kết dữ liệu.'}
                  {importStage >= 3 && 'Tiến trình lưu trữ và hoàn tất cập nhật vào hệ cơ sở dữ liệu.'}
                </p>
              </div>

              {/* Indeterminate Shimmer Animated Progress Bar */}
              <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: importStage === 1 ? '35%' : importStage === 2 ? '70%' : '95%',
                  }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-[pulse_1.5s_infinite]" />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl max-w-sm text-center">
                <p className="text-[11px] font-medium text-amber-800">
                  ⏳ Quá trình này có thể mất vài giây. Vui lòng không đóng trình duyệt hoặc tải lại trang!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Top Action Bar: Direct Static Template Download (Không gọi API) */}
              {!importResult && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <span>File Mẫu Chuẩn CSV: {config.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tải tệp mẫu định dạng chuẩn UTF-8 (<code className="text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">{config.templateFileName}</code>) để điền dữ liệu trước khi nạp.
                </p>
              </div>

              <a
                href={config.templateUrl}
                download={config.templateFileName}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-100 font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                title={`Tải file mẫu ${config.templateFileName}`}
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                <span>Tải file mẫu CSV</span>
              </a>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          {!importResult && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFileChange(f)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer ${isDragOver
                  ? 'border-blue-500 bg-blue-50/40 scale-[1.005]'
                  : selectedFile || fileName
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileChange(f)
                }}
              />

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-5 h-5" />
                </div>

                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {fileName ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Đã tải tệp: {fileName}</span>
                        {totalRowsDetected > 0 && (
                          <span className="text-xs text-slate-500 font-normal">
                            ({totalRowsDetected} dòng dữ liệu phát hiện)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>Kéo thả tệp CSV vào đây, hoặc nhấp để chọn tệp từ máy tính</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fileName ? (
                      <span className="text-blue-600 font-medium underline">Nhấp để chọn tệp CSV khác</span>
                    ) : (
                      <>Hỗ trợ định dạng CSV chuẩn Backend: UTF-8, dấu phẩy phân tách</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Review Section */}
          {allParsedItems.length > 0 && !importResult && (
            <div className="space-y-4">
              {/* Metrics Scorecards */}
              <div className={`grid ${invalidCount > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                {/* 1. Mới */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Thêm Mới</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-0.5">{newCount}</div>
                  <div className="text-[10px] text-emerald-600">Bản ghi chưa có trên GIS</div>
                </div>

                {/* 2. Cập nhật */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cập Nhật</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-700 mt-0.5">{updatedCount}</div>
                  <div className="text-[10px] text-amber-600">Thay đổi thông số kỹ thuật</div>
                </div>

                {/* 3. Vi phạm ràng buộc (nếu có) */}
                {invalidCount > 0 && (
                  <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-center">
                    <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Vi Phạm Ràng Buộc</span>
                    </div>
                    <div className="text-2xl font-bold text-rose-700 mt-0.5">{invalidCount}</div>
                    <div className="text-[10px] text-rose-600">Lỗi định dạng hoặc thiếu cha</div>
                  </div>
                )}

                {/* 4. Không đổi (Đã ẩn) */}
                <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl text-center opacity-85">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5 text-slate-500" />
                    <span>Không Thay Đổi</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-600 mt-0.5">{unchangedCount}</div>
                  <div className="text-[10px] text-slate-500">Đã tự động ẩn khỏi bảng</div>
                </div>
              </div>

              {/* Requirement Rule Notice */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Bảng xem trước chỉ liệt kê <strong>{reviewRows.length} bản ghi</strong> (gồm{' '}
                    <strong>{newCount} thêm mới</strong>, <strong>{updatedCount} cập nhật</strong>
                    {invalidCount > 0 && <span className="text-rose-600 font-bold">, {invalidCount} lỗi vi phạm</span>}
                    ).{' '}
                    Có <strong>{unchangedCount} bản ghi trùng khớp 100%</strong> đã được tự động ẩn theo yêu cầu.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {invalidCount > 0 && (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      {invalidCount} lỗi
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                    Hiển thị: {reviewRows.length}/{allParsedItems.length}
                  </span>
                </div>
              </div>

              {/* Review Table (Strictly displaying only reviewRows: NEW & UPDATED) */}
              {reviewRows.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-28">Tác vụ</th>
                          <th className="py-2.5 px-3 w-32">
                            {category === 'fixtures'
                              ? 'Cột gắn đèn (Pole)'
                              : category === 'segments'
                                ? 'Mã tuyến đường'
                                : category === 'cabinets'
                                  ? 'Mã tủ điện'
                                  : 'Mã tài sản'}
                          </th>
                          <th className="py-2.5 px-3 w-44">
                            {category === 'fixtures'
                              ? 'Tuyến đường & Tủ điện'
                              : category === 'segments'
                                ? 'Tên tuyến đường'
                                : category === 'cabinets'
                                  ? 'Tên tủ điện'
                                  : 'Vị trí / Tuyến đường'}
                          </th>
                          <th className="py-2.5 px-3 w-36">
                            {category === 'fixtures'
                              ? 'Thông số bóng'
                              : category === 'segments'
                                ? 'Cấp đường / Chiều dài'
                                : category === 'cabinets'
                                  ? 'Khu vực quản lý'
                                  : 'Tọa độ GIS'}
                          </th>
                          <th className="py-2.5 px-3">Chi tiết thay đổi (Cũ ➔ Mới)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewRows.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`transition-colors hover:bg-slate-50/80 ${item.actionType === 'invalid'
                                ? 'bg-rose-50/30'
                                : item.actionType === 'new'
                                  ? 'bg-emerald-50/20'
                                  : 'bg-amber-50/15'
                              }`}
                          >
                            {/* Action Badge */}
                            <td className="py-2.5 px-3 align-top">
                              {item.actionType === 'invalid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Lỗi ràng buộc</span>
                                </span>
                              ) : item.actionType === 'new' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                  <PlusCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Thêm mới</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                  <RefreshCw className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Cập nhật</span>
                                </span>
                              )}
                            </td>

                            {/* Asset ID */}
                            <td className="py-2.5 px-3 align-top font-mono font-bold text-slate-900 text-xs">
                              {item.externalRef}
                            </td>

                            {/* Location */}
                            <td className="py-2.5 px-3 align-top">
                              {(() => {
                                if (item.category === 'fixtures') {
                                  const parentPole = poles.find(
                                    (p) =>
                                      (p.pole_id && p.pole_id === item.data.pole_id) ||
                                      (p.external_ref && p.external_ref.toLowerCase() === item.externalRef.toLowerCase())
                                  )
                                  const seg = segments.find(
                                    (s) =>
                                      (parentPole?.segment_id && s.segment_id === parentPole.segment_id) ||
                                      (parentPole?.segment_id && s.external_ref?.toLowerCase() === parentPole.segment_id.toLowerCase())
                                  )
                                  const cab = cabinets.find(
                                    (c) =>
                                      (parentPole?.feeder_id && (c.cabinet_id === parentPole.feeder_id || c.external_ref === parentPole.feeder_id)) ||
                                      (parentPole?.feeder_id && c.external_ref?.toLowerCase() === parentPole.feeder_id.toLowerCase())
                                  )
                                  return (
                                    <>
                                      <div
                                        className={`truncate max-w-[170px] ${item.actionType === 'invalid'
                                          ? 'text-rose-600 font-medium italic'
                                          : 'font-semibold text-slate-800'
                                        }`}
                                        title={seg?.segment_name || 'Cột ' + item.externalRef}
                                      >
                                        {seg?.segment_name || (item.actionType === 'invalid' ? item.errorMsg : `Cột ${item.externalRef}`)}
                                      </div>
                                      {cab?.cabinet_name ? (
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          {cab.cabinet_name}
                                        </div>
                                      ) : parentPole?.feeder_id ? (
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          Tủ: {parentPole.feeder_id}
                                        </div>
                                      ) : null}
                                    </>
                                  )
                                }

                                if (item.category === 'segments') {
                                  return (
                                    <>
                                      <div className="font-semibold text-slate-800 truncate max-w-[170px]" title={item.data.segment_name || ''}>
                                        {item.data.segment_name || item.externalRef}
                                      </div>
                                      {item.data.commune_id && (
                                        <div className="text-[10px] text-slate-500 font-medium">
                                          Địa bàn: {formatCommuneDisplayName(item.data.commune_id)}
                                        </div>
                                      )}
                                    </>
                                  )
                                }

                                if (item.category === 'cabinets') {
                                  return (
                                    <>
                                      <div className="font-semibold text-slate-800 truncate max-w-[170px]" title={item.data.cabinet_name || ''}>
                                        {item.data.cabinet_name || item.externalRef}
                                      </div>
                                      {item.data.commune_id && (
                                        <div className="text-[10px] text-slate-500 font-medium">
                                          Địa bàn: {formatCommuneDisplayName(item.data.commune_id)}
                                        </div>
                                      )}
                                    </>
                                  )
                                }

                                // Poles
                                const seg = segments.find(
                                  (s) =>
                                    (item.data.segment_id && s.segment_id === item.data.segment_id) ||
                                    (item.data.segment_id && s.external_ref?.toLowerCase() === item.data.segment_id.toLowerCase())
                                )
                                return (
                                  <>
                                    <div className="font-medium text-slate-800 truncate max-w-[170px]" title={seg?.segment_name || ''}>
                                      {seg?.segment_name || (item.data.segment_id ? `Tuyến ${item.data.segment_id}` : 'Chưa gán tuyến')}
                                    </div>
                                    {item.data.feeder_id && (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Tủ: {item.data.feeder_id}
                                      </div>
                                    )}
                                    {item.data.note && (
                                      <div className="text-[10px] text-amber-700 font-medium truncate max-w-[170px] flex items-center gap-1 mt-0.5" title={item.data.note}>
                                        <Bookmark className="w-3 h-3 text-amber-500 shrink-0" />
                                        <span>{item.data.note}</span>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </td>

                            {/* Specs */}
                            <td className="py-2.5 px-3 align-top font-mono text-[10px] text-slate-600">
                              {(() => {
                                if (item.category === 'fixtures') {
                                  return (
                                    <div>
                                      <span className="font-bold text-slate-800">{item.data.lamp_watt} W</span> •{' '}
                                      {item.data.power_source === 'grid' ? 'Lưới điện' : item.data.power_source}
                                    </div>
                                  )
                                }
                                if (item.category === 'segments') {
                                  return (
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        {item.data.road_class === 'inter_commune' ? 'Đường liên xã' : 'Đường liên thôn'}
                                      </span>
                                      {item.data.length_m ? ` • ${item.data.length_m}m` : ''}
                                    </div>
                                  )
                                }
                                if (item.category === 'cabinets') {
                                  return (
                                    <div>
                                      <span className="font-bold text-slate-800">Tủ điện</span>
                                      {item.data.commune_id ? ` • ${getCommuneName(item.data.commune_id)}` : ''}
                                    </div>
                                  )
                                }
                                // Poles
                                return (
                                  <div>
                                    <span className="font-semibold text-slate-700">WKT GIS</span>
                                    {item.data.geom_wkt ? (
                                      <div className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]" title={item.data.geom_wkt}>
                                        {item.data.geom_wkt}
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-slate-400 italic">Chưa có WKT</div>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>

                            {/* Diffs / Changes list or Error */}
                            <td className="py-2.5 px-3 align-top">
                              {item.actionType === 'invalid' ? (
                                <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>{item.errorMsg}</span>
                                </div>
                              ) : item.actionType === 'new' ? (
                                <div className="text-[11px] text-emerald-700 font-medium">
                                  {(() => {
                                    if (item.category === 'fixtures') {
                                      return `Đèn LED ${item.data.lamp_watt}W • Nguồn: ${item.data.power_source === 'grid' ? 'Lưới điện' : 'Mặt trời'} • Hạn BH: ${item.data.warranty_expiry || 'Chưa có'}`
                                    }
                                    if (item.category === 'segments') {
                                      return `Tuyến: ${item.data.segment_name || item.externalRef} • Dài: ${item.data.length_m}m • Cấp: ${item.data.road_class === 'inter_commune' ? 'Liên xã' : 'Liên thôn'}`
                                    }
                                    if (item.category === 'cabinets') {
                                      return `Tủ: ${item.data.cabinet_name || item.externalRef} • ${formatCommuneDisplayName(item.data.commune_id)}`
                                    }
                                    // Poles
                                    return `Tạo mới (${item.fixtureData?.lamp_watt ?? 100}W, ${item.externalRef})${item.data.note ? ` • Ghi chú: ${item.data.note}` : ''}`
                                  })()}
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.diffs.map((d, dIdx) => {
                                    const isPoi = d.label.includes('nhạy cảm') || d.label.includes('POI')
                                    if (isPoi) {
                                      return (
                                        <span
                                          key={dIdx}
                                          className="inline-flex items-center gap-1.5 text-[10px] whitespace-nowrap bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg shadow-2xs font-medium"
                                        >
                                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="font-semibold">{d.label}:</span>
                                          <span className="line-through text-slate-400 whitespace-nowrap">{d.oldVal}</span>
                                          <ArrowRight className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                          <span className="font-bold text-amber-800 whitespace-nowrap">{d.newVal}</span>
                                        </span>
                                      )
                                    }
                                    const isNote = d.label.includes('Ghi chú') || d.label.includes('Atlas')
                                    if (isNote) {
                                      return (
                                        <span
                                          key={dIdx}
                                          className="inline-flex items-center gap-1.5 text-[10px] whitespace-nowrap bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg shadow-2xs font-medium"
                                        >
                                          <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="font-semibold">{d.label}:</span>
                                          <span className="line-through text-slate-400 whitespace-nowrap">{d.oldVal}</span>
                                          <ArrowRight className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                          <span className="font-bold text-amber-800 whitespace-nowrap">{d.newVal}</span>
                                        </span>
                                      )
                                    }
                                    return (
                                      <span
                                        key={dIdx}
                                        className="inline-flex items-center gap-1 text-[10px] whitespace-nowrap bg-white border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs"
                                      >
                                        <span className="font-semibold text-slate-700">{d.label}:</span>
                                        <span className="line-through text-slate-400 whitespace-nowrap">{d.oldVal}</span>
                                        <ArrowRight className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span className="font-bold text-emerald-700 whitespace-nowrap">{d.newVal}</span>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">
                    Tất cả dữ liệu trong tệp đều trùng khớp 100%!
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cả {unchangedCount} bản ghi đều đã có trong hệ thống GIS và không có thông số nào thay đổi,
                    nên không cần cập nhật thêm.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Backend API Import Results Section */}
          {importResult && (
            <div className="p-6 text-center space-y-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kết Quả Nạp {config.label} Từ Backend API:</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Phản Hồi Thành Công
                </span>
              </div>

              {/* 3 Metric Scorecards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Thêm mới
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {importResult.inserted ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Bản ghi tạo mới</div>
                </div>

                <div className="p-3.5 bg-white border border-blue-200 rounded-xl shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Cập nhật
                  </div>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    {importResult.updated ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ghi đè thông số</div>
                </div>

                <div className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-2xs">
                  <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                    Thất bại
                  </div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {importResult.failed ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Dòng bị từ chối</div>
                </div>
              </div>

              {/* Error Rows Details from Backend */}
              {importResult.rows && importResult.rows.length > 0 && (
                <div className="text-left p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Chi tiết các dòng bị Backend từ chối ({importResult.rows.length}):</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] pr-2 font-mono">
                    {importResult.rows.map((err: ImportRowError, idx: number) => (
                      <div key={idx} className="text-rose-700 font-medium">
                        • <strong>Dòng {err.row}:</strong> {err.column ? `Cột '${err.column}' — ` : ''}
                        {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCompleteAndClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs hover:shadow transition cursor-pointer"
                >
                  Hoàn Tất & Xem Danh Sách Tài Sản
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <button
            type="button"
            disabled={isImporting}
            onClick={handleCloseModal}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 cursor-pointer transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importResult || (allParsedItems.length > 0 && !hasChanges) ? 'Đóng' : 'Hủy'}
          </button>

          {!importResult && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedFile || isImporting || (allParsedItems.length > 0 && !hasChanges)}
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs ${
                  !selectedFile || (allParsedItems.length > 0 && !hasChanges)
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-90'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-xs hover:shadow'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Gửi Lên Backend...</span>
                  </>
                ) : !selectedFile ? (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Vui Lòng Chọn Tệp CSV</span>
                  </>
                ) : allParsedItems.length > 0 && !hasChanges ? (
                  invalidCount > 0 && importableCount === 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Không Thể Nạp — Tất Cả Bản Ghi Vi Phạm Lỗi</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Dữ Liệu Trùng Khớp 100% — Không Cần Nạp</span>
                    </>
                  )
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>
                      {newCount > 0 && updatedCount > 0
                        ? `Nạp Vào Hệ Thống (${importableCount} bản ghi: ${newCount} mới, ${updatedCount} sửa)`
                        : newCount > 0
                          ? `Nạp Vào Hệ Thống (${newCount} bản ghi mới)`
                          : `Nạp Vào Hệ Thống (${updatedCount} bản ghi cập nhật)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
