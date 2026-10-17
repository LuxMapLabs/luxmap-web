import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, AlertCircle, FileCheck, MapPin, FileDown } from 'lucide-react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { renderDecalToCanvas } from '../../../../utils/assets/decalCanvas'
import { qrCodeAPI } from '../../../../feature/qr-code/qrCodeAPI'
import { toast } from 'sonner'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../types/assets/segments'

interface BulkPoleQrPrintModalProps {
  isOpen: boolean
  poles: PoleListItem[]
  segments: SegmentListItem[]
  onClose: () => void
}

interface DecalItem {
  poleCode: string
  segmentName: string
  communeName: string
  qrDataUrl: string
  qrCodeText?: string | null
}

export const BulkPoleQrPrintModal: React.FC<BulkPoleQrPrintModalProps> = ({
  isOpen,
  poles,
  segments,
  onClose,
}) => {
  const [decals, setDecals] = useState<DecalItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const printAreaRef = useRef<HTMLDivElement | null>(null)

  // Map segment map cache
  const segmentMap = useMemo(() => {
    const map = new Map<string, string>()
    segments.forEach((s) => {
      const name = s.segment_name || (s.external_ref ? `Tuyến ${s.external_ref}` : '')
      if (s.segment_id && name) map.set(s.segment_id, name)
      if (s.external_ref && name) map.set(s.external_ref.toLowerCase(), name)
    })
    return map
  }, [segments])

  // Lọc chỉ lấy các cột có mã external_ref hợp lệ
  const validPoles = useMemo(() => {
    return poles.filter((p) => Boolean(p.external_ref && p.external_ref.trim()))
  }, [poles])

  // Tạo hàng loạt mã QR Data URL từ Backend
  useEffect(() => {
    if (!isOpen || validPoles.length === 0) {
      setDecals([])
      setIsGenerating(false)
      setProgress(0)
      return
    }

    let isCancelled = false
    setIsGenerating(true)
    setProgress(0)

    const generateAll = async () => {
      const results: DecalItem[] = []
      const total = validPoles.length

      for (let i = 0; i < total; i++) {
        if (isCancelled) return

        const pole = validPoles[i]
        const poleCode = pole.external_ref || ''
        const segName =
          (pole.segment_id ? segmentMap.get(pole.segment_id) : undefined) ||
          (pole.segment_id ? `Tuyến ${pole.segment_id}` : 'Chưa gắn tuyến')
        const comName = pole.commune_id || 'Địa bàn chung'

        try {
          // 1. Kiểm tra mã QR active của cột đèn từ Backend
          let activeQrUrl = ''
          let activeQrCode = ''

          const listRes = await qrCodeAPI.getQrCodes({
            pole_id: pole.pole_id,
            active: true,
            page: 1,
            page_size: 1,
          })

          if (listRes.items && listRes.items.length > 0 && listRes.items[0]?.url) {
            activeQrUrl = listRes.items[0].url
            activeQrCode = listRes.items[0].code || ''
          } else {
            // Cấp mã mới từ Backend nếu chưa có mã active
            const issueRes = await qrCodeAPI.issueQrCode({ pole_id: pole.pole_id })
            activeQrUrl = issueRes.url || ''
            activeQrCode = issueRes.code || ''
          }

          if (activeQrUrl) {
            const qrDataUrl = await QRCode.toDataURL(activeQrUrl, {
              width: 300,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
              errorCorrectionLevel: 'M',
            })

            results.push({
              poleCode,
              segmentName: segName,
              communeName: comName,
              qrDataUrl,
              qrCodeText: activeQrCode,
            })
          }
        } catch (err) {
          console.error(`Lỗi đồng bộ mã QR cho cột ${poleCode}:`, err)
        }

        setProgress(Math.round(((i + 1) / total) * 100))
      }

      if (!isCancelled) {
        setDecals(results)
        setIsGenerating(false)
        if (results.length > 0) {
          toast.success(`Đã chuẩn bị xong tem QR cho ${validPoles.length} cột đèn!`)
        }
      }
    }

    generateAll()

    return () => {
      isCancelled = true
    }
  }, [isOpen, validPoles, segmentMap])

  const [isExportingPdf, setIsExportingPdf] = useState(false)

  if (!isOpen) return null

  // Xuất file PDF toàn bộ danh sách tem (khổ A4, lưới 2 cột x 4 hàng = 8 tem/trang)
  // Sử dụng HTML5 Canvas render từng con tem để bảo đảm 100% TIẾNG VIỆT CÓ DẤU sắc nét, hoàn toàn không bị crash vì CSS oklch
  const handleDownloadAllPdf = async () => {
    if (decals.length === 0) {
      toast.error('Không có tem nào để xuất.')
      return
    }

    try {
      setIsExportingPdf(true)
      toast.info('Đang kết xuất tệp PDF dàn trang tem...', { duration: 3000 })

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Cấu hình lưới A4 (2 cột x 4 hàng = 8 tem/trang)
      const cols = 2
      const rows = 4
      const itemsPerPage = cols * rows
      const cardWidth = 92
      const cardHeight = 58
      const marginX = 9
      const marginY = 12
      const gapX = 8
      const gapY = 8

      for (let index = 0; index < decals.length; index++) {
        const item = decals[index]
        const indexOnPage = index % itemsPerPage
        const col = indexOnPage % cols
        const row = Math.floor(indexOnPage / cols)

        if (index > 0 && indexOnPage === 0) {
          doc.addPage()
        }

        const x = marginX + col * (cardWidth + gapX)
        const y = marginY + row * (cardHeight + gapY)

        // Vẽ con tem decal trực tiếp bằng HTML5 Canvas Context
        const canvas = await renderDecalToCanvas({
          poleCode: item.poleCode,
          segmentName: item.segmentName,
          communeName: item.communeName,
          qrDataUrl: item.qrDataUrl,
          qrCodeText: item.qrCodeText,
        })

        const imgData = canvas.toDataURL('image/png')
        doc.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight, undefined, 'FAST')
      }

      doc.save(`Danh_sach_tem_QR_decal_${decals.length}_cot.pdf`)
      toast.success(`Đã xuất file PDF cho ${decals.length} tem cột đèn!`)
    } catch (err) {
      console.error('Lỗi xuất file PDF:', err)
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Không thể tạo file PDF (${errorMsg})`)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static">
      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #bulk-qr-print-zone, #bulk-qr-print-zone * {
            visibility: visible !important;
          }
          #bulk-qr-print-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          .decal-page-card {
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
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 print:border-none print:shadow-none print:max-h-none print:rounded-none">
        {/* Header (ẩn khi in) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#1f3864] dark:bg-slate-950 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <FileDown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Dàn Trang In Tem QR Decal Hàng Loạt
                </h3>
                <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-400/30">
                  Khổ A4 (Lưới 2 Cột)
                </span>
              </div>
              <p className="text-xs text-slate-200 dark:text-slate-400">
                Chuẩn tem dán thân trụ đèn: Có logo, mã cột, tuyến đường và mã QR bảo mật Backend
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating || decals.length === 0 || isExportingPdf}
              onClick={handleDownloadAllPdf}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Tải File PDF Dàn Trang ({decals.length} tem)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info & Progress bar (ẩn khi in) */}
        {isGenerating && (
          <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 shrink-0 print:hidden">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Đang đồng bộ và cấp mã QR từ máy chủ cho {validPoles.length} cột đèn...</span>
            </div>
            <div className="w-36 bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content Body: Vùng xem trước và Vùng in ấn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 print:p-0 print:bg-white print:overflow-visible">
          {validPoles.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-500 opacity-60" />
              <p className="font-semibold text-sm">Không có cột đèn nào có mã hợp lệ để in tem.</p>
              <p className="text-xs">Vui lòng kiểm tra lại bộ lọc danh sách cột đèn.</p>
            </div>
          ) : (
            <div
              id="bulk-qr-print-zone"
              ref={printAreaRef}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-3 max-w-[210mm] mx-auto print:max-w-none print:w-full"
            >
              {decals.map((decal, index) => (
                <div
                  key={`${decal.poleCode}-${index}`}
                  className="decal-page-card bg-white text-slate-900 border-2 border-[#1f3864] rounded-2xl p-3.5 shadow-sm flex flex-col justify-between print:shadow-none print:border-2 print:border-[#1f3864] print:rounded-xl print:p-3"
                  style={{ minHeight: '52mm', backgroundColor: '#ffffff' }}
                >
                  {/* Header Tem */}
                  <div className="border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                      <strong className="text-[11px] font-black tracking-wide text-[#1f3864] uppercase">
                        LUXMAP — CHIẾU SÁNG ĐÔ THỊ
                      </strong>
                    </div>
                    <span className="text-[9px] font-bold text-slate-600">
                      Tem Quét Báo Sự Cố
                    </span>
                  </div>

                  {/* Body Tem: Mã QR bên trái, Định danh bên phải */}
                  <div className="flex items-center gap-3">
                    {/* QR Code */}
                    <div className="shrink-0 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center">
                      {decal.qrDataUrl ? (
                        <img
                          src={decal.qrDataUrl}
                          alt={`QR ${decal.poleCode}`}
                          className="w-24 h-24 object-contain"
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-slate-50 text-[10px] text-slate-400">
                          Đang tải...
                        </div>
                      )}
                    </div>

                    {/* Thông tin mốc dán cột */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">
                          TUYẾN ĐƯỜNG
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate" title={decal.segmentName}>
                          {decal.segmentName}
                        </p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">
                          ĐỊA BÀN QUẢN LÝ
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{decal.communeName}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">
                          MÃ TEM QUÉT
                        </span>
                        <strong className="text-[10px] font-black font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block tracking-wider">
                          {decal.qrCodeText || decal.poleCode}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Footer Tem: Hướng dẫn người dân */}
                  <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-200 text-center">
                    <p className="text-[9px] font-medium text-slate-600">
                      📱 Dùng camera điện thoại quét mã QR để báo sự cố đèn chiếu sáng
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions (ẩn khi in) */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" />
            <span>
              Tổng số tem sẵn sàng: <strong>{decals.length}</strong> tem
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
