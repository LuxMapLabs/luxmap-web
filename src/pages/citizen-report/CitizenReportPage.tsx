import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  lookupPublicQrRequest,
  submitReportRequest,
  resetReportState,
} from '../../feature/citizen-report/citizenReportSlice'
import { PoleInfoCard } from './components/PoleInfoCard'
import { ReportSuccessModal } from './components/ReportSuccessModal'
import { VIETNAM_PHONE_REGEX } from '../../validations/common.schema'
import {
  getCitizenDraft,
  saveCitizenDraft,
  deleteCitizenDraft,
} from '../../utils/indexedDbDraft'
import { convertToJpeg } from '../../utils/imageUtils'
import type { CitizenReportKind } from '../../types/common/enums'
import {
  LightbulbOff,
  AlertTriangle,
  ZapOff,
  Camera,
  Plus,
  X,
  Send,
  Loader2,
  Info,
  Phone,
  User,
  Shield,
  Ban,
} from 'lucide-react'

interface FaultOptionItem {
  id: CitizenReportKind
  kind: CitizenReportKind
  title: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
}

// Các danh mục hiện trạng sự cố chiếu sáng (phù hợp với kind của Backend)
const FAULT_OPTIONS: readonly FaultOptionItem[] = [
  {
    id: 'lamp_out',
    kind: 'lamp_out',
    title: 'Đèn tắt hoàn toàn / Mất chiếu sáng',
    desc: 'Bóng đèn tắt hẳn vào ban đêm, chập chờn hoặc cháy hỏng chấn lưu',
    icon: LightbulbOff,
  },
  {
    id: 'lamp_dim',
    kind: 'lamp_dim',
    title: 'Đèn sáng yếu / Chập chờn',
    desc: 'Ánh sáng mờ suy giảm độ rọi, nhấp nháy liên tục không đủ quan sát',
    icon: ZapOff,
  },
  {
    id: 'pole_damaged',
    kind: 'pole_damaged',
    title: 'Cột đèn nghiêng / Nguy cơ gãy đổ',
    desc: 'Móng cột bị lún nứt, thân cột bị va quẹt hoặc nghiêng ngả nguy hiểm',
    icon: AlertTriangle,
  },
  {
    id: 'other',
    kind: 'other',
    title: 'Hở dây điện / Sự cố nguy hiểm khác',
    desc: 'Ưu tiên khẩn cấp: Rò rỉ điện, đứt dây hoặc chạm chập có nguy cơ tai nạn',
    icon: AlertTriangle,
  },
] as const

