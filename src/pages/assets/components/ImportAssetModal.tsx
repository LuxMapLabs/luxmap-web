import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  UploadCloud,
  X,
  Download,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import {
  importAssetRequest,
  resetImportState,
  downloadTemplateRequest,
} from '../../../feature/assets/assetSlice'
import {
  previewAssetWorkbook,
  type WorkbookPreview,
} from '../../../utils/assets/workbookPreview'
import { translateImportMessage } from '../../../utils/assets/translateImportMessage'
import type { WorkbookRowError } from '../../../types/assets/import'

interface ImportAssetModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (importedCount: number) => void
}

const ASSET_SHEETS = [
  'Tuyến đường',
  'Tủ điện',
  'Mạch điện',
  'Cột điện',
  'Bóng đèn',
] as const

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const COLUMN_LABELS: Record<string, string> = {
  external_ref: 'Mã',
  segment_name: 'Tên tuyến',
  road_class: 'Cấp đường',
  length_m: 'Chiều dài (m)',
  geom_wkt: 'Vị trí / hình (WKT)',
  cabinet_name: 'Tên tủ',
  feeder_name: 'Tên mạch',
  cabinet_external_ref: 'Mã tủ',
  cabinet_source: 'Liên kết mạch – tủ',
  segment_external_ref: 'Mã tuyến',
  feeder_external_ref: 'Mã mạch',
  feeder_source: 'Liên kết cột – mạch',
  near_sensitive_poi: 'Gần điểm nhạy cảm',
  note: 'Ghi chú',
  pole_external_ref: 'Mã cột',
  fixture_type: 'Loại đèn',
  power_source: 'Nguồn điện',
  lamp_watt: 'Công suất',
  install_date: 'Ngày lắp',
  lamp_count: 'Số bóng',
  removed_date: 'Ngày tháo',
  warranty_expiry: 'Hết bảo hành',
}

export interface RowErrorGroup {
  column: string
  message: string
  rows: number[]
}

// eslint-disable-next-line react-refresh/only-export-components
export function groupRowErrors(items: WorkbookRowError[]): RowErrorGroup[] {
  const map = new Map<string, { column: string; message: string; rowsSet: Set<number> }>()

  for (const item of items) {
    const column = item.column ?? ''
    const message = item.message ?? ''
    const key = `${column}:::${message}`

    let entry = map.get(key)
    if (!entry) {
      entry = { column, message, rowsSet: new Set<number>() }
      map.set(key, entry)
    }
    if (item.row !== undefined && item.row !== null) {
      entry.rowsSet.add(item.row)
    }
  }

  const result: RowErrorGroup[] = []
  for (const entry of map.values()) {
    result.push({
      column: entry.column,
      message: entry.message,
      rows: Array.from(entry.rowsSet).sort((a, b) => a - b),
    })
  }

  return result
}

export interface SheetErrorGroup {
  sheet: string
  count: number
  groups: RowErrorGroup[]
}

