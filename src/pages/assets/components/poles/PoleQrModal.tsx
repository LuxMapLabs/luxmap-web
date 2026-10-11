import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, QrCode, Copy, FileDown, Check, MapPin, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { renderDecalToCanvas } from '../../../../utils/decalCanvas'
import { toast } from 'sonner'
import type { PoleListItem } from '../../../../types/assets/poles'
import { buildPoleReportUrl } from '../../../../utils/qrSecurity'

interface PoleQrModalProps {
  isOpen: boolean
  pole: PoleListItem | null
  segmentName?: string
  communeName?: string
  onClose: () => void
}

export const PoleQrModal: React.FC<PoleQrModalProps> = ({
  isOpen,
  pole,
  segmentName = '',
  communeName = '',
  onClose,
}) => {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const decalCardRef = useRef<HTMLDivElement | null>(null)

  const poleCode = pole?.external_ref || ''

  // Cố định URL báo cáo bằng useMemo để không bị gọi lại mã hóa AES mỗi lần re-render
  const reportUrl = useMemo(() => {
    if (!poleCode) return ''
    return buildPoleReportUrl(poleCode, segmentName, communeName)
  }, [poleCode, segmentName, communeName])

  // Tạo Data URL hình ảnh mã QR bằng thư viện qrcode
  useEffect(() => {
    if (!isOpen || !reportUrl) {
      setQrDataUrl('')
      return
    }

    let isSubscribed = true

    QRCode.toDataURL(
      reportUrl,
      {
        width: 360,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error, url) => {
        if (!isSubscribed) return
        if (error) {
          toast.error('Không thể tạo mã QR.')
        } else {
          setQrDataUrl(url)
        }
      }
    )

    return () => {
      isSubscribed = false
    }
  }, [isOpen, reportUrl])

  if (!isOpen || !pole) return null

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl)
      setCopied(true)
      toast.success('Đã sao chép liên kết báo cáo sự cố!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép liên kết vào bộ nhớ tạm.')
    }
  }

  // Xuất file PDF tem decal trực tiếp bằng HTML5 Canvas + jsPDF (Giữ nguyên vẹn 100% Tiếng Việt có dấu, triệt tiêu hoàn toàn lỗi oklch của CSS)
  const handleDownloadPdf = async () => {
    if (!qrDataUrl) {
      toast.error('Mã QR đang được khởi tạo, vui lòng chờ giây lát.')
      return
    }

    try {
      setIsExportingPdf(true)

      // Vẽ tem decal trực tiếp lên Canvas độ nét cao độc lập với CSS Tailwind v4
      const canvas = await renderDecalToCanvas({
        poleCode,
        segmentName,
        communeName,
        qrDataUrl,
      })

      const imgData = canvas.toDataURL('image/png')

      // Khởi tạo file PDF A4 dọc (210mm x 297mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Kích thước tem trên trang A4: chiều rộng 110mm, chiều cao tương ứng theo tỉ lệ canvas (1050x600 -> tỉ lệ 7:4)
      const decalWidthMm = 110
      const decalHeightMm = (canvas.height * decalWidthMm) / canvas.width
      const posX = (210 - decalWidthMm) / 2
      const posY = 35

      doc.addImage(imgData, 'PNG', posX, posY, decalWidthMm, decalHeightMm, undefined, 'FAST')
      doc.save(`Tem_QR_${poleCode}.pdf`)
      toast.success(`Đã xuất file PDF tem QR cho ${poleCode}!`)
    } catch (err) {
      console.error('Lỗi xuất PDF:', err)
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Không thể tạo file PDF (${errorMsg})`)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 print:p-0 print:m-0 print:static">
      {/* Print CSS Injection: In chuẩn con tem decal A4/Decal */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #single-decal-print-zone, #single-decal-print-zone * {
            visibility: visible !important;
          }
          #single-decal-print-zone {
            position: absolute !important;
            left: 50% !important;
            top: 20mm !important;
            transform: translateX(-50%) !important;
            width: 130mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .single-decal-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Backdrop (ẩn khi in) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 print:border-none print:shadow-none print:rounded-none">
        {/* Header (ẩn khi in) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#1f3864] dark:bg-slate-950 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <span>Mã QR Cột Đèn</span>
                <span className="font-mono text-amber-300 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                  {poleCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-200 dark:text-slate-400">
                Nhãn QR quét sự cố dành cho người dân
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body (Ẩn khi in, thay thế bằng vùng in decal chuẩn) */}
        <div className="p-5 sm:p-6 space-y-5 text-center text-xs text-slate-800 dark:text-slate-200 print:hidden">
          {/* Thông tin định danh */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Vị trí dán nhãn:</span>
              <strong className="text-slate-900 dark:text-white font-mono">{poleCode || '-'}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">
                {(segmentName || '-') + ' — ' + (communeName || '-')}
              </span>
            </div>
          </div>

          {/* QR Code Container (Vẽ hình ảnh từ QRCode Data URL) */}
          <div className="relative inline-block p-4 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Mã QR ${poleCode}`}
                className="w-56 h-56 mx-auto rounded-lg shadow-2xs object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-medium text-xs">
                Đang tạo mã QR...
              </div>
            )}
          </div>

          {/* URL Box */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="text"
              readOnly
              value={reportUrl}
              className="w-full bg-transparent text-[11px] font-mono text-slate-600 dark:text-slate-300 outline-none px-1 truncate select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              title="Sao chép liên kết"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Action Button: Xuất file PDF tem decal chuẩn công nghiệp */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isExportingPdf || !qrDataUrl}
              onClick={handleDownloadPdf}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất file PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Tải Tem QR (File PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Khối Decal in riêng biệt: Sử dụng kỹ thuật offscreen để html2canvas luôn đo được kích thước và chụp hình tiếng Việt có dấu sắc nét */}
        <div
          id="single-decal-print-zone"
          className="fixed -left-[9999px] top-0 pointer-events-none opacity-100 z-[-50] print:static print:opacity-100 print:pointer-events-auto"
        >
          <div
            ref={decalCardRef}
            className="single-decal-card bg-white text-slate-900 border-2 border-[#1f3864] rounded-2xl p-4 shadow-none w-[420px]"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Header Tem */}
            <div className="border-b border-slate-300 pb-2 mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                <strong className="text-xs font-black tracking-wide text-[#1f3864] uppercase">
                  LUXMAP — CHIẾU SÁNG ĐÔ THỊ
                </strong>
              </div>
              <span className="text-[10px] font-bold text-slate-600">
                Tem Quét Báo Sự Cố
              </span>
            </div>

            {/* Body Tem: Mã QR bên trái, Thông tin bên phải */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Mã QR ${poleCode}`}
                    className="w-28 h-28 object-contain"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center text-[10px] text-slate-400">
                    Đang tải...
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">
                    MÃ CỘT ĐÈN
                  </span>
                  <strong className="text-lg font-black font-mono text-blue-900 tracking-wider block">
                    {poleCode}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">
                    TUYẾN ĐƯỜNG
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {segmentName || 'Chưa gắn tuyến'}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{communeName || 'Địa bàn chung'}</span>
                </div>
              </div>
            </div>

            {/* Footer Tem */}
            <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-center">
              <p className="text-[10px] font-medium text-slate-600">
                📱 Dùng camera điện thoại quét mã QR để báo sự cố đèn chiếu sáng
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
