import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  XCircle,
  Lightbulb,
  LightbulbOff,
  ZapOff,
  HelpCircle,
} from 'lucide-react'
import type {
  CitizenReportDetail,
  AcceptCitizenReportRequest,
  MergeCitizenReportRequest,
  RejectCitizenReportRequest,
} from '../../../types/citizen-reports/citizen-reports'
import type { CitizenReportKind, FixtureStatus } from '../../../types/common/enums'
import type { PoleListItem } from '../../../types/assets/poles'
import { CitizenReviewPhotoGallery } from './CitizenReviewPhotoGallery'
import { CitizenReviewAcceptModal } from './CitizenReviewAcceptModal'
import { CitizenReviewMergeModal } from './CitizenReviewMergeModal'
import { CitizenReviewRejectModal } from './CitizenReviewRejectModal'

/**
 * Render Huy hiệu loại hiện trạng mà người dân phản ánh
 */
const renderKindBadge = (kind: CitizenReportKind) => {
  switch (kind) {
    case 'lamp_out':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10.5px] font-semibold"
          title="Đèn tắt hoàn toàn"
        >
          <LightbulbOff className="w-3 h-3" />
          <span>Đèn tắt</span>
        </span>
      )
    case 'lamp_dim':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10.5px] font-semibold"
          title="Đèn sáng yếu / chập chờn"
        >
          <ZapOff className="w-3 h-3" />
          <span>Sáng yếu</span>
        </span>
      )
    case 'pole_damaged':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[10.5px] font-semibold"
          title="Cột đèn nghiêng / hỏng móng"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Hỏng cột</span>
        </span>
      )
    case 'other':
    default:
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-semibold"
          title="Vấn đề khác"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Khác</span>
        </span>
      )
  }
}

const FAULT_STATUS_LABELS: Record<string, string> = {
  detected: 'Mới phát hiện',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang xử lý',
  resolved: 'Đã sửa xong',
  verified: 'Đã nghiệm thu',
  rejected: 'Đã từ chối',
}

/**
 * Render Trạng thái bóng đèn từ đợt khảo sát đo sáng gần nhất (Survey Sweep)
 */
const renderFixtureStatus = (status?: FixtureStatus) => {
  switch (status) {
    case 'normal':
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Bình thường</span>
        </span>
      )
    case 'dim':
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-xs">
          <ZapOff className="w-3.5 h-3.5" />
          <span>Sáng yếu</span>
        </span>
      )
    case 'out':
      return (
        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs">
          <LightbulbOff className="w-3.5 h-3.5" />
          <span>Mất sáng</span>
        </span>
      )
    case 'unknown':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Chưa có dữ liệu khảo sát</span>
        </span>
      )
  }
}

export interface CitizenReviewDetailModalProps {
  isOpen: boolean
  detail: CitizenReportDetail | null
  poles?: PoleListItem[]
  isLoading: boolean
  isSubmittingDecision: boolean
  onClose: () => void
  onAccept: (data: AcceptCitizenReportRequest) => void
  onMerge: (data: MergeCitizenReportRequest) => void
  onReject: (data: RejectCitizenReportRequest) => void
}

