import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Search,
  CheckSquare,
  Square,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  QrCode,
  FileCheck,
} from 'lucide-react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { toast } from 'sonner'
import type { RootState } from '../../../redux/rootReducer'
import { fetchAssetsRequest } from '../../../feature/assets/assetSlice'
import {
  fetchBusyGpsPolesRequest,
  clearBusyGpsPoles,
} from '../../../feature/work-schedule/workScheduleSlice'
import { ensurePoleQrCodesRequest } from '../../../feature/qr-code/qrCodeSlice'
import { renderDecalToCanvas } from '../../../utils/assets/decalCanvas'
import type { PoleListItem } from '../../../types/assets/poles'

interface GpsPoleSelectorProps {
  segmentId: string
  segmentName?: string
  selectedPoleIds: string[]
  onChange: (poleIds: string[]) => void
  onAttachQrPdfFile?: (file: File) => void
  attachedFileNames?: string[]
}

function hasPoleGps(pole: PoleListItem): boolean {
  return Boolean(
    pole.location &&
      typeof pole.location.lat === 'number' &&
      typeof pole.location.lng === 'number'
  )
}

export const GpsPoleSelector: React.FC<GpsPoleSelectorProps> = ({
  segmentId,
  segmentName = '',
  selectedPoleIds,
  onChange,
  onAttachQrPdfFile,
  attachedFileNames = [],
}) => {
  const dispatch = useDispatch()
  const { poles, segments: storeSegments, isLoadingAssets, loadAssetsError } = useSelector(
    (state: RootState) => state.assets
  )
  const { busyGpsPoleIds, isLoadingBusyGpsPoles: isLoadingBusyPoles } = useSelector(
    (state: RootState) => state.workSchedule
  )
  const {
    activeCodesByPoleId,
    isEnsuringPoleQrs,
    lastEnsuredBatchId,
  } = useSelector((state: RootState) => state.qrCode)

  const [isDropdownOpen, setIsDropdownOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [generatingKey, setGeneratingKey] = useState<string | null>(null)
  const pendingQrBatchRef = useRef<{
    batchId: string
    targetPoles: PoleListItem[]
    mode: 'single' | 'bulk'
  } | null>(null)

  useEffect(() => {
    if (poles.length === 0 && !isLoadingAssets && !loadAssetsError) {
      dispatch(fetchAssetsRequest())
    }
  }, [dispatch, poles.length, isLoadingAssets, loadAssetsError])

  // Tải danh sách các cột đang nằm trong phiếu pole_gps_update chưa đóng qua Redux-Saga
  useEffect(() => {
    if (!segmentId) {
      dispatch(clearBusyGpsPoles())
      return
    }
    dispatch(fetchBusyGpsPolesRequest(segmentId))
  }, [dispatch, segmentId])

  const busyPoleIds = useMemo(() => new Set(busyGpsPoleIds), [busyGpsPoleIds])

  // Nếu danh sách chọn hiện tại có cột đang bận (ví dụ từ prefill), tự động loại bỏ
  useEffect(() => {
    if (busyPoleIds.size === 0 || selectedPoleIds.length === 0) return
    const cleaned = selectedPoleIds.filter((id) => !busyPoleIds.has(id))
    if (cleaned.length !== selectedPoleIds.length) {
      onChange(cleaned)
    }
  }, [busyPoleIds, selectedPoleIds, onChange])

  const totalSegmentPoleCount = useMemo(() => {
    if (!segmentId) return 0
    return poles.filter((p) => p.pole_id && p.segment_id === segmentId).length
  }, [poles, segmentId])

  // Lọc cột thuộc tuyến đang chọn, ẩn các cột đang nằm trong phiếu khác, và sort cột chưa có GPS lên đầu
  const sortedSegmentPoles = useMemo(() => {
    if (!segmentId) return []
    const inSegment = poles.filter(
      (p) => p.pole_id && p.segment_id === segmentId && !busyPoleIds.has(p.pole_id)
    )
    return [...inSegment].sort((a, b) => {
      const aHasGps = hasPoleGps(a)
      const bHasGps = hasPoleGps(b)
      if (aHasGps !== bHasGps) {
        return aHasGps ? 1 : -1
      }
      const codeA = (a.external_ref || a.pole_id || '').toLowerCase()
      const codeB = (b.external_ref || b.pole_id || '').toLowerCase()
      return codeA.localeCompare(codeB)
    })
  }, [poles, segmentId, busyPoleIds])

  const noGpsPoleIds = useMemo(
    () =>
      sortedSegmentPoles
        .filter((p) => !hasPoleGps(p))
        .map((p) => p.pole_id as string),
    [sortedSegmentPoles]
  )

  const filteredPoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sortedSegmentPoles
    return sortedSegmentPoles.filter((p) => {
      const poleId = (p.pole_id || '').toLowerCase()
      const extRef = (p.external_ref || '').toLowerCase()
      const note = (p.note || '').toLowerCase()
      return poleId.includes(q) || extRef.includes(q) || note.includes(q)
    })
  }, [sortedSegmentPoles, searchTerm])

  const MAX_POLES_PER_ORDER = 200

  const handleTogglePole = (poleId: string) => {
    if (selectedPoleIds.includes(poleId)) {
      onChange(selectedPoleIds.filter((id) => id !== poleId))
    } else {
      if (selectedPoleIds.length >= MAX_POLES_PER_ORDER) {
        toast.warning(`Mỗi phiếu cập nhật vị trí cột chỉ được chọn tối đa ${MAX_POLES_PER_ORDER} cột.`)
        return
      }
      onChange([...selectedPoleIds, poleId])
    }
  }

  const handleSelectAllNoGps = () => {
    const merged = Array.from(new Set([...selectedPoleIds, ...noGpsPoleIds]))
    if (merged.length > MAX_POLES_PER_ORDER) {
      toast.warning(`Đã chọn tối đa ${MAX_POLES_PER_ORDER} cột cho một phiếu cập nhật vị trí cột.`)
      onChange(merged.slice(0, MAX_POLES_PER_ORDER))
      return
    }
    onChange(merged)
  }

  const isAllFilteredSelected =
    filteredPoles.length > 0 &&
    filteredPoles.every((p) => selectedPoleIds.includes(p.pole_id as string))

  const handleToggleAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredPoles.map((p) => p.pole_id as string))
      onChange(selectedPoleIds.filter((id) => !filteredSet.has(id)))
    } else {
      const filteredIds = filteredPoles.map((p) => p.pole_id as string)
      const merged = Array.from(new Set([...selectedPoleIds, ...filteredIds]))
      if (merged.length > MAX_POLES_PER_ORDER) {
        toast.warning(`Đã chọn tối đa ${MAX_POLES_PER_ORDER} cột cho một phiếu cập nhật vị trí cột.`)
        onChange(merged.slice(0, MAX_POLES_PER_ORDER))
        return
      }
      onChange(merged)
    }
  }

  const resolvedSegmentName = useMemo(() => {
    if (segmentName) {
      return segmentName.replace(/\s*\(SEG-[A-Za-z0-9_-]+\)\s*$/i, '').trim()
    }
    const found = storeSegments.find((s) => s.segment_id === segmentId)
    return found?.segment_name || segmentId || ''
  }, [segmentName, storeSegments, segmentId])

  // Khi Saga đảm bảo mã QR cho các cột xong, tiến hành vẽ decal & tạo đối tượng File PDF đính kèm xuống form
  useEffect(() => {
    const pending = pendingQrBatchRef.current
    if (!pending || isEnsuringPoleQrs) return
    if (lastEnsuredBatchId !== pending.batchId) return

    pendingQrBatchRef.current = null
    let isCancelled = false

    const buildAndAttachPdf = async () => {
      try {
        const targetPoles = pending.targetPoles
        if (targetPoles.length === 0) return

        if (pending.mode === 'single') {
          const pole = targetPoles[0]
          const poleId = pole.pole_id || ''
          const poleCode = pole.external_ref || poleId
          const qrItem = activeCodesByPoleId[poleId]
          if (!qrItem?.url) {
            toast.error(`Không tìm thấy đường dẫn mã QR của cột ${poleId}.`)
            return
          }

          const qrDataUrl = await QRCode.toDataURL(qrItem.url, {
            width: 360,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'M',
          })

          const canvas = await renderDecalToCanvas({
            poleCode,
            segmentName: resolvedSegmentName,
            communeName: pole.commune_name || '',
            note: pole.note || '',
            qrDataUrl,
          })

          if (isCancelled) return
          const imgData = canvas.toDataURL('image/png')
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a6',
          })
          const pageWidth = 148
          const pageHeight = 105
          const decalWidthMm = 126
          const decalHeightMm = (canvas.height * decalWidthMm) / canvas.width
          const posX = (pageWidth - decalWidthMm) / 2
          const posY = (pageHeight - decalHeightMm) / 2
          doc.addImage(imgData, 'PNG', posX, posY, decalWidthMm, decalHeightMm, undefined, 'FAST')

          const pdfBlob = doc.output('blob')
          const fileName = `Tem_QR_${poleId}.pdf`
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })
          onAttachQrPdfFile?.(pdfFile)
          toast.success(`Đã tạo & đính kèm file ${fileName} xuống mục gửi cho kỹ sư!`)
        } else {
          // Chế độ gộp nhiều cột vào 1 file PDF A4 (2x4 = 8 tem/trang)
          const decalDataUrls: string[] = []
          for (const pole of targetPoles) {
            const poleId = pole.pole_id || ''
            const poleCode = pole.external_ref || poleId
            const qrItem = activeCodesByPoleId[poleId]
            if (!qrItem?.url) continue

            const qrDataUrl = await QRCode.toDataURL(qrItem.url, {
              width: 400,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
              errorCorrectionLevel: 'M',
            })

            const canvas = await renderDecalToCanvas({
              poleCode,
              segmentName: resolvedSegmentName,
              communeName: pole.commune_name || '',
              note: pole.note || '',
              qrDataUrl,
            })
            decalDataUrls.push(canvas.toDataURL('image/png'))
          }

          if (isCancelled) return
          if (decalDataUrls.length === 0) {
            toast.error('Không thể tạo tem QR cho các cột đã chọn.')
            return
          }

          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          })
          const cols = 2
          const rows = 4
          const itemsPerPage = cols * rows
          const cardWidth = 92
          const cardHeight = (cardWidth * 600) / 1050
          const marginX = 9
          const marginY = 12
          const gapX = 8
          const gapY = 8

          decalDataUrls.forEach((dataUrl, index) => {
            const indexOnPage = index % itemsPerPage
            const col = indexOnPage % cols
            const row = Math.floor(indexOnPage / cols)
            if (index > 0 && indexOnPage === 0) {
              doc.addPage()
            }
            const x = marginX + col * (cardWidth + gapX)
            const y = marginY + row * (cardHeight + gapY)
            doc.addImage(dataUrl, 'PNG', x, y, cardWidth, cardHeight, undefined, 'FAST')
          })

          const pdfBlob = doc.output('blob')
          const fileName =
            decalDataUrls.length === 1 && targetPoles[0]?.pole_id
              ? `Tem_QR_${targetPoles[0].pole_id}.pdf`
              : `Danh_Sach_Tem_QR_${decalDataUrls.length}_Cot_${segmentId || 'Tuyen'}.pdf`
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })
          onAttachQrPdfFile?.(pdfFile)
          toast.success(
            `Đã tạo & đính kèm file ${fileName} (${decalDataUrls.length} cột) xuống mục gửi cho kỹ sư!`
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
        toast.error(`Không thể tạo file PDF mã QR (${msg})`)
      } finally {
        if (!isCancelled) {
          setGeneratingKey(null)
        }
      }
    }

    buildAndAttachPdf()
    return () => {
      isCancelled = true
    }
  }, [
    isEnsuringPoleQrs,
    lastEnsuredBatchId,
    activeCodesByPoleId,
    resolvedSegmentName,
    segmentId,
    onAttachQrPdfFile,
  ])

  // Nếu quá trình gọi API gặp lỗi thì mở khóa trạng thái nút ngay lập tức
  useEffect(() => {
    if (!isEnsuringPoleQrs && pendingQrBatchRef.current && lastEnsuredBatchId !== pendingQrBatchRef.current.batchId) {
      pendingQrBatchRef.current = null
      setGeneratingKey(null)
    }
  }, [isEnsuringPoleQrs, lastEnsuredBatchId])

  const handleGeneratePoleQrPdf = (e: React.MouseEvent, pole: PoleListItem) => {
    e.stopPropagation()
    const poleId = pole.pole_id
    if (!poleId || !onAttachQrPdfFile) return

    // Tự động tích chọn cột nếu cột chưa được tích
    if (!selectedPoleIds.includes(poleId)) {
      if (selectedPoleIds.length >= MAX_POLES_PER_ORDER) {
        toast.warning(`Mỗi phiếu cập nhật vị trí cột chỉ được chọn tối đa ${MAX_POLES_PER_ORDER} cột.`)
        return
      }
      onChange([...selectedPoleIds, poleId])
    }

    const batchId = `single-${poleId}-${Date.now()}`
    setGeneratingKey(poleId)
    pendingQrBatchRef.current = {
      batchId,
      targetPoles: [pole],
      mode: 'single',
    }
    dispatch(ensurePoleQrCodesRequest({ batchId, poleIds: [poleId] }))
  }

  const handleGenerateBulkSelectedQrPdf = () => {
    if (selectedPoleIds.length === 0 || !onAttachQrPdfFile) return
    const selectedPoleItems = sortedSegmentPoles.filter(
      (p) => p.pole_id && selectedPoleIds.includes(p.pole_id)
    )
    if (selectedPoleItems.length === 0) return

    const batchId = `bulk-${Date.now()}`
    setGeneratingKey('__BULK__')
    pendingQrBatchRef.current = {
      batchId,
      targetPoles: selectedPoleItems,
      mode: selectedPoleItems.length === 1 ? 'single' : 'bulk',
    }
    dispatch(
      ensurePoleQrCodesRequest({
        batchId,
        poleIds: selectedPoleItems.map((p) => p.pole_id as string),
      })
    )
  }

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-violet-50/40 border border-violet-200/90 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <MapPin className="w-4 h-4 text-violet-600 shrink-0" />
          <label className="text-xs font-black text-slate-900">
            Cột đèn trên tuyến (*):
          </label>
          <span className="text-[11px] font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full">
            {sortedSegmentPoles.length === 0
              ? '0 cột'
              : `Đã chọn ${selectedPoleIds.length} / ${sortedSegmentPoles.length} cột`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onAttachQrPdfFile && selectedPoleIds.length > 0 && (
            <button
              type="button"
              disabled={Boolean(generatingKey) || isEnsuringPoleQrs}
              onClick={handleGenerateBulkSelectedQrPdf}
              className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
              title="Tự động lấy mã QR của các cột đã chọn, xuất thành file PDF và đính kèm thẳng xuống mục File PDF gửi cho kỹ sư"
            >
              {generatingKey === '__BULK__' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo PDF QR...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5" />
                  <span>In QR gộp ({selectedPoleIds.length} cột) → PDF</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="px-2.5 py-1 text-[11px] font-bold text-violet-700 bg-white hover:bg-violet-100/70 border border-violet-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
          >
            <span>{isDropdownOpen ? 'Thu gọn danh sách' : 'Mở danh sách cột'}</span>
            {isDropdownOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Tự động ưu tiên đưa <strong>các cột chưa có GPS</strong> lên đầu danh sách. Có thể chọn 1 hoặc nhiều cột.
      </p>

      {/* Trạng thái Loading */}
      {(isLoadingAssets || isLoadingBusyPoles) && (
        <div className="py-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
          <span>Đang tải danh sách cột đèn theo tuyến...</span>
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {!isLoadingAssets && !isLoadingBusyPoles && loadAssetsError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadAssetsError}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchAssetsRequest())}
            className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold text-[11px] hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái Rỗng */}
      {!isLoadingAssets && !isLoadingBusyPoles && !loadAssetsError && sortedSegmentPoles.length === 0 && (
        <div className="py-4 px-3 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
          {totalSegmentPoleCount > 0
            ? 'Tất cả cột đèn trên tuyến này hiện đã nằm trong các phiếu cập nhật vị trí cột khác đang mở.'
            : 'Tuyến đường này hiện chưa có cột đèn nào được ghi nhận trong hệ thống.'}
        </div>
      )}

      {/* Dropdown chọn cột có thanh tìm kiếm */}
      {!isLoadingAssets && !isLoadingBusyPoles && !loadAssetsError && sortedSegmentPoles.length > 0 && isDropdownOpen && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          {/* Thanh tìm kiếm & Thao tác nhanh */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo mã cột..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1.5">
              {noGpsPoleIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSelectAllNoGps}
                  className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 rounded-lg transition cursor-pointer"
                >
                  + Chọn tất cả chưa có GPS ({noGpsPoleIds.length})
                </button>
              ) : (
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Tất cả cột trên tuyến đã có GPS
                </span>
              )}

              {filteredPoles.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllFiltered}
                  className="px-2.5 py-1 text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredPoles.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Danh sách cột đã sort */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredPoles.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Không tìm thấy cột nào khớp với "{searchTerm}".
              </div>
            ) : (
              filteredPoles.map((pole) => {
                const poleId = pole.pole_id as string
                const isSelected = selectedPoleIds.includes(poleId)
                const hasGps = hasPoleGps(pole)
                const isThisGenerating = generatingKey === poleId
                const isAlreadyAttached = attachedFileNames.includes(`Tem_QR_${poleId}.pdf`)

                return (
                  <div
                    key={poleId}
                    onClick={() => handleTogglePole(poleId)}
                    className={`px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer transition select-none ${
                      isSelected ? 'bg-violet-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {poleId}
                          </span>
                          {pole.external_ref && (
                            <span className="font-mono text-[10px] font-semibold text-slate-500">
                              ({pole.external_ref})
                            </span>
                          )}
                          {!hasGps ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              Chưa có GPS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              {pole.location.lat?.toFixed(5)}, {pole.location.lng?.toFixed(5)}
                            </span>
                          )}
                        </div>
                        {pole.note && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {pole.note}
                          </div>
                        )}
                      </div>
                    </div>

                    {onAttachQrPdfFile && (
                      <button
                        type="button"
                        disabled={Boolean(generatingKey) || isEnsuringPoleQrs}
                        onClick={(e) => handleGeneratePoleQrPdf(e, pole)}
                        title={`Tạo file PDF mã QR cho cột ${poleId} và đính kèm thẳng xuống ô File PDF gửi cho kỹ sư`}
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                          isAlreadyAttached
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-white text-violet-700 border-violet-200 hover:bg-violet-100/80 hover:border-violet-300 shadow-2xs'
                        }`}
                      >
                        {isThisGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-violet-600" />
                            <span>Đang tạo...</span>
                          </>
                        ) : isAlreadyAttached ? (
                          <>
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            <span>Đã đính kèm QR</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3 h-3 text-violet-600" />
                            <span>In QR</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Danh sách chip các cột đã chọn */}
      {selectedPoleIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {selectedPoleIds.map((pid) => (
            <span
              key={pid}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-600 text-white font-mono text-[11px] font-bold"
            >
              <span>{pid}</span>
              <button
                type="button"
                onClick={() => handleTogglePole(pid)}
                className="hover:text-violet-200 cursor-pointer"
                aria-label={`Bỏ chọn cột ${pid}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default GpsPoleSelector

