import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '../../redux/rootReducer'
import { ensurePoleQrCodesRequest } from '../../feature/qr-code/qrCodeSlice'
import { buildPoleQrLabelsPdf } from '../../utils/work-schedule/poleQrLabelsPdf'
import type { PoleListItem } from '../../types/assets/poles'

interface PendingLabels {
  batchId: string
  poles: PoleListItem[]
  segmentId: string
  segmentName: string
  resolve: (file: File | null) => void
}

/**
 * Tạo file PDF tem QR cho các cột: Saga đảm bảo mỗi cột có mã QR đang hiệu lực, sau đó vẽ tem thành PDF.
 * `generate` trả về null khi thất bại (đã báo lỗi bằng toast).
 */
export function usePoleQrLabelsPdf() {
  const dispatch = useDispatch()
  const { activeCodesByPoleId, isEnsuringPoleQrs, lastEnsuredBatchId } = useSelector(
    (state: RootState) => state.qrCode
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const pendingRef = useRef<PendingLabels | null>(null)

  useEffect(() => {
    const pending = pendingRef.current
    if (!pending || isEnsuringPoleQrs) return
    pendingRef.current = null

    // Saga lỗi thì không cập nhật lastEnsuredBatchId và đã tự báo toast
    if (lastEnsuredBatchId !== pending.batchId) {
      setIsGenerating(false)
      pending.resolve(null)
      return
    }

    buildPoleQrLabelsPdf({
      poles: pending.poles,
      codesByPoleId: activeCodesByPoleId,
      segmentId: pending.segmentId,
      segmentName: pending.segmentName,
    })
      .then(pending.resolve)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
        toast.error(`Không thể tạo file PDF tem QR (${msg})`)
        pending.resolve(null)
      })
      .finally(() => setIsGenerating(false))
  }, [isEnsuringPoleQrs, lastEnsuredBatchId, activeCodesByPoleId])

  const generate = useCallback(
    (input: Omit<PendingLabels, 'batchId' | 'resolve'>) =>
      new Promise<File | null>((resolve) => {
        if (pendingRef.current || input.poles.length === 0) {
          resolve(null)
          return
        }
        const batchId = `qr-labels-${Date.now()}`
        pendingRef.current = { ...input, batchId, resolve }
        setIsGenerating(true)
        dispatch(
          ensurePoleQrCodesRequest({
            batchId,
            poleIds: input.poles.map((p) => p.pole_id as string),
          })
        )
      }),
    [dispatch]
  )

  return { generate, isGenerating }
}
