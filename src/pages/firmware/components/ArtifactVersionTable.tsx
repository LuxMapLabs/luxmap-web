import React, { useState } from 'react'
import {
  Copy,
  Check,
  SearchCheck,
  User,
  Code,
  X,
  PackageSearch,
  Plus,
  FileCode,
  Table,
  Braces,
} from 'lucide-react'
import type { ArtifactVersionItem } from '../../../types/admin/artifact-versions'
import {
  resolveUserDisplayName,
  type ResolvableUser,
  type CurrentUserRef,
} from '../../../utils/userUtils'

interface ArtifactVersionTableProps {
  items: ArtifactVersionItem[]
  isLoading: boolean
  users?: ResolvableUser[]
  currentUser?: CurrentUserRef | null
  onViewUsage: (versionId: number) => void
  onOpenRegister?: () => void
}

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`
}

const renderJsonSyntax = (data: any) => {
  const jsonStr = JSON.stringify(data, null, 2)
  if (!jsonStr) return <span className="text-slate-400 italic">null</span>

  const parts: React.ReactNode[] = []
  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g

  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = regex.exec(jsonStr)) !== null) {
    if (match.index > lastIndex) {
      parts.push(jsonStr.substring(lastIndex, match.index))
    }
    const token = match[0]
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        const keyName = token.slice(0, -1)
        parts.push(
          <span key={keyIndex++} className="text-indigo-600 font-semibold">
            {keyName}
          </span>
        )
        parts.push(
          <span key={keyIndex++} className="text-slate-400">
            :
          </span>
        )
      } else {
        parts.push(
          <span key={keyIndex++} className="text-emerald-700 font-medium">
            {token}
          </span>
        )
      }
    } else if (/true|false/.test(token)) {
      parts.push(
        <span key={keyIndex++} className="text-amber-700 font-semibold">
          {token}
        </span>
      )
    } else if (/null/.test(token)) {
      parts.push(
        <span key={keyIndex++} className="text-slate-400 italic">
          {token}
        </span>
      )
    } else if (/^-?\d+/.test(token)) {
      parts.push(
        <span key={keyIndex++} className="text-sky-700 font-semibold">
          {token}
        </span>
      )
    } else {
      parts.push(
        <span key={keyIndex++} className="text-slate-400 font-medium">
          {token}
        </span>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < jsonStr.length) {
    parts.push(jsonStr.substring(lastIndex))
  }

  return parts
}

const renderKeyValueRows = (data: any) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Dữ liệu không phải là đối tượng cấu trúc Key-Value.
      </div>
    )
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Không có trường dữ liệu nào trong metadata này.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
      <table className="w-full table-fixed text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <th className="py-2.5 px-4 text-left w-5/12">Khóa (Key)</th>
            <th className="py-2.5 px-2 text-center w-2/12">Kiểu dữ liệu</th>
            <th className="py-2.5 px-4 text-right w-5/12">Giá trị (Value)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map(([key, val], idx) => {
            const isArray = Array.isArray(val)
            const valType = isArray ? 'mảng' : val === null ? 'null' : typeof val
            return (
              <tr
                key={key}
                className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${
                  idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'
                }`}
              >
                <td className="py-2.5 px-4 font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400 text-left align-middle select-text truncate">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100/80 dark:border-indigo-900/60 inline-block">
                    {key}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center align-middle">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                    {valType}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 font-mono text-right align-middle break-all select-text">
                  {typeof val === 'boolean' ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        val
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {val ? 'true' : 'false'}
                    </span>
                  ) : typeof val === 'number' ? (
                    <span className="font-semibold text-sky-700 dark:text-sky-400">{val}</span>
                  ) : val === null ? (
                    <span className="italic text-slate-400">null</span>
                  ) : typeof val === 'object' ? (
                    <span className="text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700 inline-block text-[11px]">
                      {JSON.stringify(val)}
                    </span>
                  ) : (
                    <span className="text-slate-800 dark:text-slate-200">{String(val)}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const ArtifactVersionTable: React.FC<ArtifactVersionTableProps> = ({
  items,
  isLoading,
  users,
  currentUser,
  onViewUsage,
  onOpenRegister,
}) => {
  const [copiedRowId, setCopiedRowId] = useState<number | string | null>(null)
  const [copiedJson, setCopiedJson] = useState(false)
  const [metadataTab, setMetadataTab] = useState<'table' | 'json'>('table')
  const [viewMetadata, setViewMetadata] = useState<{
    id: number
    component?: string | null
    version?: string | null
    data: any
  } | null>(null)

  const handleCopy = (rowId: number | string, hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedRowId(rowId)
    setTimeout(() => setCopiedRowId(null), 3500)
  }

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 3000)
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 w-12 text-center">ID</th>
              <th className="py-3.5 px-4">Thành phần (Component)</th>
              <th className="py-3.5 px-4">Phiên bản (Version)</th>
              <th className="py-3.5 px-4">Mã băm SHA-256</th>
              <th className="py-3.5 px-4 text-center">Metadata</th>
              <th className="py-3.5 px-4">Người tạo</th>
              <th className="py-3.5 px-4">Ngày ghi nhận</th>
              <th className="py-3.5 px-4 text-right">Kiểm toán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Đang tải danh sách sổ đăng ký phiên bản...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                      <PackageSearch className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Chưa có phiên bản nào được ghi nhận
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Chưa có dữ liệu phiên bản nào trong hệ thống hoặc phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                    {onOpenRegister && (
                      <button
                        type="button"
                        onClick={onOpenRegister}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs hover:shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Đăng ký Firmware</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const rowId = item.version_id ?? index
                const hasHash = Boolean(item.artifact_hash)
                const hasMetadata =
                  item.metadata &&
                  typeof item.metadata === 'object' &&
                  Object.keys(item.metadata).length > 0

                return (
                  <tr
                    key={item.version_id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-semibold text-[11px]">
                      #{item.version_id}
                    </td>

                    {/* Component Badge: Hiển thị nguyên gốc chuỗi từ Backend với nhận diện màu sắc */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs inline-flex items-center gap-1.5 ${
                          item.component === 'node_firmware'
                            ? 'bg-indigo-50/90 text-indigo-700 border-indigo-200'
                            : item.component === 'lux_module_firmware'
                            ? 'bg-amber-50/90 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.component === 'node_firmware'
                              ? 'bg-indigo-600'
                              : item.component === 'lux_module_firmware'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {item.component || 'N/A'}
                      </span>
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.version || '0.0.0'}
                    </td>

                    {/* SHA-256 Hash with 1-click copy */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {hasHash ? (
                        <div className="flex items-center gap-1.5">
                          <code
                            className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200"
                            title={item.artifact_hash!}
                          >
                            {item.artifact_hash!.slice(0, 8)}...{item.artifact_hash!.slice(-8)}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(rowId, item.artifact_hash!)}
                            className={`p-1 rounded-md transition cursor-pointer ${copiedRowId === rowId ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title={copiedRowId === rowId ? "Đã sao chép mã SHA-256!" : "Sao chép toàn bộ mã SHA-256"}
                          >
                            {copiedRowId === rowId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Chưa băm SHA-256
                        </span>
                      )}
                    </td>

                    {/* Metadata Preview */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {hasMetadata ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMetadataTab('table')
                            setViewMetadata({
                              id: item.version_id!,
                              component: item.component,
                              version: item.version,
                              data: item.metadata,
                            })
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[10px] font-semibold transition cursor-pointer"
                          title="Bấm để xem chi tiết Metadata"
                        >
                          <Code className="w-3 h-3 text-slate-500" />
                          <span>JSON ({Object.keys(item.metadata).length})</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Created By */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {resolveUserDisplayName(
                            item.created_by,
                            users,
                            currentUser,
                            'Hệ thống (Server)'
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </td>

                    {/* Actions: View Usage Audit */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewUsage(item.version_id!)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1 shadow-2xs hover:shadow-xs"
                        title="Kiểm toán số lượng kết quả nghiệp vụ do phiên bản này sinh ra"
                      >
                        <SearchCheck className="w-3.5 h-3.5" />
                        <span>Kiểm toán</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Popup xem chi tiết Metadata (Light Mode Inspector) */}
      {viewMetadata && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewMetadata(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0 border border-indigo-100/60">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Thông Số Metadata Phiên Bản
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                        viewMetadata.component === 'node_firmware'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : viewMetadata.component === 'lux_module_firmware'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {viewMetadata.component || 'N/A'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {viewMetadata.version || '0.0.0'}
                    </span>
                    <span className="text-slate-400">#{viewMetadata.id}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMetadata(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-toolbar: Tabs Switcher & Copy */}
            <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              {/* Segmented Tab control */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMetadataTab('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    metadataTab === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dạng Bảng (Key - Value)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetadataTab('json')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    metadataTab === 'json'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Braces className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dạng JSON (Raw)</span>
                </button>
              </div>

              {/* Stats & Copy Button */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {Object.keys(viewMetadata.data || {}).length} thuộc tính
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {new TextEncoder().encode(JSON.stringify(viewMetadata.data || {})).length} B
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyJson(viewMetadata.data)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                  title="Sao chép toàn bộ JSON"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sao chép JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inspector Body (Light Theme) */}
            <div className="p-4 overflow-y-auto max-h-[55vh] bg-slate-50/40 custom-scrollbar">
              {metadataTab === 'table' ? (
                renderKeyValueRows(viewMetadata.data)
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-xs font-mono leading-relaxed select-text shadow-2xs overflow-x-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap break-all font-mono">
                    {renderJsonSyntax(viewMetadata.data)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewMetadata(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
