import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  verifyTokenRequest,
  submitReportRequest,
  resetReportState,
} from '../../feature/citizen-report/citizenReportSlice'
import { PoleInfoCard } from './components/PoleInfoCard'
import { InvalidQrAlert } from './components/InvalidQrAlert'
import { ReportSuccessModal } from './components/ReportSuccessModal'
import type { FaultType, Severity } from '../../types/common/enums'
import type { CitizenReportPayload } from '../../feature/citizen-report/citizenReportAPI'
import { VIETNAM_PHONE_REGEX } from '../../validations/common.schema'
import {
  getCitizenDraft,
  saveCitizenDraft,
  deleteCitizenDraft,
} from '../../utils/indexedDbDraft'
import {
  LightbulbOff,
  AlertTriangle,
  ZapOff,
  Camera,
  Film,
  Plus,
  X,
  Send,
  Loader2,
  Info,
  Phone,
  User,
  Shield,
} from 'lucide-react'

// Các danh mục hiện trạng sự cố chiếu sáng (phù hợp với FaultType của hệ thống)
const FAULT_OPTIONS: Array<{
  id: string
  type: FaultType
  title: string
  desc: string
  defaultSeverity: Severity
  icon: React.ElementType
}> = [
  {
    id: 'electric_leak',
    type: 'node_offline',
    title: 'Hở dây điện / Rò rỉ điện nguy hiểm',
    desc: 'Ưu tiên khẩn cấp: Rò rỉ điện, đứt dây hoặc chạm chập có nguy cơ tai nạn',
    defaultSeverity: 'critical',
    icon: AlertTriangle,
  },
  {
    id: 'pole_tilt',
    type: 'node_offline',
    title: 'Cột đèn nghiêng / Nguy cơ gãy đổ',
    desc: 'Móng cột bị lún nứt, thân cột bị va quẹt hoặc nghiêng ngả nguy hiểm',
    defaultSeverity: 'high',
    icon: AlertTriangle,
  },
  {
    id: 'lamp_out',
    type: 'lamp_out',
    title: 'Đèn tắt hoàn toàn / Mất chiếu sáng',
    desc: 'Bóng đèn tắt hẳn vào ban đêm, chập chờn hoặc cháy hỏng chấn lưu',
    defaultSeverity: 'medium',
    icon: LightbulbOff,
  },
  {
    id: 'lamp_dim',
    type: 'lamp_dim',
    title: 'Đèn sáng yếu / Chập chờn',
    desc: 'Ánh sáng mờ suy giảm độ rọi, nhấp nháy liên tục không đủ quan sát',
    defaultSeverity: 'low',
    icon: ZapOff,
  },
]

