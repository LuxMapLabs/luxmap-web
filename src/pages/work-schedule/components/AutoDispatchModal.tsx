import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Zap,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Check,
  Loader2,
  Layers,
  FileText,
  MapPin,
  Flame,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { ProposalFaultsModal } from './ProposalFaultsModal'
import type {
  AutoDispatchPreview,
  DispatchProposal,
} from '../../../types/work-schedule/autoDispatch'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'

interface AutoDispatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  communeId?: string
  assignees?: WorkOrderAssignee[]
}

export const AutoDispatchModal: React.FC<AutoDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  communeId,
  assignees = [],
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null)
  const [viewingFaultsProposal, setViewingFaultsProposal] = useState<DispatchProposal | null>(null)
  const [preview, setPreview] = useState<AutoDispatchPreview | null>(null)
  const [proposals, setProposals] = useState<DispatchProposal[]>([])
  const [engineers, setEngineers] = useState<WorkOrderAssignee[]>(assignees)

  useEffect(() => {
    if (assignees && assignees.length > 0) {
      setEngineers(assignees)
    }
  }, [assignees])

  // Tải dữ liệu đề xuất từ Backend khi mở Modal
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const [previewResult, engineersResult] = await Promise.allSettled([
          workScheduleAPI.getAutoDispatchPreview(communeId && communeId !== '*' ? { commune_id: communeId } : {}),
          communeId && communeId !== '*'
            ? workScheduleAPI.getAssignees(communeId)
            : Promise.resolve({ items: [] }),
        ])

        if (isMounted) {
          if (previewResult.status === 'fulfilled') {
            setPreview(previewResult.value)
            setProposals(previewResult.value.proposals || [])
          } else {
            console.error('[AutoDispatchModal] Fetch preview failed:', previewResult.reason)
            toast.error('Không thể lấy đề xuất phân lịch tự động từ hệ thống.')
          }

          if (engineersResult.status === 'fulfilled' && (engineersResult.value as any).items?.length > 0) {
            setEngineers((engineersResult.value as any).items)
          } else if (assignees.length > 0) {
            setEngineers(assignees)
          }
        }
      } catch (err: any) {
        console.error('[AutoDispatchModal] Fetch preview unexpected error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [isOpen, communeId])

  // Cập nhật thông tin từng ca trong danh sách đề xuất
  const handleUpdateProposal = (index: number, patch: Partial<DispatchProposal>) => {
    setProposals((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  // Đếm số ca mà kỹ sư được gán trong cùng một ngày để hiển thị cảnh báo Quota mềm (2 ca/ngày)
  const engineerDailyCounts = useMemo(() => {
    const map: Record<string, number> = {}
    proposals.forEach((p) => {
      if (p.assigned_to && p.scheduled_date) {
        const key = `${p.assigned_to}_${p.scheduled_date}`
        map[key] = (map[key] || 0) + 1
      }
    })
    return map
  }, [proposals])

  // Xử lý gửi batch tạo hàng loạt phiếu
  const handleSubmitBatch = async () => {
    if (proposals.length === 0) return
    setSubmitting(true)

    try {
      const items = proposals.map((p) => {
        const hasFaults = p.fault_ids && p.fault_ids.length > 0
        return {
          task_kind: p.task_kind,
          title: p.title,
          scheduled_date: p.scheduled_date,
          due_date: p.due_date || p.scheduled_date,
          assigned_to: p.assigned_to || undefined,
          fault_ids: hasFaults ? p.fault_ids : undefined,
          segment_id: hasFaults ? undefined : p.segment_id,
          note: p.note,
        }
      })

      const res = await workScheduleAPI.createBatchWorkOrders(items as any)
      toast.success(
        `Đã phê duyệt và khởi tạo thành công ${res.count || items.length} ca kiểm tra!`
      )
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[AutoDispatchModal] Submit batch failed:', err)
      const errData = err?.response?.data
      const detailMsg =
        errData?.detail ||
        errData?.message ||
        errData?.title ||
        err?.message ||
        'Có lỗi xảy ra khi tạo hàng loạt ca kiểm tra.'
      toast.error(detailMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Xử lý duyệt và tạo ngay 1 ca riêng lẻ
  const handleApproveSingle = async (index: number) => {
    const p = proposals[index]
    if (!p) return

    setApprovingIdx(index)
    try {
      const hasFaults = p.fault_ids && p.fault_ids.length > 0
      const item = {
        task_kind: p.task_kind,
        title: p.title,
        scheduled_date: p.scheduled_date,
        due_date: p.due_date || p.scheduled_date,
        assigned_to: p.assigned_to || undefined,
        fault_ids: hasFaults ? p.fault_ids : undefined,
        segment_id: hasFaults ? undefined : p.segment_id,
        note: p.note,
      }

      await workScheduleAPI.createBatchWorkOrders([item as any])
      toast.success(`Đã duyệt và tạo thành công ca kiểm tra: "${p.title}"!`)

      const remaining = proposals.filter((_, i) => i !== index)
      setProposals(remaining)
      onSuccess()

      if (remaining.length === 0) {
        onClose()
      }
    } catch (err: any) {
      console.error('[AutoDispatchModal] Approve single failed:', err)
      const errData = err?.response?.data
      const detailMsg =
        errData?.detail ||
        errData?.message ||
        errData?.title ||
        err?.message ||
        'Có lỗi xảy ra khi duyệt ca kiểm tra này.'
      toast.error(detailMsg)
    } finally {
      setApprovingIdx(null)
    }
  }

  // Xử lý hủy bỏ 1 ca đề xuất khỏi đợt phân lịch
  const handleRejectSingle = (index: number) => {
    const p = proposals[index]
    const remaining = proposals.filter((_, i) => i !== index)
    setProposals(remaining)
    toast.info(`Đã loại bỏ ca "${p?.title || `#${index + 1}`}" khỏi đợt phân lịch này.`)

    if (remaining.length === 0) {
      toast.info('Đã hủy bỏ toàn bộ các ca đề xuất trong đợt này.')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-teal-50/70 to-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-6 h-6 fill-teal-600/30 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Phân Lịch Kiểm Tra Tự Động
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  Smart Auto-Dispatch
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        {!loading && preview && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Layers className="w-4 h-4 text-teal-600" />
                Đề xuất: <strong className="font-bold text-slate-900 font-mono text-[13px]">{preview.order_count} ca</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Flame className="w-4 h-4 text-rose-500" />
                Sự cố được giải quyết: <strong className="font-bold text-rose-600 font-mono text-[13px]">{preview.fault_count} lỗi</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                Ngày bắt đầu dự kiến: <strong className="font-bold text-blue-700 font-mono text-[13px]">{preview.start_date}</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              * Quản lý có thể tùy chỉnh ngày và người phụ trách trước khi phê duyệt
            </div>
          </div>
        )}

        {/* BODY - SCROLLABLE LIST OF PROPOSALS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <span className="text-xs font-semibold">Đang tính toán gom cụm và cân bằng tải kỹ sư...</span>
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Không có sự cố nào cần phân lịch tự động!</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Tất cả các sự cố phát hiện trên địa bàn đã được giao việc hoặc không có sự cố nào ở trạng thái chờ.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((item, idx) => {
                const key = `${item.assigned_to}_${item.scheduled_date}`
                const dailyAssignedCount = engineerDailyCounts[key] || 0
                const isOverQuota = dailyAssignedCount > 2

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-ops hover:shadow-ops-hover transition-all duration-200 flex flex-col gap-3.5"
                  >
                    {/* Hàng 1: Tiêu đề ca, Tuyến đường, Badge thông tin */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-teal-200/60">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {item.segment_name || item.segment_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Mức nghiêm trọng cao nhất */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.max_severity === 'critical'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.max_severity === 'high'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {item.max_severity === 'critical'
                            ? '🚨 Nghiêm trọng'
                            : item.max_severity === 'high'
                            ? '⚠️ Ưu tiên cao'
                            : 'ℹ️ Tiêu chuẩn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingFaultsProposal(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                          title="Bấm để xem chi tiết danh sách lỗi trong ca này"
                        >
                          <span>{item.pole_count} cột • {item.fault_ids?.length || 0} lỗi</span>
                          <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Hàng 2: Danh sách mã cột trong ca */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-slate-400 font-medium shrink-0">Các cột:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.pole_ids || []).map((poleId) => (
                          <span
                            key={poleId}
                            className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80"
                          >
                            {poleId}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Hàng 3: Cấu hình ngày làm việc & Kỹ sư */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
                      {/* Chọn Ngày thực hiện */}
                      <div className="lg:col-span-4 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày thực hiện:
                        </label>
                        <input
                          type="date"
                          value={item.scheduled_date}
                          onChange={(e) =>
                            handleUpdateProposal(idx, {
                              scheduled_date: e.target.value,
                              due_date: e.target.value,
                            })
                          }
                          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>

                      {/* Chọn Kỹ sư phụ trách */}
                      <div className="lg:col-span-5 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Kỹ sư phụ trách:
                        </label>
                        <select
                          value={item.assigned_to || ''}
                          onChange={(e) => {
                            const val = e.target.value || null
                            const eng = engineers.find((en) => en.user_id === val)
                            handleUpdateProposal(idx, {
                              assigned_to: val,
                              assigned_to_name: eng?.full_name || null,
                            })
                          }}
                          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 outline-none focus:border-teal-500 focus:bg-white transition cursor-pointer"
                        >
                          <option value="">-- Chưa gán (Mở để nhận sau) --</option>
                          {engineers.map((eng) => (
                            <option key={eng.user_id || ''} value={eng.user_id || ''}>
                              {eng.full_name || eng.user_id}
                            </option>
                          ))}
                        </select>
                        {isOverQuota && (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            Kỹ sư này có {dailyAssignedCount} ca trong ngày {item.scheduled_date}
                          </span>
                        )}
                      </div>

                      {/* Ghi chú */}
                      <div className="lg:col-span-3 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Ghi chú:
                        </label>
                        <input
                          type="text"
                          value={item.note || ''}
                          placeholder="Ghi chú cho kỹ sư..."
                          onChange={(e) => handleUpdateProposal(idx, { note: e.target.value })}
                          className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* Hàng 4: Nút Duyệt hoặc Hủy bỏ riêng cho từng ca */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-0.5">
                      <span className="text-[11px] text-slate-400">
                        * Duyệt riêng ca này hoặc hủy bỏ khỏi đợt phân lịch
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectSingle(idx)}
                          disabled={submitting || approvingIdx !== null}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Hủy bỏ ca đề xuất này"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Hủy bỏ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveSingle(idx)}
                          disabled={submitting || approvingIdx !== null}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Duyệt và tạo ngay ca này"
                        >
                          {approvingIdx === idx ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang duyệt...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt ca này</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Báo cáo nếu có sự cố bị bỏ qua */}
              {preview?.skipped && preview.skipped.length > 0 && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lưu ý:</span> Có {preview.skipped.length} sự cố không được xếp lịch tự động (do chưa gắn tuyến đường hoặc vượt giới hạn xử lý đợt này).
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {proposals.length > 0 && (
              <span>
                Tổng cộng: <strong className="text-slate-900 font-bold">{proposals.length} ca kiểm tra</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmitBatch}
              disabled={submitting || proposals.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang phê duyệt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt & Tạo tất cả ({proposals.length} ca)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal chi tiết danh sách sự cố của ca kiểm tra */}
      {viewingFaultsProposal && (
        <ProposalFaultsModal
          isOpen={!!viewingFaultsProposal}
          onClose={() => setViewingFaultsProposal(null)}
          proposalTitle={viewingFaultsProposal.title}
          segmentName={viewingFaultsProposal.segment_name || viewingFaultsProposal.segment_id}
          faultIds={viewingFaultsProposal.fault_ids || []}
          poleIds={viewingFaultsProposal.pole_ids || []}
        />
      )}
    </div>
  )
}
