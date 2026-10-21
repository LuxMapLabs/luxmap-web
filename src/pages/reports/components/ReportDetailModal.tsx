import React, { useRef, useState } from 'react'
import { Printer, Download, X, ShieldCheck, Loader2 } from 'lucide-react'
import type { SuperiorReportItem } from '../../../types/reports/report'
import { exportReportToPdf } from '../../../utils/reports/reportPdfGenerator'
import { EvidenceImage } from '../../work-schedule/components/EvidenceImage'

interface ReportDetailModalProps {
  isOpen: boolean
  report: SuperiorReportItem | null
  onClose: () => void
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  report,
  onClose,
}) => {
  const paperRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen || !report) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExportPdf = async () => {
    if (!report || isExporting) return
    try {
      setIsExporting(true)
      await exportReportToPdf(report, paperRef.current)
    } catch (err) {
      console.error('Lỗi xuất PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const beforePhoto = report.evidencePhotos?.find((p) => p.kind === 'before') || report.evidencePhotos?.[0]
  const afterPhoto = report.evidencePhotos?.find((p) => p.kind === 'after') || report.evidencePhotos?.[1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOPBAR MODAL */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              📜
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Biên Bản Nghiệm Thu Kỹ Thuật
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mã lệnh công tác: <strong className="text-blue-700 font-mono">{report.workOrderId}</strong> • {report.communeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In biên bản</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Xuất file PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors ml-1 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY MODAL: TRANG VĂN BẢN A4 CHUẨN THỂ THỨC */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70">
          <div
            ref={paperRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 text-slate-800 max-w-3xl mx-auto printable-report"
          >
            {/* Header Quốc hiệu / Đơn vị quản lý */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 mb-6 border-b-2 border-slate-800 gap-4">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  UBND HUYỆN NINH PHƯỚC
                </h4>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase text-slate-900 mt-0.5">
                  PHÒNG KINH TẾ & HẠ TẦNG
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Số: {report.workOrderId}/BB-NTCS-2026
                </p>
              </div>

              <div className="text-center sm:text-right">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h4>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <div className="w-24 h-0.5 bg-slate-300 mx-auto sm:ml-auto sm:mr-0 my-1.5" />
                <p className="text-[11px] text-slate-500 italic">
                  Ninh Phước, ngày {report.verifiedDate}
                </p>
              </div>
            </div>

            {/* Tiêu đề chính của văn bản */}
            <div className="text-center my-6">
              <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">
                BIÊN BẢN NGHIỆM THU KỸ THUẬT & BÀN GIAO
              </h1>
              <p className="text-xs text-slate-500 mt-1 italic">
                V/v: Hoàn thành bảo trì, sửa chữa hệ thống chiếu sáng đường giao thông nông thôn
              </p>
            </div>

            {/* PHẦN I: THÔNG TIN LỆNH CÔNG TÁC */}
            <div className="mb-6">
              <h3 className="text-xs font-extrabold uppercase text-blue-700 pb-1.5 border-b border-blue-100 flex items-center gap-2 mb-3">
                <span>I. THÔNG TIN LỆNH CÔNG TÁC</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Mã lệnh công tác:
                  </span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {report.workOrderId}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Giai đoạn tác nghiệp:
                  </span>
                  <span className="font-bold text-slate-900">
                    {report.taskKindName} ({report.taskKind})
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Tuyến đường xử lý:
                  </span>
                  <span className="font-bold text-slate-900">{report.road}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Địa bàn hành chính:
                  </span>
                  <span className="font-bold text-slate-900">
                    {report.communeName}, Huyện Ninh Phước
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Kỹ sư hiện trường:
                  </span>
                  <span className="font-bold text-slate-900">{report.engineerName}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Quản lý thẩm duyệt:
                  </span>
                  <span className="font-bold text-slate-900">{report.managerName}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Thời điểm hoàn tất:
                  </span>
                  <span className="font-bold text-slate-900">{report.completedDate}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">
                    Thời điểm nghiệm thu:
                  </span>
                  <span className="font-bold text-slate-900">{report.verifiedDate}</span>
                </div>
              </div>
            </div>

            {/* PHẦN II: HIỆN TRẠNG SỰ CỐ & KẾT QUẢ KHẮC PHỤC */}
            <div className="mb-6">
              <h3 className="text-xs font-extrabold uppercase text-blue-700 pb-1.5 border-b border-blue-100 flex items-center gap-2 mb-3">
                <span>II. HIỆN TRẠNG SỰ CỐ & KẾT QUẢ KHẮC PHỤC</span>
              </h3>

              <div className="text-xs space-y-2 leading-relaxed text-slate-700">
                <p>
                  <strong className="text-slate-900">1. Hiện trạng sự cố ban đầu:</strong>{' '}
                  {report.initialFaultDesc}
                </p>
                <p>
                  <strong className="text-slate-900">2. Kết quả khắc phục thực địa:</strong>{' '}
                  {report.solutionDesc}
                </p>
                {report.reportNote && (
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    Ghi chú từ kỹ sư: &ldquo;{report.reportNote}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* PHẦN III: MINH CHỨNG HÌNH ẢNH HIỆN TRƯỜNG */}
            {report.evidencePhotos && report.evidencePhotos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-extrabold uppercase text-blue-700 pb-1.5 border-b border-blue-100 flex items-center gap-2 mb-3">
                  <span>III. MINH CHỨNG HÌNH ẢNH HIỆN TRƯỜNG</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {beforePhoto && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-100 text-rose-700 font-bold text-[11px] flex justify-between">
                        <span>📸 TRƯỚC TÁC NGHIỆP (BEFORE)</span>
                      </div>
                      <div className="h-44 bg-slate-200 flex items-center justify-center overflow-hidden">
                        <EvidenceImage
                          evidenceId={beforePhoto.id}
                          fallbackSrc={beforePhoto.url}
                          alt="Trước tác nghiệp"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 text-[10.5px] text-slate-500 bg-white">
                        {beforePhoto.locationText || 'Hiện trường trước khi sửa'} • {beforePhoto.capturedAt || 'Ghi nhận'}
                      </div>
                    </div>
                  )}

                  {afterPhoto && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-emerald-700 font-bold text-[11px] flex justify-between">
                        <span>✨ SAU HOÀN TẤT (AFTER)</span>
                      </div>
                      <div className="h-44 bg-slate-200 flex items-center justify-center overflow-hidden">
                        <EvidenceImage
                          evidenceId={afterPhoto.id}
                          fallbackSrc={afterPhoto.url}
                          alt="Sau tác nghiệp"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 text-[10.5px] text-slate-500 bg-white">
                        {afterPhoto.locationText || 'Hiện trường sau nghiệm thu'} • {afterPhoto.capturedAt || 'Hoàn thành'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PHẦN IV: Ý KIẾN THẨM DUYỆT CỦA CÁN BỘ QUẢN LÝ */}
            <div className="mb-6">
              <h3 className="text-xs font-extrabold uppercase text-blue-700 pb-1.5 border-b border-blue-100 flex items-center gap-2 mb-3">
                <span>IV. Ý KIẾN THẨM DUYỆT CỦA CÁN BỘ QUẢN LÝ</span>
              </h3>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>KẾT QUẢ ĐÁNH GIÁ: ĐẠT TIÊU CHUẨN NGHIỆM THU</span>
                </div>
                <p className="italic">&ldquo;{report.reviewNote}&rdquo;</p>
              </div>
            </div>

            {/* PHẦN V: CHỮ KÝ XÁC NHẬN */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-4 text-center select-none">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800">
                  ĐẠI DIỆN ĐƠN VỊ QUẢN LÝ
                </h4>
                <p className="text-[11px] text-slate-400 italic mt-0.5">
                  (Ký, ghi rõ họ tên & thẩm duyệt)
                </p>

                <div className="h-16 flex items-center justify-center my-2">
                  <div className="border border-dashed border-emerald-500 text-emerald-700 bg-emerald-50/70 px-3 py-1 rounded-md text-[10px] font-bold">
                    <span>✔ ĐÃ XÁC THỰC ĐIỆN TỬ</span>
                    <span className="block text-[9px] text-emerald-600 font-normal">
                      Hệ thống LuxMap • {report.verifiedDate}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-extrabold text-slate-900">{report.managerName}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800">
                  ĐẠI DIỆN CƠ QUAN CẤP TRÊN (SUPERIOR)
                </h4>
                <p className="text-[11px] text-slate-400 italic mt-0.5">
                  (Phê chuẩn & Tiếp nhận hồ sơ)
                </p>

                <div className="h-16 flex items-center justify-center my-2">
                  <div className="border border-dashed border-blue-500 text-blue-700 bg-blue-50/70 px-3 py-1 rounded-md text-[10px] font-bold">
                    <span>✔ ĐÃ TIẾP NHẬN HỒ SƠ</span>
                    <span className="block text-[9px] text-blue-600 font-normal">
                      Phòng Kinh tế & Hạ tầng
                    </span>
                  </div>
                </div>

                <p className="text-xs font-extrabold text-slate-900">Đặng Văn Cường</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