export const CitizenReportPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const [searchParams] = useSearchParams()
  const routeParams = useParams<{ token?: string }>()

  // Lấy mã từ query params (?lux=...) theo chuẩn thương hiệu LuxMap
  const luxParam = searchParams.get('lux') || searchParams.get('token') || routeParams.token || ''

  // Trạng thái từ Redux Store
  const {
    currentPole,
    isValidToken,
    isVerifyingToken,
    isSubmitting,
    submissionResult,
    error: verificationError,
  } = useSelector((state: RootState) => state.citizenReport)

  // Form local state
  const [selectedOptionId, setSelectedOptionId] = useState<string>('electric_leak')
  const [selectedFaultType, setSelectedFaultType] = useState<FaultType>('node_offline')
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>('critical')
  const [description, setDescription] = useState<string>('')
  const [reporterName, setReporterName] = useState<string>('')
  const [reporterPhone, setReporterPhone] = useState<string>('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<
    Array<{ id: string; file: File; url: string; isVideo: boolean }>
  >([])
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Khởi chạy xác thực mã QR (?lux=) khi tải trang
  useEffect(() => {
    // Nếu có tham số lux trên URL, gửi request xác thực
    // Nếu không có tham số lux, verifyTokenRequest('') sẽ kích hoạt Strict Guard báo lỗi ngay lập tức
    dispatch(verifyTokenRequest(luxParam))
  }, [dispatch, luxParam])

  // Khôi phục bản nháp (Draft Cache từ IndexedDB) theo mã cột đèn nếu còn hạn TTL
  useEffect(() => {
    if (!currentPole?.pole_code) return
    let isCancelled = false

    const loadDraft = async () => {
      const draft = await getCitizenDraft(currentPole.pole_code)
      if (!draft || isCancelled) return

      if (draft.selectedOptionId) {
        const found = FAULT_OPTIONS.find((opt) => opt.id === draft.selectedOptionId)
        if (found) {
          setSelectedOptionId(found.id)
          setSelectedFaultType(found.type)
          setSelectedSeverity(found.defaultSeverity)
        }
      }
      if (typeof draft.description === 'string') setDescription(draft.description)
      if (typeof draft.reporterName === 'string') setReporterName(draft.reporterName)
      if (typeof draft.reporterPhone === 'string') setReporterPhone(draft.reporterPhone)

      // Khôi phục danh sách tệp ảnh/video gốc từ IndexedDB
      if (Array.isArray(draft.mediaFiles) && draft.mediaFiles.length > 0) {
        setMediaFiles(draft.mediaFiles)
        const previews = draft.mediaFiles.map((file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          url: URL.createObjectURL(file),
          isVideo: file.type.startsWith('video/'),
        }))
        setMediaPreviews(previews)
      }
    }

    loadDraft()

    return () => {
      isCancelled = true
    }
  }, [currentPole])

  // Tự động lưu hoặc xóa bản nháp trong IndexedDB khi người dân sửa đổi dữ liệu
  useEffect(() => {
    if (!currentPole?.pole_code) return

    // Kiểm tra xem form có còn dữ liệu nào không
    const hasData =
      Boolean(description.trim()) ||
      Boolean(reporterName.trim()) ||
      Boolean(reporterPhone.trim()) ||
      selectedOptionId !== 'electric_leak' ||
      mediaFiles.length > 0

    const timeoutId = setTimeout(() => {
      if (hasData) {
        // Cập nhật bản nháp mới nhất (bao gồm cả trường hợp description vừa bị xóa trắng)
        saveCitizenDraft({
          pole_code: currentPole.pole_code,
          selectedOptionId,
          selectedFaultType,
          selectedSeverity,
          description,
          reporterName,
          reporterPhone,
          mediaFiles,
          saved_at: Date.now(),
        })
      } else {
        // Nếu người dùng đã xóa trắng toàn bộ dữ liệu, xóa sạch bản nháp khỏi IndexedDB
        deleteCitizenDraft(currentPole.pole_code)
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [
    currentPole,
    selectedOptionId,
    selectedFaultType,
    selectedSeverity,
    description,
    reporterName,
    reporterPhone,
    mediaFiles,
  ])

  // Xóa bản nháp khỏi IndexedDB khi gửi phản ánh thành công
  useEffect(() => {
    if (submissionResult && currentPole?.pole_code) {
      deleteCitizenDraft(currentPole.pole_code)
    }
  }, [submissionResult, currentPole])

  // Cập nhật tình trạng sự cố và tự động khớp mức độ nghiêm trọng tương ứng
  const handleSelectFault = (opt: (typeof FAULT_OPTIONS)[number]) => {
    setSelectedOptionId(opt.id)
    setSelectedFaultType(opt.type)
    setSelectedSeverity(opt.defaultSeverity)
  }

  // Xử lý chọn ảnh / video (tối đa 3 tệp, video <= 20MB, ảnh <= 10MB)
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    if (mediaFiles.length + selected.length > 3) {
      setFormError('Bạn chỉ có thể đính kèm tối đa 3 hình ảnh hoặc video ngắn.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const newFiles: File[] = []
    const newPreviews: Array<{ id: string; file: File; url: string; isVideo: boolean }> = []

    for (const file of selected) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        setFormError('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG, WEBP) hoặc video (MP4, MOV).')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (isVideo && file.size > 20 * 1024 * 1024) {
        setFormError(`Video "${file.name}" vượt quá dung lượng tối đa 20MB. Vui lòng chọn video ngắn hơn.`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (isImage && file.size > 10 * 1024 * 1024) {
        setFormError(`Hình ảnh "${file.name}" vượt quá dung lượng tối đa 10MB.`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      newFiles.push(file)
      newPreviews.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isVideo,
      })
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

  const handleClearAllMedia = () => {
    mediaPreviews.forEach((item) => URL.revokeObjectURL(item.url))
    setMediaFiles([])
    setMediaPreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Xử lý nhập số điện thoại: chỉ cho phép nhập số (và dấu + ở đầu nếu có), tối đa 11 ký tự
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d+]/g, '')
    if (val.length <= 11) {
      setReporterPhone(val)
      if (formError) setFormError(null)
    }
  }

  // Xử lý nộp phản ánh
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Kiểm tra kết nối mạng trực tiếp trước khi gửi
    if (!navigator.onLine) {
      setFormError('Không có kết nối mạng. Vui lòng kiểm tra lại Wifi/4G trên điện thoại và thử gửi lại.')
      return
    }

    if (!currentPole) {
      setFormError('Không tìm thấy thông tin cột đèn để gửi phản ánh.')
      return
    }

    if (description.trim().length < 10) {
      setFormError('Vui lòng nhập mô tả sự cố cụ thể hơn (tối thiểu 10 ký tự).')
      return
    }

    // Kiểm tra định dạng số điện thoại nếu người dùng có nhập
    if (reporterPhone.trim().length > 0) {
      const normalizedPhone = reporterPhone.replace(/^\+84/, '0').trim()
      if (!VIETNAM_PHONE_REGEX.test(normalizedPhone)) {
        setFormError(
          'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (10 chữ số, VD: 0901234567) hoặc để trống.'
        )
        return
      }
    }

    const payload: CitizenReportPayload = {
      qr_token: luxParam,
      pole_code: currentPole.pole_code,
      fault_type: selectedFaultType,
      severity: selectedSeverity,
      description: description.trim(),
      media_files: mediaFiles.length > 0 ? mediaFiles : undefined,
      photo_file: mediaFiles.length > 0 ? mediaFiles[0] : null,
      reporter_name: reporterName.trim() || undefined,
      reporter_phone: reporterPhone.trim() || undefined,
    }

    dispatch(submitReportRequest(payload))
  }

  const handleNewReport = () => {
    dispatch(resetReportState())
    setDescription('')
    handleClearAllMedia()
  }

  // Màn hình đang kiểm tra mã QR
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Đang xác thực thông tin cột đèn qua mã QR...
          </p>
        </div>
      </div>
    )
  }

  // Màn hình mã QR không hợp lệ
  if (!isValidToken || !currentPole) {
    return <InvalidQrAlert errorMessage={verificationError} />
  }

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

        {/* 1. Thẻ thông tin cột đèn (Read-Only / Disabled) */}
        <PoleInfoCard poleInfo={currentPole} />

        {/* 2. Biểu mẫu gửi phản ánh */}
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
                    onClick={() => handleSelectFault(opt)}
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

          {/* Đính kèm ảnh / video chụp hiện trường (Tối đa 3 tệp) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                3. Hình ảnh / Video chụp hiện trường (Khuyến khích)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {mediaFiles.length}/3 tệp
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="hidden"
            />

            {/* Lưới thumbnail xem trước hình ảnh & video */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {mediaPreviews.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-4/3 flex items-center justify-center group"
                  >
                    {item.isVideo ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                          <div className="p-2 rounded-full bg-black/60 text-white shadow-xs">
                            <Film className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-bold text-white uppercase tracking-wider">
                          Video
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={`Ảnh sự cố ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition shadow-xs cursor-pointer"
                      title="Xóa tệp này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nút thêm ảnh / video (tự động ẩn khi đã đủ 3 tệp) */}
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
                    <span className="text-xs font-semibold">Thêm ảnh / video ({mediaFiles.length}/3)</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">Chụp ảnh / quay video hoặc tải từ máy</span>
                    <span className="text-[10.5px] text-slate-400 text-center">
                      Hỗ trợ tối đa 3 tệp · Ảnh tối đa 10MB, Video tối đa 20MB
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

          {/* Cảnh báo lỗi biểu mẫu */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nút gửi phản ánh */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs sm:text-sm transition shadow-md hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi phản ánh...</span>
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
        <ReportSuccessModal result={submissionResult} onNewReport={handleNewReport} />
      )}
    </div>
  )
}
