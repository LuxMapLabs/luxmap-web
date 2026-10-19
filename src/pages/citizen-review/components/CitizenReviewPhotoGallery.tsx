import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Maximize2,
  X,
  Camera,
  Sun,
  Moon,
  HelpCircle,
  Loader2,
  ImageOff,
} from 'lucide-react'
import type { CitizenPhotoItem } from '../../../types/citizen-reports/citizen-reports'
import type { CitizenPhotoHint } from '../../../types/common/enums'
import { citizenReportsAPI } from '../../../feature/citizen-reports/citizenReportsAPI'

export interface CitizenReviewPhotoGalleryProps {
  reportId: string
  photos: CitizenPhotoItem[]
}

/**
 * Hiển thị Badge Gợi ý AI (AI Hint) kèm độ tin cậy
 */
const renderAiHintBadge = (label?: CitizenPhotoHint, confidence?: number) => {
  const percent = typeof confidence === 'number' ? Math.round(confidence * 100) : null

  switch (label) {
    case 'lamp_on':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold shadow-xs backdrop-blur-xs"
          title={`Mô hình AI nhận định đèn đang bật sáng (${percent !== null ? `${percent}%` : ''})`}
        >
          <Sun className="w-3 h-3" />
          <span>AI: Đèn Bật {percent !== null ? `(${percent}%)` : ''}</span>
        </span>
      )
    case 'lamp_off':
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/90 text-white text-[10px] font-bold shadow-xs backdrop-blur-xs"
          title={`Mô hình AI nhận định đèn bị tắt tối (${percent !== null ? `${percent}%` : ''})`}
        >
          <Moon className="w-3 h-3" />
          <span>AI: Đèn Tắt {percent !== null ? `(${percent}%)` : ''}</span>
        </span>
      )
    case 'inconclusive':
    default:
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/80 text-white text-[10px] font-medium shadow-xs backdrop-blur-xs"
          title="Mô hình AI chưa thể kết luận hoặc ảnh chụp ban ngày"
        >
          <HelpCircle className="w-3 h-3" />
          <span>AI: Chưa rõ / Ban ngày</span>
        </span>
      )
  }
}

/**
 * Component con hiển thị Thumbnail ảnh được tải an toàn qua Blob kèm Access Token
 */
interface PhotoThumbnailItemProps {
  reportId: string
  photo: CitizenPhotoItem
  index: number
  onClick: () => void
}

const PhotoThumbnailItem: React.FC<PhotoThumbnailItemProps> = ({
  reportId,
  photo,
  index,
  onClick,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const photoId = photo.photo_id || `idx-${index}`

  useEffect(() => {
    let isCancelled = false
    let currentUrl: string | null = null

    const loadThumbnail = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        const url = await citizenReportsAPI.fetchPhotoBlob(reportId, photoId, false)
        if (!isCancelled) {
          currentUrl = url
          setBlobUrl(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch {
        if (!isCancelled) {
          setHasError(true)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadThumbnail()

    return () => {
      isCancelled = true
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [reportId, photoId])

  return (
    <div
      onClick={onClick}
      className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 cursor-pointer shadow-xs transition hover:ring-2 hover:ring-blue-500"
    >
      {isLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mb-1" />
          <span className="text-[10px]">Đang tải ảnh...</span>
        </div>
      ) : hasError || !blobUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 p-2 text-center">
          <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[10px]">Không thể tải ảnh</span>
        </div>
      ) : (
        <img
          src={blobUrl}
          alt={`Ảnh hiện trường ${index + 1}`}
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
        />
      )}

      {/* Nhãn AI Hint đặt tại góc trên bên trái */}
      {photo.ai_hint && (
        <div className="absolute top-1.5 left-1.5 pointer-events-none">
          {renderAiHintBadge(photo.ai_hint.label, photo.ai_hint.confidence)}
        </div>
      )}

      {/* Nút phóng to hiển thị khi hover */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
        <div className="p-1.5 rounded-full bg-black/60 text-white">
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

export const CitizenReviewPhotoGallery: React.FC<CitizenReviewPhotoGalleryProps> = ({
  reportId,
  photos,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CitizenPhotoItem | null>(null)
  const [lightboxBlobUrl, setLightboxBlobUrl] = useState<string | null>(null)
  const [isLightboxLoading, setIsLightboxLoading] = useState(false)
  const [lightboxError, setLightboxError] = useState(false)

  // Tải ảnh gốc độ nét cao khi mở modal phóng to Lightbox
  useEffect(() => {
    if (!selectedPhoto) {
      setLightboxBlobUrl(null)
      return
    }

    let isCancelled = false
    let currentUrl: string | null = null
    const photoId = selectedPhoto.photo_id || 'orig'

    const loadOriginal = async () => {
      try {
        setIsLightboxLoading(true)
        setLightboxError(false)
        const url = await citizenReportsAPI.fetchPhotoBlob(reportId, photoId, true)
        if (!isCancelled) {
          currentUrl = url
          setLightboxBlobUrl(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch {
        if (!isCancelled) {
          setLightboxError(true)
        }
      } finally {
        if (!isCancelled) {
          setIsLightboxLoading(false)
        }
      }
    }

    loadOriginal()

    return () => {
      isCancelled = true
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [reportId, selectedPhoto])

  if (!photos || photos.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
        <Camera className="w-5 h-5 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
        <span>Không có hình ảnh hiện trường đính kèm.</span>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Ảnh hiện trường ({photos.length})</span>
        </div>
        <div className="flex items-center gap-1 text-[10.5px] text-slate-400 italic">
          <Sparkles className="w-3 h-3 text-purple-500" />
          <span>Kèm phân tích AI Hint</span>
        </div>
      </div>

      {/* Grid Thumbnail các ảnh (tải an toàn qua blob) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {photos.map((photo, idx) => (
          <PhotoThumbnailItem
            key={photo.photo_id || idx}
            reportId={reportId}
            photo={photo}
            index={idx}
            onClick={() => setSelectedPhoto(photo)}
          />
        ))}
      </div>

      {/* Lightbox phóng to ảnh gốc (Original View) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header lightbox */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-white text-xs">
              <div className="flex items-center gap-2">
                <span>Ảnh hiện trường chi tiết</span>
                {selectedPhoto.ai_hint &&
                  renderAiHintBadge(
                    selectedPhoto.ai_hint.label,
                    selectedPhoto.ai_hint.confidence
                  )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vùng xem ảnh lớn */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-black min-h-[300px]">
              {isLightboxLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-xs">Đang tải ảnh chất lượng gốc...</span>
                </div>
              ) : lightboxError || !lightboxBlobUrl ? (
                <div className="flex flex-col items-center justify-center gap-2 text-rose-400">
                  <ImageOff className="w-8 h-8" />
                  <span className="text-xs">Không thể tải ảnh gốc từ máy chủ.</span>
                </div>
              ) : (
                <img
                  src={lightboxBlobUrl}
                  alt="Ảnh hiện trường gốc"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
