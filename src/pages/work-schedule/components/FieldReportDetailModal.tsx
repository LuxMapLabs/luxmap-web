import React, { useState, useEffect } from 'react'
import {
  X,
  Video,
  Camera,
  Cpu,
  Gauge,
  Wrench,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Map as MapIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import type { ScheduleCase, SchedulePhase } from '../../../feature/work-schedule/workScheduleSlice'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { EvidenceItem, WorkOrderPole, PolePhotoItem, WorkOrderPoleLocation } from '../../../types/workorders/orders'
import { formatSegmentDisplay } from '../../../utils/work-schedule/workScheduleUtils'
import { EvidenceImage } from './EvidenceImage'
import { PolePhotoImage } from './PolePhotoImage'
import { PoleVideoPlayer } from './PoleVideoPlayer'

const formatDurationMs = (ms?: number): string => {
  if (ms == null || ms <= 0) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const formatByteCount = (bytes?: number): string => {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FieldReportDetailModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  phase: SchedulePhase | null
  onClose: () => void
  onPreviewGis?: (payload: {
    code: string
    segment: string
    poles: WorkOrderPoleLocation[]
  }) => void
}

interface ZoomImageTarget {
  evidenceId?: string | null
  polePhotoId?: string | null
  workOrderId?: string | null
  src?: string
  title?: string
}

export const FieldReportDetailModal: React.FC<FieldReportDetailModalProps> = ({
  isOpen,
  caseItem,
  phase,
  onClose,
  onPreviewGis,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'photos' | 'ai' | 'gps'>('video')
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [zoomImage, setZoomImage] = useState<ZoomImageTarget | null>(null)
  const [backendEvidence, setBackendEvidence] = useState<EvidenceItem[]>([])
  const [poles, setPoles] = useState<WorkOrderPole[]>([])
  const [polePhotos, setPolePhotos] = useState<PolePhotoItem[]>([])

  // Chi tiết lệnh công tác từ Redux store
  const workOrderDetail = useSelector((state: RootState) => state.workSchedule.workOrderDetail)

  // Xác định mã lệnh công tác (hỗ trợ fallback caseItem.code nếu phase.workOrderId trống)
  const targetWorkOrderId = phase?.workOrderId || caseItem?.code

  // Tải ảnh bằng chứng nghiệm thu và danh sách cột từ Backend nếu có mã lệnh công tác
  useEffect(() => {
    if (isOpen && targetWorkOrderId) {
      let cancelled = false
      setSelectedVideoIndex(0)
      workScheduleAPI
        .getAllWorkOrderEvidence(targetWorkOrderId)
        .then((items) => {
          if (!cancelled) {
            setBackendEvidence(items)
          }
        })
        .catch(() => {
          if (!cancelled) setBackendEvidence([])
        })

      workScheduleAPI
        .getWorkOrderPoles(targetWorkOrderId)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setPoles(res.items)
          } else {
            setPoles([])
          }
        })
        .catch(() => setPoles([]))

      // Tải danh sách ảnh chụp từng cột đèn khảo sát thực tế từ Kỹ sư Mobile
      workScheduleAPI
        .getWorkOrderPolePhotos(targetWorkOrderId)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setPolePhotos(res.items)
          } else {
            setPolePhotos([])
          }
        })
        .catch(() => setPolePhotos([]))

      return () => {
        cancelled = true
      }
    }
  }, [isOpen, targetWorkOrderId])

  // Tự động chuyển tab thích hợp theo từng giai đoạn:
  // - Khảo sát: Ưu tiên xem Video hành trình đêm
  // - Kiểm tra / Sửa chữa: Ưu tiên xem Ảnh chụp bằng chứng hiện trường
  useEffect(() => {
    if (isOpen && phase) {
      if (phase.phaseType === 'survey') {
        setActiveTab('video')
      } else if (phase.phaseType === 'pole_gps_update') {
        setActiveTab('gps')
      } else {
        setActiveTab('photos')
      }
    }
  }, [isOpen, phase?.phaseType])

  if (!isOpen || !caseItem || !phase) return null

  const report = phase.report

  // Trích xuất dữ liệu báo cáo thực tế từ workOrderDetail nếu khớp lệnh
  const isTargetDetail = workOrderDetail?.work_order_id === targetWorkOrderId
  const effectiveReportNote =
    (isTargetDetail && workOrderDetail?.report_note) ||
    report?.summary ||
    'Báo cáo kỹ thuật hiện trường'
  const effectiveSubmittedAt =
    (isTargetDetail && workOrderDetail?.completed_at)
      ? new Date(workOrderDetail.completed_at).toLocaleString('vi-VN')
      : report?.submittedAt
  const effectiveSuggestedMaterials =
    (isTargetDetail && workOrderDetail?.materials_note) ||
    report?.suggestedMaterialsNote
  const effectiveUsedMaterials =
    (isTargetDetail && workOrderDetail?.materials_used) ||
    report?.usedMaterialsNote
  const effectivePoleGpsLocations: WorkOrderPoleLocation[] =
    isTargetDetail && workOrderDetail?.pole_locations
      ? workOrderDetail.pole_locations
      : report?.poleGpsLocations || []

  // Lọc các cột đèn có cảnh báo / bất thường
  const abnormalPoles = poles.filter(
    (p) =>
      (p.fixture_status && p.fixture_status !== 'normal' && p.fixture_status !== 'unknown') ||
      (p.open_fault_count && p.open_fault_count > 0)
  )

  // Danh sách hình ảnh bằng chứng thực địa từ Backend
  const displayPhotos = backendEvidence.map((ev, idx) => ({
    evidenceId: ev.evidence_id,
    src:
      ev.original_url ||
      ev.thumbnail_url ||
      workScheduleAPI.getEvidenceImageUrl(ev.evidence_id || '', 'original'),
    title: `Ảnh ${idx + 1}: ${
      ev.kind === 'before'
        ? 'Trước sửa chữa'
        : ev.kind === 'after'
        ? 'Sau sửa chữa'
        : 'Hiện trường'
    }`,
    desc: `Thời điểm ghi nhận: ${ev.captured_at ? new Date(ev.captured_at).toLocaleString('vi-VN') : ev.uploaded_at || 'Đã ghi nhận'}`,
    tag: ev.kind === 'before' ? 'Trước sửa' : ev.kind === 'after' ? 'Sau sửa' : 'Hiện trường',
  }))

  // Danh sách clip video thực địa theo từng cột đèn từ Backend
  const poleVideos = polePhotos.filter((p) => Boolean(p.video && p.photo_id))
  const selectedVideoPhoto = poleVideos[selectedVideoIndex] || poleVideos[0] || null

  // Tổng số ảnh thực tế hiển thị trong Tab 2 theo đúng giai đoạn
  const photoCount = phase.phaseType === 'survey' ? polePhotos.length : displayPhotos.length

  // Phiên bản mô hình AI thực tế từ dữ liệu backend (nếu có)
  const modelVersionSource = polePhotos.find((p) => p.model_version || p.artifact_version)
  const modelVersionLabel =
    modelVersionSource?.model_version || modelVersionSource?.artifact_version || null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-black bg-blue-100 text-blue-800">
                  {caseItem.code}
                </span>
                <span className="text-slate-300">•</span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Báo Cáo Hiện Trường Thực Địa: {phase.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                {formatSegmentDisplay(caseItem.segment)} — Nộp bởi: <strong>{phase.assigneeName}</strong> lúc {effectiveSubmittedAt || 'Đang cập nhật'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
          {phase.phaseType === 'pole_gps_update' ? (
            <button
              type="button"
              onClick={() => setActiveTab('gps')}
              className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'gps'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Tọa Độ GPS &amp; Ảnh Từng Cột ({effectivePoleGpsLocations.length})</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'video'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'survey'
                    ? `Video Quét Thực Địa (${poleVideos.length})`
                    : `Video Tuyến (${poleVideos.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'photos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'repair'
                    ? `Ảnh Trước & Sau Sửa Chữa (${photoCount})`
                    : phase.phaseType === 'inspection'
                    ? `Ảnh Hiện Trường & Đo Đạc (${photoCount})`
                    : `Ảnh Chụp Bằng Chứng (${photoCount})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'ai'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'survey'
                    ? 'Phân Tích AI & Tuyến Khảo Sát'
                    : phase.phaseType === 'inspection'
                    ? 'Chẩn Đoán Lỗi & Đề Xuất Vật Tư'
                    : 'Nghiệm Thu Kỹ Thuật & Vật Tư'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar bg-slate-50/50">
          {/* TAB GPS (DÀNH RIÊNG CHO CẬP NHẬT VỊ TRÍ CỘT) */}
          {activeTab === 'gps' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-violet-50/70 border border-violet-200">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-xs font-extrabold text-violet-950 mb-1">
                    Ghi chú báo cáo từ kỹ sư:
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                    {effectiveReportNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onPreviewGis) {
                      onPreviewGis({
                        code: caseItem.code,
                        segment: caseItem.segment,
                        poles: effectivePoleGpsLocations,
                      })
                    } else {
                      toast.info('Chức năng Xem GIS (popup bản đồ thu nhỏ) đang được kết nối.')
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Xem GIS</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase">
                      <th className="py-2.5 px-3 font-extrabold">Mã cột</th>
                      <th className="py-2.5 px-3 font-extrabold">Ảnh chụp</th>
                      <th className="py-2.5 px-3 font-extrabold">Vĩ độ (Lat)</th>
                      <th className="py-2.5 px-3 font-extrabold">Kinh độ (Lng)</th>
                      <th className="py-2.5 px-3 font-extrabold">Thời gian ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {effectivePoleGpsLocations.length > 0 ? (
                      effectivePoleGpsLocations.map((g, idx) => {
                        const evidenceMatches = g.pole_id
                          ? backendEvidence.filter((ev) => ev.pole_id === g.pole_id)
                          : []
                        const matchedEvidence =
                          evidenceMatches.length > 0
                            ? evidenceMatches[evidenceMatches.length - 1]
                            : undefined

                        return (
                          <tr key={g.pole_id || idx} className="hover:bg-violet-50/40">
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                              {g.pole_id || '-'}
                            </td>
                            <td className="py-2 px-3">
                              {matchedEvidence?.evidence_id ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomImage({
                                      evidenceId: matchedEvidence.evidence_id,
                                      src:
                                        matchedEvidence.original_url ||
                                        matchedEvidence.thumbnail_url ||
                                        workScheduleAPI.getEvidenceImageUrl(
                                          matchedEvidence.evidence_id || '',
                                          'original'
                                        ),
                                      title: `Cột ${g.pole_id || ''}`,
                                    })
                                  }
                                  title="Bấm để phóng to ảnh"
                                  className="relative w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 group cursor-pointer block shadow-2xs"
                                >
                                  <EvidenceImage
                                    evidenceId={matchedEvidence.evidence_id}
                                    fallbackSrc={
                                      matchedEvidence.thumbnail_url ||
                                      matchedEvidence.original_url ||
                                      workScheduleAPI.getEvidenceImageUrl(
                                        matchedEvidence.evidence_id,
                                        'thumbnail'
                                      )
                                    }
                                    alt={`Ảnh cột ${g.pole_id || ''}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Chưa có ảnh
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              {g.lat != null ? g.lat.toFixed(6) : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              {g.lng != null ? g.lng.toFixed(6) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {g.captured_at ? new Date(g.captured_at).toLocaleString('vi-VN') : '-'}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Chưa có dữ liệu tọa độ GPS chi tiết cho từng cột.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 1: VIDEO KHẢO SÁT THỰC ĐỊA */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {poleVideos.length > 0 && selectedVideoPhoto && targetWorkOrderId ? (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-xl border border-slate-800">
                    <PoleVideoPlayer
                      workOrderId={targetWorkOrderId}
                      photoId={selectedVideoPhoto.photo_id}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>

                  {/* Thông số kỹ thuật thực tế của clip đang phát */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-900 text-white">
                        {selectedVideoPhoto.pole_id || 'Cột đèn'}
                      </span>
                      <span className="text-slate-600 font-medium">
                        Thời lượng: <strong>{formatDurationMs(selectedVideoPhoto.video?.duration_ms)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">
                        Dung lượng: <strong>{formatByteCount(selectedVideoPhoto.video?.byte_count)}</strong>
                      </span>
                      {selectedVideoPhoto.video?.sampled_frames != null && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">
                            Frames: <strong>{selectedVideoPhoto.video.sampled_frames}</strong>
                            {selectedVideoPhoto.video.on_frames != null &&
                              selectedVideoPhoto.video.off_frames != null &&
                              ` (Sáng: ${selectedVideoPhoto.video.on_frames}, Tắt: ${selectedVideoPhoto.video.off_frames})`}
                          </span>
                        </>
                      )}
                      {selectedVideoPhoto.video?.confidence_median != null && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">
                            Độ tin cậy AI: <strong>{Math.round(selectedVideoPhoto.video.confidence_median * 100)}%</strong>
                          </span>
                        </>
                      )}
                      {selectedVideoPhoto.video?.hdr && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          HDR
                        </span>
                      )}
                    </div>
                    {selectedVideoPhoto.captured_at && (
                      <span className="text-[11px] text-slate-500">
                        Quay lúc: {new Date(selectedVideoPhoto.captured_at).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>

                  {/* Danh sách chọn video theo cột đèn (nếu có nhiều hơn 1 clip) */}
                  {poleVideos.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Danh sách video cột đèn ({poleVideos.length} clip)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {poleVideos.map((vp, idx) => {
                          const effectiveState = vp.final_cv_state || vp.cv_state
                          const isOut = effectiveState === 'off'
                          const isNormal = effectiveState === 'on'
                          const isSelected = idx === selectedVideoIndex

                          return (
                            <button
                              key={vp.photo_id || idx}
                              type="button"
                              onClick={() => setSelectedVideoIndex(idx)}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                                  : 'bg-white border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs text-slate-900 truncate">
                                  {vp.pole_id || `Clip #${idx + 1}`}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    isOut
                                      ? 'bg-rose-100 text-rose-800'
                                      : isNormal
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isOut ? 'LỖI' : isNormal ? 'ĐẠT' : 'CHƯA RÕ'}
                                </span>
                              </div>
                              <span className="text-[10.5px] text-slate-500 font-mono">
                                {formatDurationMs(vp.video?.duration_ms)} • {formatByteCount(vp.video?.byte_count)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                  <Video className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Chưa có video thực địa được tải lên</span>
                  <span className="text-[11px] text-slate-500 max-w-md">
                    Kỹ sư hiện trường chưa tải lên clip video nào cho lệnh công tác này. Sau khi kỹ sư đồng bộ video từ ứng dụng di động, video sẽ xuất hiện tại đây.
                  </span>
                </div>
              )}

              {/* Thông tin mô tả video & báo cáo kỹ sư */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Ghi Nhận Báo Cáo Khảo Sát Thực Địa
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {effectiveReportNote}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ẢNH CHỤP BẰNG CHỨNG HIỆN TRƯỜNG */}
          {activeTab === 'photos' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Trường hợp 1: Giai đoạn Khảo sát (Survey) - Hiển thị ảnh chụp từng cột đèn từ Mobile */}
              {phase.phaseType === 'survey' ? (
                polePhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {polePhotos.map((photo, idx) => {
                      const effectiveState = photo.final_cv_state || photo.cv_state
                      const isOut = effectiveState === 'off'
                      const isNormal = effectiveState === 'on'
                      const isDecided = photo.decision === 'confirm'

                      return (
                        <div
                          key={photo.photo_id || idx}
                          onClick={() =>
                            setZoomImage({
                              polePhotoId: photo.photo_id,
                              workOrderId: targetWorkOrderId,
                              src: photo.original_url || photo.thumbnail_url || undefined,
                              title: `Cột ${photo.pole_id || ''}`,
                            })
                          }
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group flex flex-col"
                        >
                          <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                            <PolePhotoImage
                              workOrderId={targetWorkOrderId}
                              photoId={photo.photo_id}
                              fallbackSrc={photo.original_url || photo.thumbnail_url || undefined}
                              alt={`Cột ${photo.pole_id || ''}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Badge trạng thái phát hiện của đèn */}
                            <span
                              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md shadow-xs border ${
                                isOut
                                  ? 'bg-rose-600/90 text-white border-rose-400/30'
                                  : isNormal
                                  ? 'bg-emerald-600/90 text-white border-emerald-400/30'
                                  : 'bg-amber-600/90 text-white border-amber-400/30'
                              }`}
                            >
                              {isOut ? 'MẤT SÁNG (LỖI)' : isNormal ? 'ĐẠT CHUẨN' : 'CHƯA RÕ'}
                            </span>

                            {/* Mã cột & nhãn có video */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                                {photo.pole_id || `Cột #${idx + 1}`}
                              </span>
                              {photo.video && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/30 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> Video
                                </span>
                              )}
                            </div>

                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg">
                                <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-between text-xs">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  Cột {photo.pole_id || 'Chưa định danh'}
                                </span>
                                {isDecided ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ Đã duyệt
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Chờ duyệt ca
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Chụp lúc: {photo.captured_at ? new Date(photo.captured_at).toLocaleString('vi-VN') : 'Gần đây'}
                              </p>
                              {photo.review_note && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1 line-clamp-2">
                                  <strong>Ghi chú:</strong> {photo.review_note}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                              <span>
                                Độ tin cậy:{' '}
                                <strong className="text-slate-700">
                                  {photo.confidence != null ? `${Math.round(photo.confidence * 100)}%` : 'Chưa có'}
                                </strong>
                              </span>
                              {photo.lat && photo.lng && (
                                <span className="font-mono text-slate-400">
                                  GPS: {photo.lat.toFixed(4)}, {photo.lng.toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Chưa có ảnh khảo sát cột đèn</span>
                    <span className="text-[11px] text-slate-500 max-w-md">
                      Kỹ sư hiện trường chưa tải lên ảnh chụp cột đèn nào cho lệnh khảo sát này. Sau khi kỹ sư hoàn tất trên ứng dụng di động, ảnh sẽ xuất hiện tại đây.
                    </span>
                  </div>
                )
              ) : (
                /* Trường hợp 2: Giai đoạn Kiểm tra / Sửa chữa - Hiển thị ảnh Before/After/Observation */
                displayPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {displayPhotos.map((photo, idx) => (
                      <div
                        key={idx}
                        onClick={() => setZoomImage({ evidenceId: photo.evidenceId, src: photo.src })}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group flex flex-col"
                      >
                        <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                          <EvidenceImage
                            evidenceId={photo.evidenceId}
                            fallbackSrc={photo.src}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                            {photo.tag}
                          </span>
                          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg">
                              <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col gap-1 flex-1 justify-between">
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                            {photo.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {photo.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Chưa có ảnh bằng chứng được tải lên</span>
                    <span className="text-[11px] text-slate-500">
                      Kỹ sư hiện trường chưa đính kèm ảnh trước / sau tác nghiệp cho lệnh này.
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: KẾT QUẢ AI & ĐO ĐẠC CỘT ĐÈN */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Thẻ chẩn đoán AI & danh sách cột đèn trên tuyến */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-500" />
                    Chẩn Đoán Tự Động Từ Mô Hình Computer Vision
                  </h4>
                  {modelVersionLabel && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      Mô hình {modelVersionLabel}
                    </span>
                  )}
                </div>

                {/* Danh sách cột đèn được chẩn đoán */}
                {abnormalPoles.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {abnormalPoles.map((p, idx) => (
                      <div
                        key={p.pole_id || idx}
                        className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1 text-xs text-amber-950 flex-1">
                          <div className="font-extrabold text-sm flex items-center gap-2">
                            <span className="font-mono text-blue-700 font-bold">{p.pole_id}</span>
                            <span>Trạng thái: {p.fixture_status || 'Cần kiểm tra'}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                              Độ tin cậy:{' '}
                              {p.status_confidence != null ? `${Math.round(p.status_confidence * 100)}%` : 'Chưa có'}
                            </span>
                            {p.open_fault_count && p.open_fault_count > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                {p.open_fault_count} sự cố mở
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            {p.note || 'Hệ thống AI phát hiện bất thường quang thông hoặc tình trạng đui đèn trên cột.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : poles.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Đã khảo sát {poles.length} cột dọc tuyến <strong>{formatSegmentDisplay(caseItem.segment)}</strong>. Tất cả cột đèn đều hoạt động trong ngưỡng an toàn, không phát hiện sự cố nghiêm trọng.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    Ghi nhận tuyến: <strong>{formatSegmentDisplay(caseItem.segment)}</strong>. Dữ liệu Computer Vision đã hoàn tất phân tích toàn tuyến.
                  </div>
                )}
              </div>

              {/* Báo cáo kỹ thuật thực tế của Kỹ sư */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Nội dung báo cáo hiện trường từ Kỹ sư ({phase.assigneeName})
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line">
                  {effectiveReportNote}
                </p>
              </div>

              {/* Thẻ đo đạc Luxmeter & Vật tư */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-600" />
                    Độ rọi mặt đường đo thực tế
                  </span>
                  {report?.luxMeasured ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600 font-mono">{report.luxMeasured}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">Chưa có số đo Lux thực tế</span>
                      <p className="text-[11px] text-slate-400">
                        Kỹ sư hiện trường chưa ghi nhận kết quả đo độ rọi mặt đường cho giai đoạn này.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    Vật tư đề xuất từ kỹ sư
                  </span>
                  <div className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {effectiveSuggestedMaterials || effectiveUsedMaterials || 'Không phát sinh vật tư trong giai đoạn này'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Thông tin đề xuất phục vụ lập kế hoạch cho các giai đoạn tiếp theo của sự vụ.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Bằng chứng gốc:</strong> Được tải lên trực tiếp từ thiết bị của Kỹ sư hiện trường (
              <strong>{phase.assigneeName}</strong>). Quản lý chỉ có quyền xem &amp; thẩm định, không được phép chỉnh sửa bằng chứng gốc.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            Đóng Báo Cáo
          </button>
        </div>
      </div>

      {/* Modal Xem Phóng To Hình Ảnh (Lightbox Preview) */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {zoomImage.polePhotoId && zoomImage.workOrderId ? (
              <PolePhotoImage
                workOrderId={zoomImage.workOrderId}
                photoId={zoomImage.polePhotoId}
                fallbackSrc={zoomImage.src}
                preferOriginal={true}
                alt={zoomImage.title || 'Zoomed Pole'}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
              />
            ) : (
              <EvidenceImage
                evidenceId={zoomImage.evidenceId}
                fallbackSrc={zoomImage.src}
                preferOriginal={true}
                alt={zoomImage.title || 'Zoomed Evidence'}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
              />
            )}
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
