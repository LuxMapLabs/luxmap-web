import { useEffect, useState } from 'react'
import { mapAPI } from '../feature/map/mapAPI'

export interface AuthImageState {
  url: string | null
  isLoading: boolean
  hasError: boolean
}

/**
 * Tải ảnh từ endpoint cần Bearer token thành blob URL để gắn vào thẻ img.
 * Truyền `null` (hoặc enabled=false) thì không tải gì. Blob URL tự thu hồi khi đổi ảnh hoặc unmount.
 */
export const useAuthImage = (path: string | null | undefined, enabled = true): AuthImageState => {
  const [state, setState] = useState<AuthImageState>({ url: null, isLoading: false, hasError: false })

  useEffect(() => {
    if (!path || !enabled) {
      setState({ url: null, isLoading: false, hasError: false })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setState({ url: null, isLoading: true, hasError: false })

    mapAPI
      .fetchPhotoBlob(path)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        setState({ url: objectUrl, isLoading: false, hasError: false })
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, isLoading: false, hasError: true })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, enabled])

  return state
}
