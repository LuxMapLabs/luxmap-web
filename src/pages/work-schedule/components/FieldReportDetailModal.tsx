import React, { useState, useEffect } from 'react'
import {
  X,
  Camera,
  Cpu,
  Gauge,
  Wrench,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import { ScheduleCase, SchedulePhase } from '../../../types/workSchedule'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { EvidenceItem, WorkOrderPole, PolePhotoItem } from '../../../types/workorders/orders'
import { formatSegmentDisplay } from '../../../utils/work-schedule/workScheduleUtils'
import { EvidenceImage } from './EvidenceImage'
import { PolePhotoImage } from './PolePhotoImage'

interface FieldReportDetailModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  phase: SchedulePhase | null
  onClose: () => void
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
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'ai'>('photos')
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
      workScheduleAPI
        .getWorkOrderEvidence(targetWorkOrderId)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setBackendEvidence(res.items)
          } else {
            setBackendEvidence([])
          }
        })
        .catch(() => setBackendEvidence([]))

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
    }
  }, [isOpen, targetWorkOrderId])

  // Mỗi lần mở một giai đoạn mới thì quay về tab ảnh bằng chứng
  useEffect(() => {
    if (isOpen && phase) setActiveTab('photos')
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
                ? `Ảnh Trước & Sau Sửa Chữa (${displayPhotos.length})`
                : phase.phaseType === 'inspection'
                ? `Ảnh Hiện Trường & Đo Đạc (${displayPhotos.length})`
                : `Ảnh Chụp Bằng Chứng (${displayPhotos.length})`}
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
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar bg-slate-50/50">
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

                            {/* Mã cột */}
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                              {photo.pole_id || `Cột #${idx + 1}`}
                            </span>

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
                                Chụp lúc: {photo.captured_at ? new Date(photo.captured_at).toLocaleString('vi-VN') : '-'}
                              </p>
                              {photo.review_note && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1 line-clamp-2">
                                  <strong>Ghi chú:</strong> {photo.review_note}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                              <span>
                                Độ tin cậy: <strong className="text-slate-700">{photo.confidence ? `${Math.round(photo.confidence * 100)}%` : '-'}</strong>
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
                              Độ tin cậy: {p.status_confidence ? `${Math.round(p.status_confidence * 100)}%` : '-'}
                            </span>
                            {p.open_fault_count && p.open_fault_count > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                {p.open_fault_count} sự cố mở
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            {p.note || 'Chưa có ghi chú cho cột này.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : poles.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Đã khảo sát {poles.length} cột dọc tuyến <strong>{formatSegmentDisplay(caseItem.segment)}</strong>. Không có cột nào bị đánh dấu bất thường hoặc đang có sự cố mở.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    Tuyến: <strong>{formatSegmentDisplay(caseItem.segment)}</strong>. Chưa có dữ liệu cột đèn cho lệnh này.
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
                    <span className="text-xs font-medium text-slate-500">Chưa có số liệu độ rọi cho lệnh này</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    Vật tư đề xuất từ kỹ sư
                  </span>
                  <div className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {effectiveSuggestedMaterials || effectiveUsedMaterials || 'Kỹ sư không ghi nhận vật tư'}
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
