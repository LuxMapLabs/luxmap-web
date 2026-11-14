import React, { useState, useEffect } from 'react'
import { Loader2, VideoOff } from 'lucide-react'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'

interface PoleVideoPlayerProps {
  workOrderId?: string | null
  photoId?: string | null
  posterUrl?: string
  className?: string
  autoPlay?: boolean
}

/**
 * Component phát video clip cột đèn từ Backend qua Blob URL.
 * Tự động đính kèm Bearer Token qua apiClient và giải phóng Object URL khi unmount.
 */
export const PoleVideoPlayer: React.FC<PoleVideoPlayerProps> = ({
  workOrderId,
  photoId,
  posterUrl,
  className = 'w-full h-full object-contain bg-black',
  autoPlay = false,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(workOrderId && photoId))
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    if (!workOrderId || !photoId) {
      setIsLoading(false)
      setBlobUrl(null)
      setHasError(false)
      return
    }

    let isMounted = true
    let createdUrl: string | null = null

    const loadVideo = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        const url = await workScheduleAPI.fetchPoleVideoBlob(workOrderId, photoId)
        if (isMounted) {
          createdUrl = url
          setBlobUrl(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch {
        if (isMounted) {
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadVideo()

    return () => {
      isMounted = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [workOrderId, photoId])

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-950 text-slate-300 ${className}`}>
        <Loader2 className="w-7 h-7 animate-spin text-blue-400 mb-2" />
        <span className="text-xs font-medium">Đang tải video thực địa...</span>
      </div>
    )
  }

  if (hasError || !blobUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-4 text-center ${className}`}>
        <VideoOff className="w-8 h-8 mb-2 opacity-60" />
        <span className="text-xs font-bold text-slate-300">Không thể tải video từ máy chủ</span>
        <span className="text-[11px] text-slate-500 mt-1">Vui lòng kiểm tra kết nối hoặc thử lại sau.</span>
      </div>
    )
  }

  return (
    <video
      key={blobUrl}
      src={blobUrl}
      poster={posterUrl}
      controls
      playsInline
      autoPlay={autoPlay}
      preload="metadata"
      className={className}
    />
  )
}

