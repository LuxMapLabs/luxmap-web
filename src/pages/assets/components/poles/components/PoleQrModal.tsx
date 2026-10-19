import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  QrCode,
  Copy,
  FileDown,
  Check,
  MapPin,
  Loader2,
  Ban,
  RefreshCw,
  Calendar,
  KeyRound,
} from 'lucide-react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { useDispatch, useSelector } from 'react-redux'
import { renderDecalToCanvas } from '../../../../../utils/assets/decalCanvas'
import { toast } from 'sonner'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { RootState, AppDispatch } from '../../../../../redux/store'
import {
  fetchPoleQrRequest,
  issueQrCodeRequest,
  revokeQrCodeRequest,
  clearCurrentPoleQr,
} from '../../../../../feature/qr-code/qrCodeSlice'

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
  const dispatch = useDispatch<AppDispatch>()
  const { currentPoleQr, isFetching, isIssuing, isRevoking } = useSelector(
    (state: RootState) => state.qrCode
  )

  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const decalCardRef = useRef<HTMLDivElement | null>(null)

  const poleId = pole?.pole_id || ''
  const poleCode = pole?.external_ref || ''

  // 1. Khi mở Modal: Gửi action truy vấn mã QR của cột đèn từ Backend
  useEffect(() => {
    if (isOpen && poleId) {
      dispatch(fetchPoleQrRequest(poleId))
    }
    return () => {
      dispatch(clearCurrentPoleQr())
      setQrDataUrl('')
      setShowRevokeConfirm(false)
    }
  }, [isOpen, poleId, dispatch])

  // 2. URL báo cáo thực tế lấy trực tiếp từ Backend
  const reportUrl = currentPoleQr?.url || ''
  const qrCodeText = currentPoleQr?.code || ''
  const isActive = currentPoleQr?.active ?? false

  // 3. Tạo Data URL hình ảnh mã QR bằng thư viện qrcode từ reportUrl Backend
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
    if (!reportUrl) return
    try {
      await navigator.clipboard.writeText(reportUrl)
      setCopied(true)
      toast.success('Đã sao chép liên kết báo cáo sự cố!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép liên kết vào bộ nhớ tạm.')
    }
  }

  // Hành động: Cấp mã QR mới
  const handleIssue = () => {
    if (!poleId) return
    dispatch(issueQrCodeRequest({ pole_id: poleId }))
  }

  // Hành động: Thu hồi mã QR
  const handleRevoke = () => {
    if (!currentPoleQr?.qr_id) return
    dispatch(
      revokeQrCodeRequest({
        qrId: currentPoleQr.qr_id,
        poleId,
      })
    )
    setShowRevokeConfirm(false)
  }

  // Xuất file PDF Decal A6 chuẩn (Khổ ngang 148mm × 105mm, con tem 126mm × 72mm)
  const handleDownloadPdf = async () => {
    if (!qrDataUrl) {
      toast.error('Mã QR đang được khởi tạo, vui lòng chờ giây lát.')
      return
    }

    try {
      setIsExportingPdf(true)

      // Vẽ tem decal trực tiếp lên Canvas độ nét cao
      const canvas = await renderDecalToCanvas({
        poleCode,
        segmentName,
        communeName,
        qrDataUrl,
        qrCodeText,
      })

      const imgData = canvas.toDataURL('image/png')

      // Khởi tạo file PDF A6 ngang (148mm x 105mm) chuẩn in tem decal
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a6',
      })

      // Kích thước trang A6 ngang: Rộng 148mm, Cao 105mm
      const pageWidth = 148
      const pageHeight = 105

      // Kích thước tem trên trang A6: Chiều rộng 126mm, chiều cao tương ứng tỉ lệ 7:4 (~72mm)
      const decalWidthMm = 126
      const decalHeightMm = (canvas.height * decalWidthMm) / canvas.width
      const posX = (pageWidth - decalWidthMm) / 2
      const posY = (pageHeight - decalHeightMm) / 2

      doc.addImage(imgData, 'PNG', posX, posY, decalWidthMm, decalHeightMm, undefined, 'FAST')
      doc.save(`Tem_QR_A6_${poleCode}.pdf`)
      toast.success(`Đã xuất file PDF Decal A6 tem QR cho ${poleCode}!`)
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 print:border-none print:shadow-none print:rounded-none">
        {/* Header */}
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
                Quản lý & in tem QR dán cột đèn (Backend Server)
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-center text-xs text-slate-800 dark:text-slate-200 print:hidden max-h-[82vh] overflow-y-auto">
          {/* Thông tin định danh & Trạng thái Backend */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2">
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

            {/* Trạng thái mã QR do Backend cấp */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Trạng thái mã:</span>
              {isFetching ? (
                <span className="text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang kiểm tra...
                </span>
              ) : currentPoleQr ? (
                isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động (Active)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Đã thu hồi (Revoked)
                  </span>
                )
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Chưa cấp mã QR
                </span>
              )}
            </div>

            {currentPoleQr && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10.5px] text-slate-600 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Mã: <strong>{currentPoleQr.code}</strong></span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Ngày cấp: {currentPoleQr.created_at ? new Date(currentPoleQr.created_at).toLocaleDateString('vi-VN') : '---'}</span>
                </div>
              </div>
            )}
          </div>

          {/* QR Code Container */}
          <div className="relative inline-block p-4 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
            {isFetching || isIssuing ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Đang xử lý mã QR...</span>
              </div>
            ) : qrDataUrl && isActive ? (
              <div>
                <img
                  src={qrDataUrl}
                  alt={`Mã QR ${poleCode}`}
                  className="w-52 h-52 mx-auto rounded-lg shadow-2xs object-contain"
                />
                <p className="mt-2 font-mono text-[11px] font-bold text-slate-700 tracking-wider">
                  MÃ: {qrCodeText}
                </p>
              </div>
            ) : currentPoleQr && !isActive ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center p-3 text-center space-y-2">
                <Ban className="w-10 h-10 text-rose-500 opacity-80 mx-auto" />
                <p className="font-bold text-rose-700 text-xs">Mã QR đã bị thu hồi</p>
                <p className="text-[11px] text-slate-500">
                  Tem quét này đã bị vô hiệu hóa. Vui lòng bấm cấp mã mới để in tem thay thế.
                </p>
              </div>
            ) : (
              <div className="w-52 h-52 flex flex-col items-center justify-center p-3 text-center space-y-2">
                <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Cột đèn này chưa có mã QR</p>
                <button
                  type="button"
                  onClick={handleIssue}
                  disabled={isIssuing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cấp mã QR ngay
                </button>
              </div>
            )}
          </div>

          {/* URL Box */}
          {reportUrl && isActive && (
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
          )}

          {/* Hộp xác nhận thu hồi (Revoke Confirmation) */}
          {showRevokeConfirm && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-left space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Xác nhận thu hồi mã QR?</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Tem ngoài thực địa sẽ bị vô hiệu hóa ngay lập tức. Người dân quét mã cũ sẽ nhận thông báo tem đã hết hạn sử dụng.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRevokeConfirm(false)}
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 rounded-lg text-xs cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleRevoke}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isRevoking && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Đồng ý thu hồi</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Xuất file PDF Decal A6 & Quản lý vòng đời */}
          <div className="pt-2">
            {isFetching || isIssuing ? (
              <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>
                  {isIssuing ? 'Đang cấp mã QR mới...' : 'Đang kiểm tra dữ liệu mã QR...'}
                </span>
              </div>
            ) : isActive ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isExportingPdf || !qrDataUrl}
                  onClick={handleDownloadPdf}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xuất file PDF Decal A6...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Tải Tem QR (File PDF Decal A6)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={() => setShowRevokeConfirm(true)}
                    className="py-2 px-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Thu hồi mã QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleIssue}
                    title="Cấp lại mã QR mới sẽ tự động thu hồi mã hiện tại"
                    className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cấp lại mã khác</span>
                  </button>
                </div>
              </div>
            ) : !currentPoleQr ? (
              <button
                type="button"
                onClick={handleIssue}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Cấp mã QR mới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleIssue}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Cấp mã QR mới thay thế</span>
              </button>
            )}
          </div>
        </div>

        {/* Khối Decal in riêng biệt */}
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

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    TUYẾN ĐƯỜNG
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {segmentName || 'Chưa gắn tuyến'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    ĐỊA BÀN QUẢN LÝ
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{communeName || 'Địa bàn chung'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    MÃ TEM QUÉT
                  </span>
                  <strong className="text-xs font-black font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block tracking-wider">
                    {qrCodeText || poleCode || '---'}
                  </strong>
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
