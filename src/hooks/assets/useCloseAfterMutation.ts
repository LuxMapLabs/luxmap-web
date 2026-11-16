import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'

type Phase = 'idle' | 'sent' | 'running'

/**
 * Form tài sản chờ lưu xong mới đóng: gọi `markSent()` ngay sau khi dispatch yêu cầu lưu.
 * Reducer bật `isMutating` đồng bộ lúc dispatch, saga tắt nó bằng `mutationSuccess` / `mutationFailure`.
 * Thành công thì đóng form; lỗi thì giữ form (saga đã báo lỗi) để sửa và lưu lại.
 * Nếu dispatch không xảy ra (`isMutating` không bật), form mở lại bình thường thay vì quay mãi.
 */
export function useCloseAfterMutation(onClose: () => void) {
  const isMutating = useSelector((state: RootState) => state.assets.isMutating)
  const mutationError = useSelector((state: RootState) => state.assets.mutationError)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (phase === 'sent') {
      setPhase(isMutating ? 'running' : 'idle')
    } else if (phase === 'running' && !isMutating) {
      setPhase('idle')
      if (!mutationError) onClose()
    }
  }, [phase, isMutating, mutationError, onClose])

  return { isSaving: phase !== 'idle', markSent: () => setPhase('sent') }
}
