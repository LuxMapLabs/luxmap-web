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
} from 'lucide-react'
import type { ArtifactVersionItem } from '../../../types/admin/artifact-versions'

interface ArtifactVersionTableProps {
  items: ArtifactVersionItem[]
  isLoading: boolean
  onViewUsage: (versionId: number) => void
  onOpenRegister?: () => void
}

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`
}

export const ArtifactVersionTable: React.FC<ArtifactVersionTableProps> = ({
  items,
  isLoading,
  onViewUsage,
  onOpenRegister,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [viewMetadata, setViewMetadata] = useState<{ id: number; data: any } | null>(null)

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
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
              <th className="py-3.5 px-4">Nguồn gốc</th>
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
                        <span>Đăng ký phiên bản mới</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
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

                    {/* Component Badge: Hiển thị nguyên gốc chuỗi từ Backend */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
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
                            onClick={() => handleCopy(item.artifact_hash!)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Sao chép toàn bộ mã SHA-256"
                          >
                            {copiedHash === item.artifact_hash ? (
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
                          onClick={() =>
                            setViewMetadata({ id: item.version_id!, data: item.metadata })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[10px] font-semibold transition cursor-pointer"
                          title="Bấm để xem chi tiết Metadata JSON"
                        >
                          <Code className="w-3 h-3 text-slate-500" />
                          <span>JSON ({Object.keys(item.metadata).length})</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Created By */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.created_by || 'Hệ thống (Server)'}</span>
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

      {/* Modal Popup xem nhanh Metadata JSON */}
      {viewMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 font-mono">
                Metadata Version #{viewMetadata.id}
              </span>
              <button
                type="button"
                onClick={() => setViewMetadata(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 text-slate-100 text-xs font-mono max-h-80 overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(viewMetadata.data, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMetadata(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition"
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
