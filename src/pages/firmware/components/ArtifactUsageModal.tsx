import React from 'react'
import { useSelector } from 'react-redux'
import { X, SearchCheck, Layers, Calendar, User, Hash, Loader2, AlertCircle } from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import type { ArtifactVersionUsage } from '../../../types/admin/artifact-versions'
import { resolveUserDisplayName } from '../../../utils/userUtils'

interface ArtifactUsageModalProps {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  usage: ArtifactVersionUsage | null
  onClose: () => void
}

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - ${d.toLocaleDateString('vi-VN')}`
}

export const ArtifactUsageModal: React.FC<ArtifactUsageModalProps> = ({
  isOpen,
  isLoading,
  error,
  usage,
  onClose,
}) => {
  const users = useSelector((state: RootState) => state.adminUsers?.users || [])
  const currentUser = useSelector((state: RootState) => state.auth?.user)

  if (!isOpen) return null

  const version = usage?.version
  const results = usage?.results || []

  // Tổng số kết quả sinh ra trên toàn hệ thống
  const totalProduced = results.reduce((acc, r) => acc + (r.count ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <SearchCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kiểm Toán Nguồn Gốc Dữ Liệu (Data Provenance)
              </h2>
              <p className="text-xs text-slate-500">
                Thống kê số lượng kết quả nghiệp vụ do phiên bản này trực tiếp sinh ra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Đang truy vấn kiểm toán dữ liệu...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && version && (
            <>
              {/* Thẻ định danh phiên bản */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold">
                      {version.component || 'N/A'}
                    </span>
                    <strong className="text-sm font-mono text-slate-900">
                      {version.version || 'v0.0.0'}
                    </strong>
                  </div>

                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDateTime(version.created_at)}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tạo bởi:</span>
                    <strong className="text-slate-800">
                      {resolveUserDisplayName(
                        version.created_by,
                        users,
                        currentUser,
                        'Hệ thống tự động (Server)'
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="shrink-0">Mã băm:</span>
                    <span className="font-mono text-slate-700 truncate" title={version.artifact_hash || 'Không có'}>
                      {version.artifact_hash || 'Không có mã băm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng kê chi tiết kết quả sinh ra */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Kết quả sinh ra trong hệ thống ({results.length} loại)</span>
                  </h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                    Tổng: {totalProduced.toLocaleString('vi-VN')} bản ghi
                  </span>
                </div>

                {results.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                    Phiên bản này chưa tạo ra bất kỳ bản ghi kết quả nào trong hệ thống.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.map((r, idx) => (
                      <div
                        key={r.result || idx}
                        className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <strong className="text-xs font-mono font-bold text-slate-800 block truncate">
                            {r.result || `Kết quả #${idx + 1}`}
                          </strong>
                          {r.by_data_source && Object.keys(r.by_data_source).length > 0 && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {Object.entries(r.by_data_source).map(([src, count]) => (
                                <span
                                  key={src}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                                >
                                  {src}: <strong>{count.toLocaleString('vi-VN')}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black font-mono text-indigo-600 block">
                            {(r.count ?? 0).toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[10px] text-slate-400">bản ghi</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
