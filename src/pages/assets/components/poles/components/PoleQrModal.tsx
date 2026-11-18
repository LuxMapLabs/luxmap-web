import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  QrCode,
  FileDown,
  Loader2,
  Ban,
  RefreshCw,
  ExternalLink,
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

  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

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
        note: pole.note || '',
        qrDataUrl,
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
                <span>Mã QR</span>
                <span className="font-mono text-amber-300 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                  {poleCode}
                </span>
              </h3>
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
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200 print:hidden max-h-[82vh] overflow-y-auto">
          {/* Khối mới: QR bên trái, trạng thái & thông tin bên phải */}
          <div className="flex items-center gap-4 text-left">
            {/* Trái: ô QR w-32 h-32 */}
            <div className="w-32 h-32 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2 shrink-0 flex items-center justify-center">
              {isFetching || isIssuing ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : qrDataUrl && isActive ? (
                <img
                  src={qrDataUrl}
                  alt={`Mã QR ${poleCode}`}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : currentPoleQr && !isActive ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 space-y-1">
                  <Ban className="w-6 h-6 text-rose-500 opacity-80" />
                  <span className="font-bold text-rose-700 dark:text-rose-400 text-[11px]">
                    Đã thu hồi
                  </span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 space-y-1">
                  <QrCode className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  <span className="text-slate-500 text-[11px] font-medium">Chưa có mã</span>
                </div>
              )}
            </div>

            {/* Phải: Thông tin & Trạng thái */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                {isFetching ? (
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang kiểm tra...
                  </span>
                ) : currentPoleQr ? (
                  isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Đã thu hồi
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[10px]">
                    Chưa cấp mã
                  </span>
                )}
              </div>

              {currentPoleQr?.created_at && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cấp ngày {new Date(currentPoleQr.created_at).toLocaleDateString('vi-VN')}
                </p>
              )}

              {reportUrl && isActive && (
                <div>
                  <a
                    href={reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg cursor-pointer transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở trang báo sự cố</span>
                  </a>
                </div>
              )}
            </div>
          </div>

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
                      <span>Đang xuất PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Tải tem QR (PDF A6)</span>
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
                    <span>Thu hồi mã</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleIssue}
                    title="Cấp lại mã QR mới sẽ tự động thu hồi mã hiện tại"
                    className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cấp mã mới</span>
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
                <span>Cấp mã mới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleIssue}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Cấp mã mới</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