export const CitizenReviewDetailModal: React.FC<CitizenReviewDetailModalProps> = ({
  isOpen,
  detail,
  poles = [],
  isLoading,
  isSubmittingDecision,
  onClose,
  onAccept,
  onMerge,
  onReject,
}) => {
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

  // Tra cứu external_ref từ danh sách poles
  const matchedPole = useMemo(() => {
    if (!detail?.pole_id) return null
    return poles.find((p) => p.pole_id === detail.pole_id) || null
  }, [poles, detail?.pole_id])

  const externalRef = matchedPole?.external_ref || null
  const displayCode = externalRef || detail?.pole_id || 'Chi tiết phản ánh'

  // Lắng nghe phím Escape để đóng modal (khi không mở sub-modal nào)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (!isAcceptModalOpen && !isMergeModalOpen && !isRejectModalOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isAcceptModalOpen, isMergeModalOpen, isRejectModalOpen])

  // Kiểm tra ngầm trạng thái của Fault trên cột điện:
  // Nếu cột đã có fault và fault chưa xử lý xong (khác 'verified' và 'rejected'),
  // thì CHỈ cho phép Gộp sự cố hoặc Từ chối, ẩn nút Chấp thuận để tránh tạo trùng lặp.
  const hasActiveUnresolvedFault = useMemo(() => {
    if (!detail?.open_faults || detail.open_faults.length === 0) return false
    return detail.open_faults.some(
      (f) => f.fault_status !== 'verified' && f.fault_status !== 'rejected'
    )
  }, [detail?.open_faults])

  if (!isOpen) return null

  // Thu thập toàn bộ ảnh từ các submissions
  const allPhotos = detail?.submissions?.flatMap((s) => s.photos || []) || []

  // Quyền thao tác ra quyết định từ Backend
  const canReview =
    detail?.status === 'pending' &&
    Array.isArray(detail?.allowed_actions) &&
    detail.allowed_actions.length > 0


  // Nút "Chấp thuận" (tạo Fault mới): chỉ hiển thị khi cột CHƯA có fault hoặc fault cũ đã xử lý xong
  const canAccept =
    canReview &&
    !hasActiveUnresolvedFault &&
    (!detail?.allowed_actions || detail.allowed_actions.includes('accept'))

  // Nút "Gộp sự cố": chỉ hiển thị khi cột ĐANG CÓ fault chưa xử lý xong
  const canMerge =
    canReview &&
    hasActiveUnresolvedFault &&
    (!detail?.allowed_actions || detail.allowed_actions.includes('merge'))

  // Nút "Từ chối": luôn khả dụng cho phản ánh chờ duyệt
  const canReject =
    canReview &&
    (!detail?.allowed_actions || detail.allowed_actions.includes('reject'))

  return createPortal(
    <>
      {/* Backdrop nền mờ */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Card Modal Căn Giữa (Single column layout) */}
        <div
          className="relative w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header Modal */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/90 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono font-bold text-lg sm:text-xl text-blue-600 dark:text-blue-400">
                {displayCode}
              </span>
              {detail?.status === 'pending' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  Chờ duyệt
                </span>
              ) : detail?.status === 'accepted' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  Đã duyệt
                </span>
              ) : detail?.status === 'merged' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-bold">
                  Đã gộp
                </span>
              ) : detail?.status === 'rejected' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-xs font-bold">
                  Đã từ chối
                </span>
              ) : null}

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Đêm phát sinh: {detail?.night_of || '-'}</span>
                <span>·</span>
                <span>{detail?.submission_count || 0} lượt phản ánh</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Body Modal (Bố cục 1 Cột tuyến tính rõ ràng) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoading || !detail ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                {/* 1. Thẻ Tóm tắt thông tin cột */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Thông tin Cột đèn & Vị trí</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {displayCode}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                    <div>
                      <span className="text-slate-400 block">Địa bàn quản lý:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {detail.commune_id || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Trạng thái bóng gần nhất:</span>
                      <div>
                        {renderFixtureStatus(detail.pole?.fixture_status)}
                        {detail.pole?.last_seen_at && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Khảo sát: {new Date(detail.pole.last_seen_at).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                    {detail.pole?.location && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Tọa độ WGS-84:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {detail.pole.location.lat}, {detail.pole.location.lng}
                        </span>
                      </div>
                    )}

                    {/* Hiện trạng phản ánh tổng hợp từ các lượt gửi */}
                    {detail.kinds && detail.kinds.length > 0 && (
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1.5">
                          Tình trạng người dân báo (tổng hợp đêm nay):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {detail.kinds.map((k) => renderKindBadge(k))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cảnh báo tọa độ GPS xa cột */}
                  {detail.far_from_pole && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cảnh báo tọa độ:</strong> Có ít nhất một lượt gửi có tọa độ cách cột đèn &gt; 200m. Vui lòng thẩm định kỹ hình ảnh hiện trường để xác thực chính xác cột sự cố!
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Thư viện ảnh hiện trường & AI Hint */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <CitizenReviewPhotoGallery
                    reportId={detail.report_id || ''}
                    photos={allPhotos}
                  />
                </div>

                {/* 3. Dòng thời gian người dân gửi phản ánh (Submissions Timeline) */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Lời người dân phản ánh ({detail.submissions?.length || 0} lượt)</span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {detail.submissions?.map((sub, idx) => (
                      <div
                        key={sub.submission_id || idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Lượt #{idx + 1} · {sub.received_at ? new Date(sub.received_at).toLocaleTimeString('vi-VN') : ''}
                            </span>
                            {/* Hiển thị tình trạng mà lượt gửi này báo */}
                            {sub.kind && renderKindBadge(sub.kind)}
                          </div>
                          {sub.far_from_pole && (
                            <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 font-bold text-[10px] px-2 py-0.5 rounded-full">
                              &gt; 200m so với cột
                            </span>
                          )}
                        </div>

                        {/* Hiển thị văn bản thuần chống XSS */}
                        <div className="bg-white dark:bg-slate-900/90 rounded-lg p-2.5 border border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-xs">
                          {sub.description || 'Không có mô tả chi tiết'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Card Sự cố đang mở trên cột (Open Faults) nếu có */}
                {detail.open_faults && detail.open_faults.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>Cột đèn đang có {detail.open_faults.length} sự cố chưa đóng</span>
                    </div>
                    <div className="space-y-1.5">
                      {detail.open_faults.map((f) => (
                        <div
                          key={f.fault_id}
                          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/30 text-[11px] flex items-center justify-between"
                        >
                          <div>
                            <strong className="font-mono text-xs">{f.fault_id}</strong>
                            <span className="text-slate-500 ml-1.5">
                              ({f.fault_type} - {f.severity})
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold uppercase">
                            {FAULT_STATUS_LABELS[f.fault_status] || f.fault_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Card Kết quả thẩm định (nếu đã xử lý trước đó) */}
                {detail.status !== 'pending' && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Kết quả thẩm định ({detail.status})
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      <div>Người duyệt: <strong>{detail.decided_by || 'Cán bộ'}</strong></div>
                      <div>Thời điểm: {detail.decided_at ? new Date(detail.decided_at).toLocaleString('vi-VN') : '-'}</div>
                      {detail.decision_note && <div>Ghi chú: {detail.decision_note}</div>}
                      {detail.fault_id && (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold pt-1">
                          <span>Mã sự cố liên kết: {detail.fault_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Footer Modal (Cố định dưới đáy) */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Đóng
            </button>

            {canReview && (
              <div className="flex items-center gap-2">
                {/* Nút Từ chối */}
                {canReject && (
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isSubmittingDecision}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                )}

                {/* Nút Gộp sự cố: Chỉ hiện khi cột ĐANG CÓ fault chưa xử lý xong */}
                {canMerge && (
                  <button
                    type="button"
                    onClick={() => setIsMergeModalOpen(true)}
                    disabled={isSubmittingDecision}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Gộp sự cố</span>
                  </button>
                )}

                {/* Nút Chấp thuận: Chỉ hiện khi cột CHƯA CÓ fault hoặc fault cũ ĐÃ XỬ LÝ XONG */}
                {canAccept && (
                  <button
                    type="button"
                    onClick={() => setIsAcceptModalOpen(true)}
                    disabled={isSubmittingDecision}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chấp thuận</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Modals Ra quyết định đính kèm */}
      {detail && (
        <>
          <CitizenReviewAcceptModal
            isOpen={isAcceptModalOpen}
            submissionCount={detail.submission_count}
            acceptableFaultTypes={detail.acceptable_fault_types || ['lamp_out']}
            isSubmitting={isSubmittingDecision}
            onClose={() => setIsAcceptModalOpen(false)}
            onSubmit={(data) => {
              onAccept(data)
              setIsAcceptModalOpen(false)
              onClose()
            }}
          />

          <CitizenReviewMergeModal
            isOpen={isMergeModalOpen}
            submissionCount={detail.submission_count}
            openFaults={detail.open_faults || []}
            isSubmitting={isSubmittingDecision}
            onClose={() => setIsMergeModalOpen(false)}
            onSubmit={(data) => {
              onMerge(data)
              setIsMergeModalOpen(false)
              onClose()
            }}
          />

          <CitizenReviewRejectModal
            isOpen={isRejectModalOpen}
            submissionCount={detail.submission_count}
            isSubmitting={isSubmittingDecision}
            onClose={() => setIsRejectModalOpen(false)}
            onSubmit={(data) => {
              onReject(data)
              setIsRejectModalOpen(false)
              onClose()
            }}
          />
        </>
      )}
    </>,
    document.body
  )
}

export default CitizenReviewDetailModal