// eslint-disable-next-line react-refresh/only-export-components
export function groupBySheet(items: WorkbookRowError[]): SheetErrorGroup[] {
  const map = new Map<string, WorkbookRowError[]>()

  for (const item of items) {
    const sheet = item.sheet ?? ''
    const list = map.get(sheet)
    if (!list) {
      map.set(sheet, [item])
    } else {
      list.push(item)
    }
  }

  const result: SheetErrorGroup[] = []
  for (const [sheet, sheetItems] of map.entries()) {
    result.push({
      sheet,
      count: sheetItems.length,
      groups: groupRowErrors(sheetItems),
    })
  }

  return result
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatRowLocation(rows: number[]): string {
  if (!rows || rows.length === 0) return 'Toàn tệp'
  if (rows.length === 1 && rows[0] === 1) return 'Tiêu đề'

  const displayed = rows.slice(0, 12).map((r) => (r === 1 ? 'Tiêu đề' : String(r)))
  const excess = rows.length - 12
  const excessText = excess > 0 ? ` +${excess}` : ''

  if (rows[0] === 1) {
    return `${displayed.join(', ')}${excessText}`
  }
  return `Dòng ${displayed.join(', ')}${excessText}`
}

interface IssueListProps {
  groups: RowErrorGroup[]
  tone: 'error' | 'warning'
  forceLocationLabel?: string
}

export const IssueList: React.FC<IssueListProps> = ({
  groups,
  tone,
  forceLocationLabel,
}) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {groups.map((group, idx) => {
        const locationText = forceLocationLabel ?? formatRowLocation(group.rows)
        const hasColumn = Boolean(group.column)
        const vnLabel = hasColumn ? COLUMN_LABELS[group.column] : undefined

        return (
          <div
            key={`${group.column}-${group.message}-${idx}`}
            className="py-2 flex flex-col gap-0.5 sm:flex-row sm:gap-0 text-left"
          >
            {/* Cột trái: Vị trí dòng */}
            <div
              className={`sm:w-24 sm:shrink-0 text-[12px] font-semibold tabular-nums pt-0.5 ${
                tone === 'error'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {locationText}
            </div>

            {/* Cột phải: Nội dung */}
            <div className="flex-1 min-w-0 space-y-0.5">
              {hasColumn && (
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                  {vnLabel ? (
                    <>
                      {vnLabel}{' '}
                      <span className="text-[12px] text-slate-400 dark:text-slate-500 font-normal">
                        {group.column}
                      </span>
                    </>
                  ) : (
                    <span className="text-[12px] text-slate-600 dark:text-slate-400 font-normal">
                      {group.column}
                    </span>
                  )}
                </div>
              )}
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {group.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const ImportAssetModal: React.FC<ImportAssetModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [preview, setPreview] = useState<WorkbookPreview | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const checkCountRef = useRef(0)

  const dispatch = useDispatch()
  const { isImporting, importResult, error, isDownloadingTemplate } = useSelector(
    (state: RootState) => state.assets
  )

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null)
      setClientError(null)
      setPreview(null)
      setIsChecking(false)
      checkCountRef.current += 1
      dispatch(resetImportState())
    }
  }, [isOpen, dispatch])

  const translatedImportRows = useMemo(() => {
    if (!importResult?.rows) return []
    return importResult.rows.map((r) => ({
      ...r,
      message: translateImportMessage(r.message),
    }))
  }, [importResult?.rows])

  const translatedImportWarnings = useMemo(() => {
    if (!importResult?.warnings) return []
    return importResult.warnings.map((w) => ({
      ...w,
      message: translateImportMessage(w.message),
    }))
  }, [importResult?.warnings])

  if (!isOpen) return null

  const handleCloseModal = () => {
    dispatch(resetImportState())
    setSelectedFile(null)
    setClientError(null)
    setPreview(null)
    setIsChecking(false)
    checkCountRef.current += 1
    onClose()
  }

  const handleFileSelection = async (file: File | undefined | null) => {
    if (!file) return
    dispatch(resetImportState())
    checkCountRef.current += 1
    const currentRun = checkCountRef.current

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSelectedFile(null)
      setPreview(null)
      setIsChecking(false)
      setClientError('Chỉ nhận tệp Excel .xlsx.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null)
      setPreview(null)
      setIsChecking(false)
      setClientError('Tệp vượt quá 10 MB.')
      return
    }
    setClientError(null)
    setSelectedFile(file)
    setPreview(null)
    setIsChecking(true)

    try {
      const buffer = await file.arrayBuffer()
      const result = await previewAssetWorkbook(buffer)
      if (checkCountRef.current === currentRun) {
        setPreview(result)
      }
    } catch {
      if (checkCountRef.current === currentRun) {
        setPreview(null)
        setClientError(
          'Không đọc được tệp. Mở bằng Excel, lưu lại dạng .xlsx rồi chọn lại.'
        )
      }
    } finally {
      if (checkCountRef.current === currentRun) {
        setIsChecking(false)
      }
    }
  }

  const handleExecuteImport = () => {
    if (!selectedFile) return
    dispatch(importAssetRequest({ file: selectedFile }))
  }

  const canImport =
    Boolean(selectedFile) &&
    !isChecking &&
    Boolean(preview) &&
    (preview?.issues.length ?? 0) === 0 &&
    (preview?.totalRows ?? 0) > 0 &&
    !isImporting

  const distinctSheetRows = preview
    ? new Set(preview.issues.map((i) => `${i.sheet ?? ''}:::${i.row ?? ''}`)).size
    : 0

  const handleCompleteAndClose = () => {
    if (importResult && importResult.committed) {
      const totalChanges =
        (importResult.segments?.inserted ?? 0) +
        (importResult.segments?.updated ?? 0) +
        (importResult.cabinets?.inserted ?? 0) +
        (importResult.cabinets?.updated ?? 0) +
        (importResult.feeders?.inserted ?? 0) +
        (importResult.feeders?.updated ?? 0) +
        (importResult.poles?.inserted ?? 0) +
        (importResult.poles?.updated ?? 0) +
        (importResult.fixtures?.inserted ?? 0) +
        (importResult.fixtures?.updated ?? 0)

      if (totalChanges > 0) {
        onImportSuccess(totalChanges)
      }
    }
    handleCloseModal()
  }

  const insertedSum =
    (importResult?.segments?.inserted ?? 0) +
    (importResult?.cabinets?.inserted ?? 0) +
    (importResult?.feeders?.inserted ?? 0) +
    (importResult?.poles?.inserted ?? 0) +
    (importResult?.fixtures?.inserted ?? 0)

  const updatedSum =
    (importResult?.segments?.updated ?? 0) +
    (importResult?.cabinets?.updated ?? 0) +
    (importResult?.feeders?.updated ?? 0) +
    (importResult?.poles?.updated ?? 0) +
    (importResult?.fixtures?.updated ?? 0)

  const unchangedSum =
    (importResult?.segments?.unchanged ?? 0) +
    (importResult?.cabinets?.unchanged ?? 0) +
    (importResult?.feeders?.unchanged ?? 0) +
    (importResult?.poles?.unchanged ?? 0) +
    (importResult?.fixtures?.unchanged ?? 0)

  const changed = insertedSum + updatedSum
  const total = changed + unchangedSum

  const getResultCategoryCounts = (sheet: string) => {
    switch (sheet) {
      case 'Tuyến đường':
        return importResult?.segments
      case 'Tủ điện':
        return importResult?.cabinets
      case 'Mạch điện':
        return importResult?.feeders
      case 'Cột điện':
        return importResult?.poles
      case 'Bóng đèn':
        return importResult?.fixtures
      default:
        return undefined
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={isImporting ? undefined : handleCloseModal}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Main Modal Window */}
      <div className="relative w-[calc(100%-32px)] max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Duy nhất một input[type=file] cho cả modal */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            handleFileSelection(f)
            e.target.value = ''
          }}
        />

        {/* Header (không cuộn) */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Nạp tài sản từ Excel
              </h3>
              {!selectedFile ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Mỗi loại tài sản nằm ở một sheet riêng trong cùng một tệp.
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-0.5 min-w-0 text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                  {!isImporting && importResult?.committed !== true && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ml-1 font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                    >
                      Đổi tệp
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body: duy nhất một vùng cuộn */}
        <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300 overflow-y-auto flex-1">
          {/* Trạng thái G: Đang nạp */}
          {isImporting ? (
            <div className="py-14 px-6 text-center space-y-5 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-lg relative z-10">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Đang nạp và kiểm tra dữ liệu...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Quá trình này có thể mất vài giây. Vui lòng không đóng trình duyệt hoặc tải lại trang!
                </p>
              </div>
            </div>
          ) : !importResult ? (
            /* Khi chưa có kết quả từ BE */
            <>
              {/* Trạng thái A: Chưa chọn tệp */}
              {!selectedFile ? (
                <div className="space-y-5 text-left">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <label className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                        Tệp Excel
                      </label>
                      <button
                        type="button"
                        onClick={() => dispatch(downloadTemplateRequest())}
                        disabled={isDownloadingTemplate}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                      >
                        {isDownloadingTemplate ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tạo tệp mẫu…</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải tệp mẫu</span>
                          </>
                        )}
                      </button>
                    </div>

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
                        if (f) handleFileSelection(f)
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-2xl border-2 border-dashed px-5 py-6 transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                        isDragOver
                          ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 bg-white dark:bg-slate-850'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5 text-left">
                        <p className="text-[13px] text-slate-700 dark:text-slate-300">
                          Kéo thả tệp .xlsx vào đây hoặc{' '}
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">
                            chọn từ máy
                          </span>
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                          Tối đa 10 MB
                        </p>
                      </div>
                    </div>

                    {(clientError || error) && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-medium text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{clientError || error}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Hệ thống chỉ lưu khi cả tệp hợp lệ. Có lỗi thì không lưu dòng nào.
                  </p>
                </div>
              ) : (
                /* Đã chọn tệp: Trạng thái B, C, D, E, F */
                <div className="space-y-4 text-left">
                  {/* Trạng thái B: Đang kiểm tra */}
                  {isChecking && (
                    <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>Đang kiểm tra tệp…</span>
                    </div>
                  )}

                  {/* Trạng thái C: Đọc tệp lỗi */}
                  {!isChecking && clientError && (
                    <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-rose-500 text-rose-800 dark:text-rose-300">
                      <span className="font-semibold">{clientError}</span>
                    </p>
                  )}

                  {/* Lỗi từ store khi không có preview */}
                  {!isChecking && !clientError && error && !preview && (
                    <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-rose-500 text-rose-800 dark:text-rose-300">
                      <span className="font-semibold">{error}</span>
                    </p>
                  )}

                  {/* Trạng thái D, E, F khi đã có preview */}
                  {!isChecking && !clientError && preview && (
                    <>
                      {preview.issues.length > 0 ? (
                        /* Trạng thái D: Preview có lỗi */
                        <div className="space-y-4">
                          <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-rose-500 text-rose-800 dark:text-rose-300">
                            <span className="font-semibold">
                              {preview.issues.length} lỗi ở {distinctSheetRows} dòng.
                            </span>{' '}
                            Chưa gửi gì lên hệ thống, sửa trong Excel rồi chọn lại tệp.
                          </p>

                          {/* Lỗi Toàn tệp (nếu có) */}
                          {(() => {
                            const globalIssues = preview.issues.filter(
                              (i) => !i.sheet || !ASSET_SHEETS.includes(i.sheet as (typeof ASSET_SHEETS)[number])
                            )
                            if (globalIssues.length === 0) return null
                            return (
                              <div className="mb-2">
                                <IssueList
                                  groups={groupRowErrors(globalIssues)}
                                  tone="error"
                                  forceLocationLabel="Toàn tệp"
                                />
                              </div>
                            )
                          })()}

                          {/* Bảng sheet có cột Lỗi */}
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                                  Loại tài sản
                                </th>
                                <th scope="col" className="py-2.5 px-3 text-right font-medium w-[88px]">
                                  Số dòng
                                </th>
                                <th scope="col" className="py-2.5 pl-3 pr-0 text-right font-medium w-[88px]">
                                  Lỗi
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ASSET_SHEETS.map((sheetName) => {
                                const sheetSummary = preview.sheets.find(
                                  (s) => s.sheet === sheetName
                                )
                                const rowCount = sheetSummary?.rows ?? 0
                                const sheetIssues = preview.issues.filter(
                                  (i) => i.sheet === sheetName
                                )

                                return (
                                  <React.Fragment key={sheetName}>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                      <th
                                        scope="row"
                                        className="py-2.5 pr-3 text-[13px] font-semibold text-slate-800 dark:text-slate-200 text-left"
                                      >
                                        {sheetName}
                                      </th>
                                      <td className="py-2.5 px-3 text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300 w-[88px]">
                                        {rowCount > 0 ? (
                                          rowCount
                                        ) : (
                                          <span className="text-slate-400 dark:text-slate-500">-</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums w-[88px]">
                                        {sheetIssues.length > 0 ? (
                                          <span className="font-semibold text-rose-700 dark:text-rose-400">
                                            {sheetIssues.length}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 dark:text-slate-500">-</span>
                                        )}
                                      </td>
                                    </tr>
                                    {sheetIssues.length > 0 && (
                                      <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <td colSpan={3} className="pl-4 pr-0 py-2">
                                          <IssueList
                                            groups={groupRowErrors(sheetIssues)}
                                            tone="error"
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : preview.totalRows === 0 ? (
                        /* Trạng thái E: Preview trống */
                        <div className="space-y-4">
                          <div className="text-[13px] leading-relaxed pl-3 border-l-2 border-slate-300 text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Tệp chưa có dòng dữ liệu nào.</span> Điền
                            dữ liệu vào các sheet tài sản của tệp mẫu rồi chọn lại.{' '}
                            <button
                              type="button"
                              onClick={() => dispatch(downloadTemplateRequest())}
                              disabled={isDownloadingTemplate}
                              className="font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDownloadingTemplate ? 'Đang tạo tệp mẫu…' : 'Tải tệp mẫu'}
                            </button>
                          </div>

                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                                  Loại tài sản
                                </th>
                                <th scope="col" className="py-2.5 pl-3 pr-0 text-right font-medium w-[88px]">
                                  Số dòng
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ASSET_SHEETS.map((sheetName) => (
                                <tr
                                  key={sheetName}
                                  className="border-b border-slate-100 dark:border-slate-800"
                                >
                                  <th
                                    scope="row"
                                    className="py-2.5 pr-3 text-[13px] font-semibold text-slate-800 dark:text-slate-200 text-left"
                                  >
                                    {sheetName}
                                  </th>
                                  <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums text-slate-400 dark:text-slate-500 w-[88px]">
                                    -
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Trạng thái F: Preview sạch */
                        <div className="space-y-4">
                          <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-emerald-500 text-emerald-800 dark:text-emerald-300">
                            <span className="font-semibold">Tệp hợp lệ,</span> {preview.totalRows} dòng
                            sẵn sàng nạp.
                          </p>

                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                                  Loại tài sản
                                </th>
                                <th scope="col" className="py-2.5 pl-3 pr-0 text-right font-medium w-[88px]">
                                  Số dòng
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ASSET_SHEETS.map((sheetName) => {
                                const sheetSummary = preview.sheets.find(
                                  (s) => s.sheet === sheetName
                                )
                                const rowCount = sheetSummary?.rows ?? 0
                                return (
                                  <tr
                                    key={sheetName}
                                    className="border-b border-slate-100 dark:border-slate-800"
                                  >
                                    <th
                                      scope="row"
                                      className="py-2.5 pr-3 text-[13px] font-semibold text-slate-800 dark:text-slate-200 text-left"
                                    >
                                      {sheetName}
                                    </th>
                                    <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300 w-[88px]">
                                      {rowCount > 0 ? (
                                        rowCount
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500">-</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                              <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                                <th
                                  scope="row"
                                  className="py-2.5 pr-3 text-[13px] font-semibold text-slate-900 dark:text-white text-left"
                                >
                                  Tổng
                                </th>
                                <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums font-semibold text-slate-900 dark:text-white w-[88px]">
                                  {preview.totalRows}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            Hệ thống lưu cả tệp trong một lần. Có lỗi thì không lưu dòng nào.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : importResult.committed === false ? (
            /* Trạng thái H: BE trả committed === false */
            <div className="space-y-4 text-left">
              <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-rose-500 text-rose-800 dark:text-rose-300">
                <span className="font-semibold">Chưa lưu dữ liệu nào.</span>{' '}
                {importResult.total_errors ?? translatedImportRows.length} lỗi ở{' '}
                {importResult.failed ?? 0} dòng, sửa trong Excel rồi chọn lại tệp.
              </p>

              {/* Lỗi Toàn tệp (nếu có) */}
              {(() => {
                const globalRows = translatedImportRows.filter(
                  (i) => !i.sheet || !ASSET_SHEETS.includes(i.sheet as (typeof ASSET_SHEETS)[number])
                )
                if (globalRows.length === 0) return null
                return (
                  <div className="mb-2">
                    <IssueList
                      groups={groupRowErrors(globalRows)}
                      tone="error"
                      forceLocationLabel="Toàn tệp"
                    />
                  </div>
                )
              })()}

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                      Loại tài sản
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium w-[88px]">
                      Số dòng
                    </th>
                    <th scope="col" className="py-2.5 pl-3 pr-0 text-right font-medium w-[88px]">
                      Lỗi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ASSET_SHEETS.map((sheetName) => {
                    const sheetSummary = preview?.sheets.find((s) => s.sheet === sheetName)
                    const rowCount = sheetSummary?.rows
                    const sheetErrors = translatedImportRows.filter(
                      (i) => i.sheet === sheetName
                    )

                    return (
                      <React.Fragment key={sheetName}>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th
                            scope="row"
                            className="py-2.5 pr-3 text-[13px] font-semibold text-slate-800 dark:text-slate-200 text-left"
                          >
                            {sheetName}
                          </th>
                          <td className="py-2.5 px-3 text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300 w-[88px]">
                            {rowCount !== undefined && rowCount > 0 ? (
                              rowCount
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums w-[88px]">
                            {sheetErrors.length > 0 ? (
                              <span className="font-semibold text-rose-700 dark:text-rose-400">
                                {sheetErrors.length}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                        </tr>
                        {sheetErrors.length > 0 && (
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <td colSpan={3} className="pl-4 pr-0 py-2">
                              <IssueList groups={groupRowErrors(sheetErrors)} tone="error" />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {importResult.truncated && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  Đang hiện {translatedImportRows.length} lỗi đầu tiên trên tổng{' '}
                  {importResult.total_errors ?? 0}.
                </p>
              )}
            </div>
          ) : (
            /* Trạng thái I: BE trả committed === true */
            <div className="space-y-4 text-left">
              {total === 0 ? (
                <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-slate-300 text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Tệp chưa có dòng dữ liệu nào.</span> Điền
                  dữ liệu vào các sheet tài sản của tệp mẫu rồi nạp lại.
                </p>
              ) : changed === 0 ? (
                <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-slate-300 text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Không có thay đổi nào.</span> Mọi tài sản
                  trong tệp đã khớp với dữ liệu trên hệ thống.
                </p>
              ) : (
                <p className="text-[13px] leading-relaxed pl-3 border-l-2 border-emerald-500 text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">Đã lưu vào hệ thống.</span> Thêm mới{' '}
                  {insertedSum}, cập nhật {updatedSum} tài sản.
                </p>
              )}

              {/* Cảnh báo Toàn tệp (nếu có) */}
              {(() => {
                const globalWarnings = translatedImportWarnings.filter(
                  (w) => !w.sheet || !ASSET_SHEETS.includes(w.sheet as (typeof ASSET_SHEETS)[number])
                )
                if (globalWarnings.length === 0) return null
                return (
                  <div className="mb-2">
                    <IssueList
                      groups={groupRowErrors(globalWarnings)}
                      tone="warning"
                      forceLocationLabel="Toàn tệp"
                    />
                  </div>
                )
              })()}

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                      Loại tài sản
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium w-[88px]">
                      Thêm mới
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium w-[88px]">
                      Cập nhật
                    </th>
                    <th scope="col" className="py-2.5 pl-3 pr-0 text-right font-medium w-[88px]">
                      Không đổi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ASSET_SHEETS.map((sheetName) => {
                    const counts = getResultCategoryCounts(sheetName)
                    const sheetWarnings = translatedImportWarnings.filter(
                      (w) => w.sheet === sheetName
                    )

                    return (
                      <React.Fragment key={sheetName}>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th
                            scope="row"
                            className="py-2.5 pr-3 text-[13px] font-semibold text-slate-800 dark:text-slate-200 text-left"
                          >
                            {sheetName}
                          </th>
                          <td className="py-2.5 px-3 text-right text-[13px] tabular-nums w-[88px]">
                            <span
                              className={
                                (counts?.inserted ?? 0) > 0
                                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }
                            >
                              {counts?.inserted ?? 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[13px] tabular-nums w-[88px]">
                            <span
                              className={
                                (counts?.updated ?? 0) > 0
                                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }
                            >
                              {counts?.updated ?? 0}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 pr-0 text-right text-[13px] tabular-nums w-[88px]">
                            <span
                              className={
                                (counts?.unchanged ?? 0) > 0
                                  ? 'text-slate-700 dark:text-slate-300 font-medium'
                                  : 'text-slate-400 dark:text-slate-500'
                              }
                            >
                              {counts?.unchanged ?? 0}
                            </span>
                          </td>
                        </tr>
                        {sheetWarnings.length > 0 && (
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <td colSpan={4} className="pl-4 pr-0 py-2">
                              <IssueList
                                groups={groupRowErrors(sheetWarnings)}
                                tone="warning"
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer (không cuộn) */}
        <div
          className={`px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center shrink-0 ${
            importResult?.committed === true ? 'justify-end' : 'justify-between'
          }`}
        >
          {importResult?.committed !== true && (
            <button
              type="button"
              disabled={isImporting}
              onClick={handleCloseModal}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {importResult ? 'Đóng' : 'Hủy'}
            </button>
          )}

          {!importResult && (
            <>
              {preview && preview.issues.length > 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-linear-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Chọn tệp khác</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canImport}
                  onClick={handleExecuteImport}
                  className={`px-5 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    !canImport
                      ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-90'
                      : 'bg-linear-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white cursor-pointer active:scale-95 shadow-xs hover:shadow'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {canImport
                      ? `Xác nhận nạp ${preview?.totalRows ?? 0} dòng`
                      : 'Xác nhận nạp'}
                  </span>
                </button>
              )}
            </>
          )}

          {importResult && importResult.committed === false && (
            <button
              type="button"
              onClick={() => {
                dispatch(resetImportState())
                setSelectedFile(null)
                setClientError(null)
                setPreview(null)
                setIsChecking(false)
                checkCountRef.current += 1
              }}
              className="px-5 py-2.5 bg-linear-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Chọn tệp khác</span>
            </button>
          )}

          {importResult && importResult.committed === true && (
            <button
              type="button"
              onClick={handleCompleteAndClose}
              className="px-6 py-2.5 bg-linear-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <span>Xong</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
