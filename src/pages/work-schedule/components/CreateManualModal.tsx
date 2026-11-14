import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { X, Calendar, MapPin, User, FileText, Layers, Upload, FileCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../../redux/rootReducer'
import { fetchAssetsRequest } from '../../../feature/assets/assetSlice'
import type { TaskKind } from '../../../types/common/enums'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'
import { PoleSelector } from './PoleSelector'
import { FaultSelector } from './FaultSelector'
import { GpsPoleSelector } from './GpsPoleSelector'
import { extractSegmentId } from '../../../utils/work-schedule/poleUtils'
import { OpsSelect } from '../../../components/ops/OpsSelect'

interface CreateManualModalProps {
  isOpen: boolean
  defaultDate?: string
  isDateLocked?: boolean
  assignees: WorkOrderAssignee[]
  initialPhase?: TaskKind
  initialSegmentId?: string
  initialPoleIds?: string[]
  initialFaultIds?: string[]
  initialTitle?: string
  initialNotes?: string
  onClose: () => void
  onSubmit: (payload: {
    title: string
    segment: string
    initPhase: TaskKind
    assigneeId: string
    assigneeName: string
    date: string
    notes?: string
    poleIds?: string[]
    faultIds?: string[]
    qrPdfRawFiles?: File[]
  }) => void
}

interface SelectedPdfFile {
  id: string
  rawFile: File
}

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const CreateManualModal: React.FC<CreateManualModalProps> = ({
  isOpen,
  defaultDate,
  assignees,
  initialPhase,
  initialSegmentId,
  initialPoleIds,
  initialFaultIds,
  initialTitle,
  initialNotes,
  onClose,
  onSubmit,
}) => {
  const dispatch = useDispatch()
  const { segments: storeSegments, isLoadingAssets, loadAssetsError } = useSelector(
    (state: RootState) => state.assets
  )

  const [initPhase, setInitPhase] = useState<TaskKind>(initialPhase || 'survey')
  const [title, setTitle] = useState(initialTitle || '')
  const [segment, setSegment] = useState('')
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>(initialPoleIds || [])
  const [selectedFaultIds, setSelectedFaultIds] = useState<string[]>(initialFaultIds || [])
  const [qrPdfFiles, setQrPdfFiles] = useState<SelectedPdfFile[]>([])
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || '')
  const [date, setDate] = useState(defaultDate || getTodayStr())
  const [notes, setNotes] = useState(initialNotes || '')

  const isPrefillAppliedRef = React.useRef(false)
  const prevSegmentRef = React.useRef(segment)
  const prevPhaseRef = React.useRef(initPhase)

  const segmentsList = useMemo(() => {
    return storeSegments
      .filter((s) => Boolean(s.segment_id))
      .map((s) => `${s.segment_name || s.segment_id} (${s.segment_id})`)
  }, [storeSegments])

  // Tải danh sách tuyến đường & cột từ Redux Saga khi mở modal
  useEffect(() => {
    if (isOpen && storeSegments.length === 0 && !isLoadingAssets && !loadAssetsError) {
      dispatch(fetchAssetsRequest())
    }
  }, [isOpen, storeSegments.length, isLoadingAssets, loadAssetsError, dispatch])

  // Đồng bộ tuyến đường mặc định khi danh sách tuyến đã tải xong
  useEffect(() => {
    if (segmentsList.length === 0) return
    if (initialSegmentId) {
      const found = segmentsList.find((s) => s.includes(initialSegmentId))
      if (found) {
        setSegment(found)
        return
      }
    }
    setSegment((prev) => (prev && segmentsList.includes(prev) ? prev : segmentsList[0]))
  }, [segmentsList, initialSegmentId])

  // Đồng bộ kỹ sư khi danh sách assignees tải xong từ API
  useEffect(() => {
    if (!assigneeId && assignees && assignees.length > 0) {
      setAssigneeId(assignees[0].user_id || '')
    }
  }, [assignees, assigneeId])

  // Đồng bộ ngày và dữ liệu prefill khi mở modal
  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayStr()
      const effectiveDate = defaultDate && defaultDate >= todayStr ? defaultDate : todayStr
      setDate(effectiveDate)

      if (initialPhase) {
        setInitPhase(initialPhase)
      }
      if (initialTitle) {
        setTitle(initialTitle)
      }
      if (initialNotes) {
        setNotes(initialNotes)
      }
      if (initialPoleIds && initialPoleIds.length > 0) {
        setSelectedPoleIds(initialPoleIds)
      }
      if (initialFaultIds && initialFaultIds.length > 0) {
        setSelectedFaultIds(initialFaultIds)
      }
      if (initialSegmentId && segmentsList.length > 0) {
        const found = segmentsList.find((s) => s.includes(initialSegmentId))
        if (found) {
          setSegment(found)
        }
      }
      isPrefillAppliedRef.current = true
    } else {
      isPrefillAppliedRef.current = false
    }
  }, [
    isOpen,
    defaultDate,
    initialPhase,
    initialTitle,
    initialNotes,
    initialPoleIds,
    initialFaultIds,
    initialSegmentId,
    segmentsList,
  ])

  // Reset khi người dùng chủ động đổi tuyến đường hoặc giai đoạn (bỏ qua khi prefill hoặc lần nạp tuyến đầu tiên)
  useEffect(() => {
    if (isPrefillAppliedRef.current) {
      isPrefillAppliedRef.current = false
      prevSegmentRef.current = segment
      prevPhaseRef.current = initPhase
      return
    }
    // Bỏ qua reset nếu tuyến đường vừa được nạp lần đầu sau khi danh sách tuyến tải xong
    if (prevSegmentRef.current === '' && segment !== '' && prevPhaseRef.current === initPhase) {
      prevSegmentRef.current = segment
      return
    }
    if (prevSegmentRef.current !== segment || prevPhaseRef.current !== initPhase) {
      setSelectedPoleIds([])
      setSelectedFaultIds([])
      if (prevPhaseRef.current !== initPhase && initPhase !== 'pole_gps_update') {
        setQrPdfFiles([])
      }
      prevSegmentRef.current = segment
      prevPhaseRef.current = initPhase
    }
  }, [segment, initPhase])

  const handlePdfFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const MAX_FILES = 10
    const MAX_BYTES = 20 * 1024 * 1024

    const validPdfs = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (validPdfs.length < files.length) {
      toast.warning('Chỉ hỗ trợ đính kèm file định dạng PDF (.pdf).')
    }

    const sizeValidPdfs = validPdfs.filter((f) => f.size <= MAX_BYTES)
    if (sizeValidPdfs.length < validPdfs.length) {
      toast.warning('Mỗi file PDF không được vượt quá 20 MiB.')
    }

    const remainingSlots = Math.max(0, MAX_FILES - qrPdfFiles.length)
    if (sizeValidPdfs.length > remainingSlots) {
      toast.warning(`Tối đa ${MAX_FILES} file PDF cho mỗi lệnh cập nhật vị trí cột.`)
    }

    const accepted = sizeValidPdfs.slice(0, remainingSlots)
    const mapped: SelectedPdfFile[] = accepted.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      rawFile: file,
    }))

    setQrPdfFiles((prev) => [...prev, ...mapped])
    e.target.value = ''
  }

  const handleRemovePdfFile = (id: string) => {
    setQrPdfFiles((prev) => prev.filter((item) => item.id !== id))
  }

  // Điều kiện vô hiệu hóa nút "+ Tạo sự vụ":
  // - Sửa chữa: Bắt buộc phải chọn ít nhất 01 sự cố
  // - Kiểm tra: Bắt buộc phải chọn ít nhất 01 cột có sự cố
  // - Cập nhật vị trí cột: Bắt buộc chọn tuyến, ít nhất 01 cột và ít nhất 01 file PDF QR
  // - Khảo sát: Cho phép tạo bình thường vì đi rà quét tìm lỗi mới trên toàn tuyến
  const isSubmitDisabled =
    !segment ||
    (initPhase === 'repair' && selectedFaultIds.length === 0) ||
    (initPhase === 'inspection' && selectedPoleIds.length === 0) ||
    (initPhase === 'pole_gps_update' &&
      (selectedPoleIds.length === 0 || qrPdfFiles.length === 0))

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const todayStr = getTodayStr()
    if (date < todayStr) {
      toast.error(
        `Không thể tạo lịch cho ngày trong quá khứ (${date}). Vui lòng chọn từ ngày hôm nay (${todayStr}) trở đi.`
      )
      return
    }

    if (initPhase === 'repair' && selectedFaultIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 01 sự cố cần sửa chữa trên tuyến này!')
      return
    }

    if (initPhase === 'inspection' && selectedPoleIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 01 cột có sự cố cần kiểm tra trên tuyến này!')
      return
    }

    if (initPhase === 'pole_gps_update') {
      if (selectedPoleIds.length === 0) {
        toast.warning('Vui lòng chọn ít nhất 01 cột cần cập nhật vị trí GPS!')
        return
      }
      if (qrPdfFiles.length === 0) {
        toast.warning('Vui lòng chọn ít nhất 01 file PDF chứa mã QR để gửi cho kỹ sư!')
        return
      }
    }

    const selectedAssignee = assignees.find((a) => a.user_id === assigneeId)
    const assigneeName = selectedAssignee?.full_name ? selectedAssignee.full_name.split(' (')[0] : 'Kỹ sư hiện trường'

    // Xây dựng tiêu đề và ghi chú thông minh
    let effectiveTitle = title.trim()
    let effectiveNotes = notes.trim()
    const segmentShortName = segment.split(' (')[0]

    if (initPhase === 'pole_gps_update') {
      if (!effectiveTitle) {
        effectiveTitle = `Cập nhật vị trí GPS ${selectedPoleIds.length} cột - ${segmentShortName}`
      }
    } else if (initPhase === 'inspection') {
      if (!effectiveTitle) {
        effectiveTitle = `Kiểm tra cột ${selectedPoleIds.join(', ')} - ${segmentShortName}`
      }
      const poleNote = `[Chỉ định kiểm tra trọng tâm]: ${selectedPoleIds.join(', ')}`
      effectiveNotes = effectiveNotes ? `${effectiveNotes}\n${poleNote}` : poleNote
    } else if (initPhase === 'repair') {
      if (!effectiveTitle) {
        effectiveTitle = `Sửa chữa sự cố trên ${segmentShortName}`
      }
    } else {
      if (!effectiveTitle) {
        effectiveTitle = `Khảo sát đêm tuyến ${segmentShortName}`
      }
    }

    onSubmit({
      title: effectiveTitle,
      segment,
      initPhase,
      assigneeId,
      assigneeName,
      date,
      notes: effectiveNotes,
      poleIds: selectedPoleIds,
      faultIds: selectedFaultIds,
      qrPdfRawFiles: initPhase === 'pole_gps_update' ? qrPdfFiles.map((f) => f.rawFile) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              Tạo sự vụ mới
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Phân công nhiệm vụ khảo sát, kiểm tra hoặc sửa chữa
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {/* Giai đoạn khởi đầu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Khởi động tại giai đoạn (*):</label>
              <OpsSelect
                value={initPhase}
                onChange={(val) => setInitPhase(val as TaskKind)}
                icon={<Layers className="w-3.5 h-3.5" />}
                headerLabel="Giai đoạn khởi động"
                headerBadge="4 loại"
                ariaLabel="Khởi động tại giai đoạn"
                className="w-full"
                triggerClassName="w-full min-h-[42px] px-3 py-2"
                popoverClassName="w-full"
                showTriggerBadge={false}
                options={[
                  {
                    value: 'survey',
                    label: '1. Khảo sát',
                    nativeLabel: '🟡 1. Khảo sát',
                    subLabel: 'Rà quét camera AI & đo kiểm toàn tuyến ban đêm',
                    dotColor: 'bg-amber-400',
                  },
                  {
                    value: 'inspection',
                    label: '2. Kiểm tra',
                    nativeLabel: '🔵 2. Kiểm tra',
                    subLabel: 'Kiểm tra xác minh thực địa các cột có sự cố',
                    dotColor: 'bg-blue-500',
                  },
                  {
                    value: 'repair',
                    label: '3. Sửa chữa',
                    nativeLabel: '🟢 3. Sửa chữa',
                    subLabel: 'Khắc phục & thay thế thiết bị cho sự cố đã xác nhận',
                    dotColor: 'bg-emerald-500',
                  },
                  {
                    value: 'pole_gps_update',
                    label: 'Cập nhật vị trí cột',
                    nativeLabel: '🟣 Cập nhật vị trí cột (Độc lập)',
                    subLabel: 'Giai đoạn độc lập: Gửi PDF QR & thu thập tọa độ GPS cột',
                    dotColor: 'bg-violet-500',
                  },
                ]}
              />
              {initPhase === 'pole_gps_update' && (
                <div className="px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-[11px] text-violet-800 font-medium">
                  Giai đoạn này hoạt động <strong>độc lập hoàn toàn</strong>, không liên kết với chuỗi Khảo sát → Kiểm tra → Sửa chữa.
                </div>
              )}
            </div>

            {/* Tiêu đề vụ việc (ẩn khi là Cập nhật vị trí cột để đúng thứ tự Tuyến -> Cột -> Kỹ sư -> Ngày -> File -> Note) */}
            {initPhase !== 'pole_gps_update' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Tiêu đề sự vụ (*):</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Sự cố mất sáng đoạn qua trụ sở UBND xã"
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Tuyến đường */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Tuyến đường (*):
              </label>
              <OpsSelect
                value={segment}
                onChange={(val) => setSegment(val)}
                icon={<MapPin className="w-3.5 h-3.5" />}
                headerLabel="Danh sách tuyến đường"
                headerBadge={`${segmentsList.length} tuyến`}
                ariaLabel="Tuyến đường"
                className="w-full"
                triggerClassName="w-full min-h-[42px] px-3 py-2"
                popoverClassName="w-full"
                showTriggerBadge={false}
                options={
                  segmentsList.length === 0
                    ? [{ value: '', label: 'Đang tải danh sách tuyến...' }]
                    : segmentsList.map((s) => ({
                        value: s,
                        label: s,
                        nativeLabel: s,
                        dotColor: 'bg-teal-500',
                      }))
                }
              />
            </div>

            {/* Cập nhật vị trí cột: Chọn cột trên tuyến (sort chưa có GPS lên đầu + tìm kiếm) */}
            {initPhase === 'pole_gps_update' && (
              <GpsPoleSelector
                segmentId={extractSegmentId(segment)}
                selectedPoleIds={selectedPoleIds}
                onChange={setSelectedPoleIds}
              />
            )}

            {/* 2. Với Kiểm tra: Chọn cột đèn có sự cố trên tuyến */}
            {initPhase === 'inspection' && (
              <PoleSelector
                segmentStr={segment}
                selectedPoleIds={selectedPoleIds}
                onChange={(poleIds, faultIds) => {
                  setSelectedPoleIds(poleIds)
                  if (faultIds) setSelectedFaultIds(faultIds)
                }}
                taskKindName="Kiểm tra"
                allowEmpty={false}
              />
            )}

            {/* 3. Với Sửa chữa: Chọn trực tiếp các sự cố đã xác nhận cần sửa */}
            {initPhase === 'repair' && (
              <FaultSelector
                segmentStr={segment}
                selectedFaultIds={selectedFaultIds}
                onChange={(faultIds) => {
                  setSelectedFaultIds(faultIds)
                }}
              />
            )}

            {/* Kỹ sư phụ trách */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Kỹ sư hiện trường phụ trách (*):
              </label>
              <OpsSelect
                value={assigneeId}
                onChange={(val) => setAssigneeId(val)}
                icon={<User className="w-3.5 h-3.5" />}
                headerLabel="Kỹ sư hiện trường"
                headerBadge={`${assignees.length} kỹ sư`}
                ariaLabel="Kỹ sư hiện trường phụ trách"
                className="w-full"
                triggerClassName="w-full min-h-[42px] px-3 py-2"
                popoverClassName="w-full"
                showTriggerBadge={false}
                options={
                  assignees.length === 0
                    ? [{ value: '', label: 'Chưa có kỹ sư thuộc địa bàn này' }]
                    : assignees.map((a) => ({
                        value: a.user_id || '',
                        label: a.full_name || a.user_id || '',
                        nativeLabel: a.full_name || a.user_id || '',
                        dotColor: 'bg-blue-500',
                      }))
                }
              />
            </div>

            {/* Ngày thực hiện - Không khóa, luôn cho phép chọn trực tiếp */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Ngày bắt đầu (*):
              </label>
              <input
                type="date"
                required
                min={getTodayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2.5 rounded-xl text-xs font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* File PDF chứa mã QR gửi xuống cho kỹ sư (riêng cho Cập nhật vị trí cột) */}
            {initPhase === 'pole_gps_update' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-violet-600" />
                  File PDF chứa mã QR của cột gửi cho kỹ sư (*):
                </label>

                <label className="border-2 border-dashed border-violet-300 hover:border-violet-500 bg-violet-50/40 hover:bg-violet-50/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800">
                    Bấm để chọn file PDF mã QR của cột
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hỗ trợ chọn 1 hoặc nhiều file .pdf
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handlePdfFilesChange}
                    className="hidden"
                  />
                </label>

                {qrPdfFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {qrPdfFiles.map((file) => (
                      <div
                        key={file.id}
                        className="px-3 py-2 rounded-xl bg-white border border-violet-200 flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCheck className="w-4 h-4 text-violet-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">{file.rawFile.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({formatFileSize(file.rawFile.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePdfFile(file.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ghi chú */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Ghi chú:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Yêu cầu kiểm tra an toàn hoặc phạm vi công tác..."
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons - Cố định ở đáy modal */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                isSubmitDisabled
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-98'
              }`}
            >
              + Tạo sự vụ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
