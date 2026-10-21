import React, { useState, useEffect } from 'react'
import { Loader2, ImageOff } from 'lucide-react'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'

interface EvidenceImageProps {
  evidenceId?: string | null
  fallbackSrc?: string
  alt: string
  className?: string
  preferOriginal?: boolean
  onClick?: () => void
  onLoaded?: (blobUrl: string) => void
}

/**
 * Component hiển thị hình ảnh bằng chứng nghiệm thu từ Backend qua Blob URL
 * Tự động đính kèm Bearer Token để vượt qua [Authorize(Policy = ReadWorkOrders)]
 * Tự động giải phóng (revoke) URL khi component unmount để tránh rò rỉ bộ nhớ.
 */
export const EvidenceImage: React.FC<EvidenceImageProps> = ({
  evidenceId,
  fallbackSrc,
  alt,
  className = 'w-full h-full object-cover',
  preferOriginal = false,
  onClick,
  onLoaded,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(evidenceId))
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    if (!evidenceId) {
      setIsLoading(false)
      setBlobUrl(null)
      return
    }

    let isMounted = true
    let createdUrl: string | null = null

    const loadPhoto = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        const url = await workScheduleAPI.fetchEvidenceBlob(evidenceId, preferOriginal)
        if (isMounted) {
          createdUrl = url
          setBlobUrl(url)
          onLoaded?.(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPhoto()

    return () => {
      isMounted = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [evidenceId, preferOriginal])

  // Trường hợp tải qua API có evidenceId
  if (evidenceId) {
    if (isLoading) {
      return (
        <div className={`flex flex-col items-center justify-center bg-slate-900/40 text-slate-400 animate-pulse ${className}`}>
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mb-1" />
          <span className="text-[10px] font-medium">Đang tải ảnh...</span>
        </div>
      )
    }

    if (hasError || !blobUrl) {
      if (fallbackSrc) {
        return (
          <img
            src={fallbackSrc}
            alt={alt}
            className={className}
            onClick={onClick}
          />
        )
      }
      return (
        <div className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 p-2 text-center ${className}`}>
          <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[10px]">Không thể tải ảnh</span>
        </div>
      )
    }

    return (
      <img
        src={blobUrl}
        alt={alt}
        className={className}
        onClick={onClick}
      />
    )
  }

  // Trường hợp ảnh tĩnh fallback thông thường
  if (fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        onClick={onClick}
      />
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
      <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
      <span className="text-[10px]">Chưa có hình ảnh</span>
    </div>
  )
}
export default EvidenceImage
