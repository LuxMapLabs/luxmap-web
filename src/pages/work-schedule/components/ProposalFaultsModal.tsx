import React, { useState, useEffect } from 'react'
import {
  X,
  MapPin,
  Clock,
  Loader2,
  Smartphone,
  Cpu,
  Bot,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react'
import { faultAPI } from '../../../feature/faults/faultAPI'
import type { FaultItem } from '../../../types/faults/faults'

interface ProposalFaultsModalProps {
  isOpen: boolean
  onClose: () => void
  proposalTitle: string
  segmentName: string
  faultIds: string[]
  poleIds?: string[]
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return 'Chưa rõ thời điểm'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const getSourceChannelInfo = (channel?: string | null) => {
  const str = String(channel || '').toLowerCase()
  if (str.includes('citizen') || str.includes('qr')) {
    return {
      label: 'Người dân quét QR',
      icon: <Smartphone className="w-3.5 h-3.5 text-emerald-600" />,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    }
  }
  if (str.includes('iot') || str.includes('telemetry') || str.includes('node')) {
    return {
      label: 'Cảm biến IoT tủ/cột',
      icon: <Cpu className="w-3.5 h-3.5 text-purple-600" />,
      bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    }
  }
  if (str.includes('ai') || str.includes('dashcam') || str.includes('camera')) {
    return {
      label: 'Camera AI quét tự động',
      icon: <Bot className="w-3.5 h-3.5 text-sky-600" />,
      bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    }
  }
  return {
    label: 'Khảo sát hiện trường',
    icon: <ClipboardList className="w-3.5 h-3.5 text-amber-600" />,
    bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
  }
}

const getFaultTypeLabel = (type?: string | null) => {
  const str = String(type || '').toLowerCase()
  if (str.includes('lamp_out') || (str.includes('out') && !str.includes('outage'))) {
    return {
      label: 'Mất sáng hoàn toàn (Tắt bóng)',
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    }
  }
  if (str.includes('lamp_dim') || str.includes('dim')) {
    return {
      label: 'Sáng yếu / Suy giảm quang thông',
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
    }
  }
  if (str.includes('node_offline') || str.includes('offline')) {
    return {
      label: 'Mất kết nối Node IoT',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  }
  if (str.includes('segment_outage') || str.includes('outage')) {
    return {
      label: 'Mất điện toàn tuyến',
      bg: 'bg-red-50 text-red-700 border-red-200/80',
    }
  }
  return {
    label: type || 'Sự cố chiếu sáng',
    bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
  }
}

const getSeverityBadge = (severity?: string | null) => {
  const s = String(severity || '').toLowerCase()
  if (s === 'critical') {
    return {
      label: '🚨 Nghiêm trọng (P1)',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    }
  }
  if (s === 'high') {
    return {
      label: '⚠️ Ưu tiên cao (P2)',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  if (s === 'medium') {
    return {
      label: 'ℹ️ Trung bình (P3)',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    }
  }
  return {
    label: 'Tiêu chuẩn (P4)',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }
}

export const ProposalFaultsModal: React.FC<ProposalFaultsModalProps> = ({
  isOpen,
  onClose,
  proposalTitle,
  segmentName,
  faultIds,
}) => {
  const [loading, setLoading] = useState(true)
  const [faults, setFaults] = useState<FaultItem[]>([])
  const [failedIds, setFailedIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || faultIds.length === 0) {
      setFaults([])
      setFailedIds([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setFailedIds([])

    // Tải chi tiết từng sự cố theo ID
    Promise.allSettled(faultIds.map((id) => faultAPI.getFaultDetail(id)))
      .then((results) => {
        if (!isMounted) return
        const loaded: FaultItem[] = []
        const failed: string[] = []
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value) {
            loaded.push(res.value)
          } else {
            failed.push(faultIds[idx])
          }
        })
        setFaults(loaded)
        setFailedIds(failed)
      })
      .catch((err) => {
        console.error('[ProposalFaultsModal] Failed to load faults:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, faultIds])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-teal-50/80 to-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Chi Tiết Sự Cố Trong Ca Kiểm Tra
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  {faultIds.length} lỗi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{segmentName}</span>
                <span>•</span>
                <span>{proposalTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
              <span className="text-xs font-semibold">Đang tải chi tiết các sự cố...</span>
            </div>
          ) : faults.length === 0 && failedIds.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Không tìm thấy thông tin sự cố nào trong ca này.
            </div>
          ) : (
            <>
              {failedIds.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Không thể tải chi tiết cho {failedIds.length} sự cố: {failedIds.join(', ')}.
                </div>
              )}
              {faults.map((f, idx) => {
              const typeInfo = getFaultTypeLabel(f.fault_type)
              const sourceInfo = getSourceChannelInfo(f.source_channel)
              const sevBadge = getSeverityBadge(f.severity)

              return (
                <div
                  key={f.fault_id || idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-ops transition space-y-3"
                >
                  {/* Hàng 1: Mã lỗi, Mã cột, Mức nghiêm trọng */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <strong className="font-mono text-xs font-extrabold text-slate-900">
                        {f.fault_id}
                      </strong>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        Cột {f.pole_id || 'Chưa gán'}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${sevBadge.className}`}>
                      {sevBadge.label}
                    </span>
                  </div>

                  {/* Hàng 2: Hiện trạng & Nguồn phát hiện */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium shrink-0">Loại lỗi:</span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold border text-[11px] ${typeInfo.bg}`}>
                        {typeInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium shrink-0">Kênh phát hiện:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border text-[11px] ${sourceInfo.bg}`}>
                        {sourceInfo.icon}
                        <span>{sourceInfo.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Hàng 3: Thời gian phát hiện & Ghi chú */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Phát hiện: <strong className="text-slate-700 font-medium">{formatDateTime(f.detected_at)}</strong></span>
                      {f.status_confidence != null && (
                        <span className="text-teal-600 font-bold ml-1">
                          ({(f.status_confidence * 100).toFixed(0)}% AI)
                        </span>
                      )}
                    </div>

                    {(f.note || f.review_note) && (
                      <div className="text-slate-600 italic bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 line-clamp-1 max-w-sm">
                        "{f.note || f.review_note}"
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-end bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
