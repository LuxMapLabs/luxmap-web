import React, { useState, useEffect } from 'react'
import {
  X,
  Play,
  Pause,
  Video,
  Camera,
  Cpu,
  Gauge,
  Wrench,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { ScheduleCase, SchedulePhase } from '../../../types/workSchedule'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { EvidenceItem } from '../../../types/workorders/orders'
import fieldSurveyNightImg from '../../../assets/images/field-survey-night.jpg'
import fieldBrokenFixtureImg from '../../../assets/images/field-broken-fixture.jpg'
import fieldLuxmeterImg from '../../../assets/images/field-luxmeter-4lux.jpg'

interface FieldReportDetailModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  phase: SchedulePhase | null
  onClose: () => void
}

export const FieldReportDetailModal: React.FC<FieldReportDetailModalProps> = ({
  isOpen,
  caseItem,
  phase,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'photos' | 'ai'>('video')
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const [backendEvidence, setBackendEvidence] = useState<EvidenceItem[]>([])

  // Tải ảnh bằng chứng nghiệm thu từ Backend nếu có mã lệnh công tác
  useEffect(() => {
    if (isOpen && phase?.workOrderId) {
      workScheduleAPI
        .getWorkOrderEvidence(phase.workOrderId)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setBackendEvidence(res.items)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, phase?.workOrderId])

  if (!isOpen || !caseItem || !phase || !phase.report) return null

  const report = phase.report

  // Danh sách hình ảnh bằng chứng thực địa (Ưu tiên ảnh từ Backend, fallback demo nếu chưa có)
  const displayPhotos =
    backendEvidence.length > 0
      ? backendEvidence.map((ev, idx) => ({
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
          desc: `Thời điểm ghi nhận: ${ev.captured_at || ev.uploaded_at || 'Đã ghi nhận'}`,
          tag: ev.kind === 'before' ? 'Trước sửa' : ev.kind === 'after' ? 'Sau sửa' : 'Hiện trường',
        }))
      : [
          {
            src: fieldSurveyNightImg,
            title: 'Ảnh 1: Cột đèn thực địa ban đêm (POLE-0041)',
            desc: 'Chiếu sáng chập chờn, quang thông suy giảm nghiêm trọng khi xe tải đi qua.',
            tag: 'Hiện trường đêm',
          },
          {
            src: fieldBrokenFixtureImg,
            title: 'Ảnh 2: Chao đèn & Đui đèn bị cháy hỏng',
            desc: 'Cận cảnh đui đèn bị nứt vỡ cách điện, tiếp xúc lỏng gây phóng điện hồ quang.',
            tag: 'Chi tiết hỏng hóc',
          },
          {
            src: fieldLuxmeterImg,
            title: 'Ảnh 3: Kết quả đo máy Luxmeter tại mặt đường',
            desc: 'Độ rọi đo được chỉ 4.2 Lux (Tiêu chuẩn kỹ thuật chiếu sáng nông thôn: ≥ 15 Lux).',
            tag: 'Đo kiểm thiết bị',
          },
        ]

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
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
                {caseItem.segment} — Nộp bởi: <strong>{phase.assigneeName}</strong> lúc {report.submittedAt}
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
            onClick={() => setActiveTab('video')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'video'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Quét Thực Địa (1)</span>
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
            <span>Ảnh Chụp Bằng Chứng ({displayPhotos.length})</span>
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
            <span>Kết Quả AI & Đo Đạc Lux</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar bg-slate-50/50">
          {/* TAB 1: VIDEO KHẢO SÁT BAN ĐÊM */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-xl border border-slate-800 group select-none">
                {/* Ảnh nền video đêm */}
                <img
                  src={fieldSurveyNightImg}
                  alt="Night Survey Video Frame"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isPlaying ? 'opacity-90 brightness-110' : 'opacity-70'
                  }`}
                />

                {/* HUD Overlay Kỹ Thuật Số */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
                  <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-white font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>REC • NIGHT SURVEY CAM</span>
                    <span className="text-slate-400">1080P/30FPS</span>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-emerald-400 font-mono">
                    GPS: 10.8231° N, 106.6297° E • 25 km/h
                  </div>
                </div>

                <div className="absolute top-3 right-3 pointer-events-none">
                  <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-amber-300 font-mono flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-amber-400" />
                    <span>CV DETECTOR: ACTIVE</span>
                  </div>
                </div>

                {/* Bounding Box AI phát hiện cột đèn trên video */}
                <div className="absolute top-1/4 left-1/4 w-32 h-44 border-2 border-dashed border-amber-400/90 rounded-lg pointer-events-none flex flex-col justify-between p-1 bg-amber-500/10 animate-pulse">
                  <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded w-fit">
                    POLE-0041 [91%]
                  </span>
                  <span className="text-[8px] text-amber-300 font-mono bg-slate-900/80 px-1 rounded">
                    FLICKERING
                  </span>
                </div>

                {/* Nút Play/Pause ở trung tâm */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs ring-4 ring-white/30"
                  >
                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                  </button>
                </div>

                {/* Thanh điều khiển Video Player dưới đáy */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 pt-6 flex flex-col gap-2">
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                    <div
                      className={`bg-blue-500 h-full rounded-full ${
                        isPlaying ? 'w-2/3 transition-all duration-1000' : 'w-1/3'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/90 font-mono">
                    <div className="flex items-center gap-3">
                      <span>{isPlaying ? '00:28' : '00:15'} / 00:45</span>
                      <span className="text-slate-400">• Tệp: survey_video_field_0510.mp4</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomImage(fieldSurveyNightImg)}
                      className="flex items-center gap-1 hover:text-blue-400 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Xem toàn màn hình</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Thông tin mô tả video */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Mô Tả Quét Video Thực Địa Ban Đêm
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Thiết bị camera chuyên dụng ghi hình liên tục dọc tuyến 3.2km với góc nghiêng cố định hướng
                  lên đèn đường. Mô hình Computer Vision tự động phân tích khung hình, gắn nhãn ON/OFF và phát
                  hiện đèn chập chờn tại toạ độ cột POLE-0041.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ẢNH CHỤP BẰNG CHỨNG HIỆN TRƯỜNG */}
          {activeTab === 'photos' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {displayPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomImage(photo.src)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group flex flex-col"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                      <img
                        src={photo.src}
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
            </div>
          )}

          {/* TAB 3: KẾT QUẢ AI & ĐO ĐẠC LUX */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Thẻ chẩn đoán AI */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-500" />
                    Chẩn Đoán Tự Động Từ Mô Hình Computer Vision
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    Mô hình v2.4 Đã Kiểm Định
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 text-xs text-amber-950">
                    <div className="font-extrabold text-sm flex items-center gap-2">
                      <span>Cột POLE-0041: Đèn chập chờn / Đui đèn lỏng</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                        Độ tin cậy: 91%
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Phát hiện sự sụt giảm điện áp tức thời và tần số nhấp nháy 8Hz khi có rung chấn từ mặt
                      đường. Khuyến nghị: Thay bóng LED 100W và siết lại ốc kẹp đui đèn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Thẻ đo đạc Luxmeter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-600" />
                    Độ rọi mặt đường đo thực tế
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-600 font-mono">4.2</span>
                    <span className="text-sm font-bold text-slate-500">Lux</span>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      Dưới chuẩn (&lt;15 Lux)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Đo bằng máy Luxmeter Lumex LM-520 tại vị trí giữa hai cột đèn cách nhau 35m.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    Vật tư đề xuất thay thế
                  </span>
                  <div className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {report.suggestedMaterialsNote ||
                      '01 bóng LED 100W Rạng Đông, cờ lê 17, băng keo cách điện 3M'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Danh mục đề xuất tự do từ kỹ sư hiện trường phục vụ lập kế hoạch giai đoạn Sửa chữa.
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
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Zoomed Evidence"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
            />
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