export const CitizenReportPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const routeParams = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()

  // Lấy mã tem QR 16 ký tự từ đường dẫn chuẩn /r/:code hoặc query param ?code=
  const qrCode = (routeParams.code || searchParams.get('code') || '').trim()

  // Trạng thái từ Redux Store
  const {
    currentPole,
    isValidCode,
    isLookingUp,
    isSubmitting,
    submissionResult,
    lookupError,
    submitError,
  } = useSelector((state: RootState) => state.citizenReport)

  // Form local state
  const [selectedOptionId, setSelectedOptionId] = useState<CitizenReportKind>('lamp_out')
  const [description, setDescription] = useState<string>('')
  const [reporterName, setReporterName] = useState<string>('')
  const [reporterPhone, setReporterPhone] = useState<string>('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<
    Array<{ id: string; file: File; url: string }>
  >([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPendingSubmit, setIsPendingSubmit] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 1. Khởi chạy tra cứu mã QR từ Backend ngay khi tải trang
  useEffect(() => {
    dispatch(lookupPublicQrRequest(qrCode))
  }, [dispatch, qrCode])

  // 2. Khôi phục bản nháp (Draft Cache từ IndexedDB) theo mã tem QR
  useEffect(() => {
    if (!qrCode) return
    let isCancelled = false

    const loadDraft = async () => {
      const draft = await getCitizenDraft(qrCode)
      if (!draft || isCancelled) return

      if (draft.selectedOptionId) {
        const found = FAULT_OPTIONS.find((opt) => opt.id === draft.selectedOptionId)
        if (found) {
          setSelectedOptionId(found.id)
        }
      }
      if (typeof draft.description === 'string') setDescription(draft.description)
      if (typeof draft.reporterName === 'string') setReporterName(draft.reporterName)
      if (typeof draft.reporterPhone === 'string') setReporterPhone(draft.reporterPhone)

      // Khôi phục danh sách tệp ảnh gốc từ IndexedDB
      if (Array.isArray(draft.mediaFiles) && draft.mediaFiles.length > 0) {
        setMediaFiles(draft.mediaFiles)
        const previews = draft.mediaFiles.map((file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          url: URL.createObjectURL(file),
        }))
        setMediaPreviews(previews)
      }
    }

    loadDraft()

    return () => {
      isCancelled = true
    }
  }, [qrCode])

  // 3. Tự động lưu hoặc xóa bản nháp trong IndexedDB khi người dân sửa đổi dữ liệu
  useEffect(() => {
    if (!qrCode) return

    const hasData =
      Boolean(description.trim()) ||
      Boolean(reporterName.trim()) ||
      Boolean(reporterPhone.trim()) ||
      selectedOptionId !== 'lamp_out' ||
      mediaFiles.length > 0

    const timeoutId = setTimeout(() => {
      if (hasData) {
        saveCitizenDraft({
          pole_code: qrCode,
          selectedOptionId,
          selectedFaultType: 'lamp_out',
          selectedSeverity: 'medium',
          description,
          reporterName,
          reporterPhone,
          mediaFiles,
          saved_at: Date.now(),
        })
      } else {
        deleteCitizenDraft(qrCode)
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [qrCode, selectedOptionId, description, reporterName, reporterPhone, mediaFiles])

  const handleClearAllMedia = () => {
    mediaPreviews.forEach((item) => URL.revokeObjectURL(item.url))
    setMediaFiles([])
    setMediaPreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Reset toàn bộ các trường trong form về trạng thái ban đầu
  const resetFormFields = () => {
    setDescription('')
    setReporterName('')
    setReporterPhone('')
    setSelectedOptionId('lamp_out')
    setFormError(null)
    handleClearAllMedia()
  }

  // 4. Xóa bản nháp khỏi IndexedDB và reset trắng form khi gửi phản ánh thành công
  useEffect(() => {
    if (submissionResult && qrCode) {
      deleteCitizenDraft(qrCode)
      resetFormFields()
    }
  }, [submissionResult, qrCode])

  // Xử lý chọn ảnh (tối đa 3 ảnh, tự động chuyển đổi sang chuẩn JPEG qua Canvas)
  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    if (mediaFiles.length + selected.length > 3) {
      setFormError('Bạn chỉ có thể đính kèm tối đa 3 hình ảnh hiện trường.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const newFiles: File[] = []
    const newPreviews: Array<{ id: string; file: File; url: string }> = []

    for (const file of selected) {
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|bmp)$/i.test(file.name)

      if (!isImage) {
        setFormError(`Tệp "${file.name}" không phải là ảnh. Vui lòng chỉ chọn hình ảnh (JPG, PNG...).`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      try {
        // Tự động convert sang chuẩn JPEG có magic bytes FF D8 FF
        const jpegFile = await convertToJpeg(file)

        if (jpegFile.size > 10 * 1024 * 1024) {
          setFormError(`Hình ảnh "${file.name}" sau khi xử lý vượt quá dung lượng tối đa 10MB.`)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }

        newFiles.push(jpegFile)
        newPreviews.push({
          id: `${jpegFile.name}-${jpegFile.lastModified}-${Math.random()}`,
          file: jpegFile,
          url: URL.createObjectURL(jpegFile),
        })
      } catch {
        setFormError(`Không thể đọc hoặc chuyển đổi định dạng ảnh "${file.name}".`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    setMediaFiles((prev) => [...prev, ...newFiles])
    setMediaPreviews((prev) => [...prev, ...newPreviews])
    setFormError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    const item = mediaPreviews[index]
    if (item) {
      URL.revokeObjectURL(item.url)
    }
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
    setFormError(null)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d+]/g, '')
    if (val.length <= 11) {
      setReporterPhone(val)
      if (formError) setFormError(null)
    }
  }

  // Xử lý nộp phản ánh sự cố lên Backend
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!navigator.onLine) {
      setFormError('Không có kết nối mạng. Vui lòng kiểm tra lại Wifi/4G trên điện thoại và thử gửi lại.')
      return
    }

    // Nếu mã QR không hợp lệ hoặc đang tra cứu, chặn gửi
    if (!isValidCode || !currentPole) {
      setFormError('Mã QR cột đèn không hợp lệ hoặc đã bị thu hồi. Bạn không thể gửi phản ánh.')
      return
    }

    if (description.trim().length < 5) {
      setFormError('Vui lòng nhập mô tả sự cố cụ thể hơn (tối thiểu 5 ký tự).')
      return
    }

    if (reporterPhone.trim().length > 0) {
      const normalizedPhone = reporterPhone.replace(/^\+84/, '0').trim()
      if (!VIETNAM_PHONE_REGEX.test(normalizedPhone)) {
        setFormError(
          'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (10 chữ số, VD: 0901234567) hoặc để trống.'
        )
        return
      }
    }

    // Ghép thông tin người phản ánh vào phần mô tả nếu có
    let fullDescription = description.trim()
    const contactParts: string[] = []
    if (reporterName.trim()) contactParts.push(`Họ tên: ${reporterName.trim()}`)
    if (reporterPhone.trim()) contactParts.push(`SĐT: ${reporterPhone.trim()}`)
    if (contactParts.length > 0) {
      fullDescription += `\n[Người dân phản ánh: ${contactParts.join(' - ')}]`
    }

    // Đã vượt qua các bước xác thực cơ bản -> Bật trạng thái pending submit ngay lập tức
    setIsPendingSubmit(true)

    const clientOpId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    // Thử lấy vị trí GPS hiện tại của người dân (nếu người dân cấp quyền)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsPendingSubmit(false)
          dispatch(
            submitReportRequest({
              code: qrCode,
              kind: selectedOptionId,
              description: fullDescription,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              photos: mediaFiles,
              client_op_id: clientOpId,
            })
          )
        },
        () => {
          // Người dân từ chối GPS hoặc không hỗ trợ, vẫn nộp bình thường
          setIsPendingSubmit(false)
          dispatch(
            submitReportRequest({
              code: qrCode,
              kind: selectedOptionId,
              description: fullDescription,
              lat: null,
              lng: null,
              photos: mediaFiles,
              client_op_id: clientOpId,
            })
          )
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    } else {
      setIsPendingSubmit(false)
      dispatch(
        submitReportRequest({
          code: qrCode,
          kind: selectedOptionId,
          description: fullDescription,
          lat: null,
          lng: null,
          photos: mediaFiles,
          client_op_id: clientOpId,
        })
      )
    }
  }

  const handleNewReport = () => {
    dispatch(resetReportState())
    resetFormFields()
  }

  // Xác định xem nút Submit có bị vô hiệu hóa không
  const isSubmitDisabled =
    isSubmitting || isPendingSubmit || isLookingUp || !isValidCode || !currentPole

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col items-center p-3 sm:p-6 antialiased">
      {/* Container chuẩn Mobile-First (tối đa 560px để giữ trải nghiệm form tập trung) */}
      <main className="w-full max-w-lg space-y-4 sm:space-y-5">
        {/* Header thương hiệu công ích */}
        <header className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Cổng Tiếp Nhận Phản Ánh Công Cộng</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            Báo Cáo Sự Cố Chiếu Sáng Đèn Đường
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chung tay vì những cung đường an toàn và sáng đẹp
          </p>
        </header>

        {/* 1. Thẻ thông tin vị trí cột đèn: Instant render với Skeleton Loading cục bộ và Cảnh báo lỗi 404 */}
        <PoleInfoCard
          code={qrCode}
          poleInfo={currentPole}
          isLoading={isLookingUp}
          error={lookupError}
        />

        {/* 2. Biểu mẫu gửi phản ánh: Hiển thị tức thì (Instant Render) */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5"
        >
          {/* Lựa chọn hiện trạng sự cố */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              1. Tình trạng sự cố bạn đang nhìn thấy <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAULT_OPTIONS.map((opt) => {
                const IconComponent = opt.icon
                const isSelected = selectedOptionId === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold leading-tight">{opt.title}</div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mô tả chi tiết */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="description" className="font-bold text-slate-800 dark:text-slate-200">
                2. Mô tả chi tiết sự cố <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{description.length}/300</span>
            </div>
            <textarea
              id="description"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Đèn bị tắt từ hôm qua, ngã ba tối gây nguy hiểm cho người đi xe máy..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {/* Đính kèm ảnh chụp hiện trường (Tối đa 3 ảnh, chuẩn JPEG) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                3. Hình ảnh chụp hiện trường (Khuyến khích)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {mediaFiles.length}/3 ảnh
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/*"
              capture="environment"
              multiple
              onChange={handleMediaChange}
              className="hidden"
            />

            {/* Lưới thumbnail xem trước hình ảnh */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {mediaPreviews.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-4/3 flex items-center justify-center group"
                  >
                    <img
                      src={item.url}
                      alt={`Ảnh sự cố ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition shadow-xs cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nút thêm ảnh (tự động ẩn khi đã đủ 3 ảnh) */}
            {mediaFiles.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-center gap-2 transition text-slate-600 dark:text-slate-300 cursor-pointer active:scale-99 ${
                  mediaPreviews.length > 0 ? 'py-2.5 px-3' : 'py-4 px-4 flex-col gap-1.5'
                }`}
              >
                {mediaPreviews.length > 0 ? (
                  <>
                    <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold">Thêm ảnh ({mediaFiles.length}/3)</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">Chụp ảnh hoặc tải ảnh từ máy</span>
                    <span className="text-[10.5px] text-slate-400 text-center">
                      Hỗ trợ tối đa 3 ảnh · Dung lượng tối đa 10MB/ảnh
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Thông tin người phản ánh (Tùy chọn) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Thông tin liên hệ (Không bắt buộc)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Họ và tên của bạn"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Số điện thoại liên hệ"
                  value={reporterPhone}
                  onChange={handlePhoneChange}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
            <p className="text-[10.5px] text-slate-400 italic">
              * Số điện thoại chỉ dùng khi cán bộ kỹ thuật cần xác minh thêm thông tin hiện trường.
            </p>
          </div>

          {/* Cảnh báo lỗi biểu mẫu hoặc lỗi gửi phản ánh từ Backend */}
          {(formError || submitError) && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError || submitError}</span>
            </div>
          )}

          {/* Nút gửi phản ánh (vô hiệu hóa nếu mã QR không hợp lệ hoặc đang tra cứu) */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition shadow-md hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting || isPendingSubmit ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi phản ánh...</span>
              </>
            ) : isLookingUp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kiểm tra mã QR...</span>
              </>
            ) : !isValidCode || !currentPole ? (
              <>
                <Ban className="w-4 h-4" />
                <span>Mã QR không hợp lệ - Không thể gửi</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi Phản Ánh Ngay</span>
              </>
            )}
          </button>
        </form>

        {/* Footer ghi nhận */}
        <footer className="text-center text-[11px] text-slate-400 py-2">
          Hệ thống Quản lý Chiếu sáng Thông minh LuxMap · Đồng hành cùng an toàn giao thông
        </footer>
      </main>

      {/* Modal báo nộp thành công */}
      {submissionResult && (
        <ReportSuccessModal
          receipt={submissionResult}
          code={qrCode}
          onNewReport={handleNewReport}
        />
      )}
    </div>
  )
}
