import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import type { AppDispatch, RootState } from '../../../redux/store'
import {
  downloadNodeTemplateRequest,
  importNodesRequest,
  resetNodeImport,
} from '../../../feature/iot/iotBridgeSlice'
import type { IotNodeImportItem } from '../../../types/iot/nodes'
import { AssetModalFrame, AssetModalHeader } from '../../assets/components/common/AssetModal'

const MAX_FILE_BYTES = 5 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** Kiểm tra file phía FE trước khi gửi: trả về thông báo lỗi, hoặc null nếu hợp lệ. */
function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.xlsx')) return 'Chỉ hỗ trợ tệp Excel định dạng .xlsx.'
  if (file.size > MAX_FILE_BYTES) return 'Dung lượng tệp vượt quá giới hạn 5 MB.'
  return null
}

function renderRowResult(item: IotNodeImportItem) {
  if (item.status === 'created') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" aria-hidden />
          Đã tạo
        </span>
        <span className="font-mono font-bold text-slate-800">{item.node_id || '-'}</span>
      </div>
    )
  }
  if (item.status === 'existing') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Layers className="w-3 h-3" aria-hidden />
          Đã có
        </span>
        <span className="font-mono font-bold text-slate-700">{item.node_id || '-'}</span>
      </div>
    )
  }
  if (item.status === 'failed') {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <CircleAlert className="w-3 h-3" aria-hidden />
            Lỗi
          </span>
          <span className="text-rose-700 font-medium">{item.error?.message || '-'}</span>
        </div>
        {(item.error?.field || item.error?.code) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {item.error?.field && (
              <span>
                Cột: <span className="font-mono text-slate-700">{item.error.field}</span>
              </span>
            )}
            {item.error?.code && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {item.error.code}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
  return <span className="text-slate-500">{item.status || '-'}</span>
}

/** Một ô số liệu trong dải tóm tắt kết quả. */
const Stat: React.FC<{ label: string; value: number; tone: 'slate' | 'emerald' | 'rose' | 'ink' }> = ({
  label,
  value,
  tone,
}) => {
  const toneClass = {
    ink: 'text-slate-900',
    slate: 'text-slate-600',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
  }[tone]
  return (
    <div className="flex-1 min-w-[72px]">
      <div className={`text-xl font-bold leading-none tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  )
}

/**
 * Modal nhập danh sách node IoT từ tệp Excel (.xlsx) cho Admin (`POST /api/v1/iot/nodes/import`).
 * Hai bước: chọn file (kéo thả hoặc bấm chọn) rồi xem kết quả từng dòng.
 */
export const ImportNodesModal: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { nodeImport, nodeImportError, nodeImportResult, nodeTemplateDownloading } = useSelector(
    (state: RootState) => state.iotBridge
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [onlyFailed, setOnlyFailed] = useState(false)

  const submitting = nodeImport === 'submitting'
  const hasResult = nodeImportResult !== null

  useEffect(() => {
    dispatch(resetNodeImport())
    return () => {
      dispatch(resetNodeImport())
    }
  }, [dispatch])

  const acceptFile = (file: File | null) => {
    setFileError(null)
    if (!file) {
      setSelectedFile(null)
      return
    }
    const error = validateFile(file)
    if (error) {
      setSelectedFile(null)
      setFileError(error)
      return
    }
    setSelectedFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (submitting) return
    acceptFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleImport = () => {
    if (!selectedFile || submitting || fileError) return
    dispatch(importNodesRequest(selectedFile))
  }

  const handleResetForAnotherFile = () => {
    dispatch(resetNodeImport())
    setSelectedFile(null)
    setFileError(null)
    setOnlyFailed(false)
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, submitting])

  const items = nodeImportResult?.items ?? []
  const total = nodeImportResult?.total ?? 0
  const created = nodeImportResult?.created ?? 0
  const existing = nodeImportResult?.existing ?? 0
  const failed = nodeImportResult?.failed ?? 0
  const visibleItems = onlyFailed ? items.filter((i) => i.status === 'failed') : items
  const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%')

  const footerBtn = 'px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none'
  const footer = hasResult ? (
    <>
      <button
        type="button"
        onClick={handleResetForAnotherFile}
        className={`${footerBtn} inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden />
        Nhập file khác
      </button>
      <button
        type="button"
        onClick={handleClose}
        className={`${footerBtn} bg-blue-600 px-5 font-bold text-white shadow-xs hover:bg-blue-700`}
      >
        Đóng
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        disabled={submitting}
        onClick={handleClose}
        className={`${footerBtn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50`}
      >
        Huỷ
      </button>
      <button
        type="button"
        disabled={!selectedFile || Boolean(fileError) || submitting}
        onClick={handleImport}
        className={`${footerBtn} inline-flex items-center gap-1.5 bg-blue-600 px-5 font-bold text-white shadow-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400`}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
        Nhập
      </button>
    </>
  )

  return (
    <AssetModalFrame widthClass="max-w-2xl">
      <AssetModalHeader
        icon={<FileSpreadsheet className="w-5 h-5" />}
        accent="indigo"
        title="Nhập node IoT từ Excel"
        subtitle="Thêm nhiều node cùng lúc trong một tệp .xlsx."
        onClose={handleClose}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          aria-label="Chọn file Excel nhập node IoT"
          className="hidden"
          onChange={handleFileChange}
        />

        {!hasResult && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-900">Tệp Excel</h4>
              <button
                type="button"
                disabled={nodeTemplateDownloading}
                onClick={() => dispatch(downloadNodeTemplateRequest())}
                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                {nodeTemplateDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="w-4 h-4" aria-hidden />
                )}
                Tải file mẫu
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (!submitting) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed transition-colors ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-bold text-slate-900 truncate">{selectedFile.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{formatFileSize(selectedFile.size)} · sẵn sàng nhập</div>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                  >
                    Đổi file
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => acceptFile(null)}
                    aria-label="Bỏ file đã chọn"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-4 rounded-2xl p-5 text-left cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none disabled:cursor-not-allowed"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Upload className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-700">
                      Kéo thả tệp .xlsx vào đây hoặc <span className="font-bold text-blue-700">chọn từ máy</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">Tối đa 5 MB, 100 dòng</span>
                  </span>
                </button>
              )}
            </div>

            {fileError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"
              >
                <CircleAlert className="w-4 h-4 mt-px shrink-0" aria-hidden />
                <span>{fileError}</span>
              </div>
            )}

            <p className="text-sm text-slate-600 leading-relaxed">
              Nhập là tạo node thật, không có bước xem trước. Nhập lại cùng tệp không tạo trùng; dòng lỗi không ảnh hưởng dòng khác.
            </p>
          </>
        )}

        {/* Đang nhập */}
        {submitting && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 font-medium text-indigo-700"
          >
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            <span>Đang nhập danh sách node IoT…</span>
          </div>
        )}

        {/* Lỗi toàn file từ API */}
        {nodeImportError && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"
          >
            <CircleAlert className="w-4 h-4 mt-px shrink-0" aria-hidden />
            <span>{nodeImportError}</span>
          </div>
        )}

        {/* Bước 2: kết quả */}
        {nodeImportResult && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="truncate font-mono font-semibold">{selectedFile?.name ?? 'Kết quả nhập'}</span>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">Sheet: {nodeImportResult.sheet || '-'}</span>
              </div>

              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className="bg-emerald-500" style={{ width: pct(created) }} />
                <div className="bg-slate-400" style={{ width: pct(existing) }} />
                <div className="bg-rose-500" style={{ width: pct(failed) }} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                <Stat label="Tổng" value={total} tone="ink" />
                <Stat label="Đã tạo" value={created} tone="emerald" />
                <Stat label="Đã có" value={existing} tone="slate" />
                <Stat label="Lỗi" value={failed} tone="rose" />
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                File không có dòng dữ liệu nào.
              </div>
            ) : (
              <div className="space-y-2">
                {failed > 0 && (
                  <div className="flex items-center gap-2" role="group" aria-label="Lọc dòng kết quả">
                    <button
                      type="button"
                      aria-pressed={!onlyFailed}
                      onClick={() => setOnlyFailed(false)}
                      className={`rounded-full border px-3 py-1 font-semibold cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none ${
                        !onlyFailed
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Tất cả ({items.length})
                    </button>
                    <button
                      type="button"
                      aria-pressed={onlyFailed}
                      onClick={() => setOnlyFailed(true)}
                      className={`rounded-full border px-3 py-1 font-semibold cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none ${
                        onlyFailed
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Chỉ dòng lỗi ({failed})
                    </button>
                  </div>
                )}

                <div className="max-h-[38vh] overflow-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                        <th className="py-2 px-3 font-semibold">Dòng</th>
                        <th className="py-2 px-3 font-semibold">Server</th>
                        <th className="py-2 px-3 font-semibold">Mạch</th>
                        <th className="py-2 px-3 font-semibold">Device</th>
                        <th className="py-2 px-3 font-semibold">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item, idx) => (
                        <tr
                          key={`${item.row ?? idx}-${item.device_id ?? ''}`}
                          className={`border-b border-slate-100 last:border-b-0 align-top ${
                            item.status === 'failed' ? 'bg-rose-50/60' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-slate-600">{item.row ?? '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">{item.server_id || '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">{item.feeder_id || '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">{item.device_id || '-'}</td>
                          <td className="py-2 px-3">{renderRowResult(item)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
        {footer}
      </div>
    </AssetModalFrame>
  )
}

export default ImportNodesModal
