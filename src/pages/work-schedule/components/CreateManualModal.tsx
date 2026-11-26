import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  X,
  Calendar,
  MapPin,
  User,
  FileText,
  Cpu,
  Wrench,
  Download,
  Eye,
  QrCode,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../../redux/rootReducer'
import { fetchAssetsRequest } from '../../../feature/assets/assetSlice'
import type { TaskKind } from '../../../types/common/enums'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'
import { PoleSelector } from './PoleSelector'
import { FaultSelector } from './FaultSelector'
import { GpsPoleSelector } from './GpsPoleSelector'
import { IotFaultSelector } from './IotFaultSelector'
import { extractSegmentId } from '../../../utils/work-schedule/poleUtils'
import { OpsSelect } from '../../../components/ops/OpsSelect'
import { LateNightScheduleWarning } from './LateNightScheduleWarning'
import { iotAnomalyLabel } from '../../../constants/iot'
import { usePoleQrLabelsPdf } from '../../../hooks/work-schedule/usePoleQrLabelsPdf'
import { phaseOptionIcon } from '../../../constants/workSchedule'

interface IotWorkOrderTarget {
  cabinetId?: string | null
  nodeId?: string | null
  feederId?: string | null
  faultId?: string | null
  anomalyCode?: string | null
}

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
  initialIotTarget?: IotWorkOrderTarget
  onClose: () => void
  onSubmit: (payload: {
    title: string
    segment: string
    initPhase: TaskKind
    assigneeId: string
    assigneeName: string
    date: string
    notes?: string
    materialsNote?: string
    poleIds?: string[]
    faultIds?: string[]
    qrPdfRawFiles?: File[]
  }) => void
}

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Tải file về máy tính
const downloadFile = (file: File) => {
  const blobUrl = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
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
  initialIotTarget,
  onClose,
  onSubmit,
}) => {
  const dispatch = useDispatch()
  const {
    poles: storePoles,
    segments: storeSegments,
    cabinets: storeCabinets,
    isLoadingAssets,
    loadAssetsError,
  } = useSelector((state: RootState) => state.assets)
  const segmentNames = useSelector((state: RootState) => state.workSchedule.segmentNames)

  const [initPhase, setInitPhase] = useState<TaskKind>(initialPhase || 'survey')
  const [targetMode, setTargetMode] = useState<'segment' | 'iot_cabinet'>('segment')
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>('__ALL__')
  const [title, setTitle] = useState(initialTitle || '')
  const [segment, setSegment] = useState('')
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>(initialPoleIds || [])
  const [selectedFaultIds, setSelectedFaultIds] = useState<string[]>(initialFaultIds || [])
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || '')
  const [date, setDate] = useState(defaultDate || getTodayStr())
  const [notes, setNotes] = useState(initialNotes || '')
  const [materialsNote, setMaterialsNote] = useState('')

  const isPrefillAppliedRef = React.useRef(false)
  const prevSegmentRef = React.useRef(segment)
  const prevPhaseRef = React.useRef(initPhase)
  // PDF tem QR đã tạo cho đúng bộ cột đang chọn: bản xem trước cũng là bản được đính kèm khi tạo sự vụ
  const qrPdfCacheRef = React.useRef<{ key: string; file: File } | null>(null)
  const { generate: generateQrLabelsPdf, isGenerating: isGeneratingQrPdf } = usePoleQrLabelsPdf()

  const segmentsList = useMemo(() => {
    if (storeSegments.length > 0) {
      return storeSegments
        .filter((s) => Boolean(s.segment_id))
        .map((s) => `${s.segment_name || s.segment_id} (${s.segment_id})`)
    }
    const entries = Object.entries(segmentNames || {})
    if (entries.length > 0) {
      return entries.map(([id, name]) => `${name || id} (${id})`)
    }
    return []
  }, [storeSegments, segmentNames])

  // Tải danh sách tuyến đường & cột từ Redux Saga khi mở modal
  useEffect(() => {
    if (isOpen && storeSegments.length === 0 && !isLoadingAssets) {
      dispatch(fetchAssetsRequest())
    }
  }, [isOpen, storeSegments.length, isLoadingAssets, dispatch])

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

  // Đồng bộ ngày và dữ liệu prefill (hoặc reset form sạch) khi mở modal
  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayStr()
      const effectiveDate = defaultDate && defaultDate >= todayStr ? defaultDate : todayStr
      setDate(effectiveDate)
      setInitPhase(initialPhase || 'survey')
      setTargetMode('segment')
      setSelectedCabinetId('__ALL__')
      setTitle(initialTitle || '')
      setNotes(initialNotes || '')
      setMaterialsNote('')
      setSelectedPoleIds(initialPoleIds && initialPoleIds.length > 0 ? initialPoleIds : [])
      setSelectedFaultIds(initialFaultIds && initialFaultIds.length > 0 ? initialFaultIds : [])
      qrPdfCacheRef.current = null
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
      prevSegmentRef.current = segment
      prevPhaseRef.current = initPhase
    }
  }, [segment, initPhase])

  // PDF tem QR luôn suy ra từ các cột đang chọn; chỉ tạo lại khi bộ cột hoặc tuyến thay đổi
  const getQrLabelsPdf = async (): Promise<File | null> => {
    const segmentId = extractSegmentId(segment)
    const key = `${segmentId}|${[...selectedPoleIds].sort().join(',')}`
    if (qrPdfCacheRef.current?.key === key) return qrPdfCacheRef.current.file

    const file = await generateQrLabelsPdf({
      poles: storePoles.filter((p) => p.pole_id && selectedPoleIds.includes(p.pole_id)),
      segmentId,
      segmentName: segment.split(' (')[0],
    })
    if (file) qrPdfCacheRef.current = { key, file }
    return file
  }

  // Mở tab trống ngay khi bấm (còn trong thao tác người dùng nên không bị chặn popup), tạo PDF xong mới nạp vào
  const handlePreviewQrPdf = async () => {
    const win = window.open('', '_blank')
    if (win) win.opener = null
    const file = await getQrLabelsPdf()
    if (!file) {
      win?.close()
      return
    }
    if (!win) {
      downloadFile(file)
      return
    }
    const blobUrl = URL.createObjectURL(file)
    win.location.href = blobUrl
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  }

  const handleDownloadQrPdf = async () => {
    const file = await getQrLabelsPdf()
    if (file) downloadFile(file)
  }

  // Điều kiện vô hiệu hóa nút "+ Tạo sự vụ":
  // - Sửa chữa: Bắt buộc phải chọn ít nhất 01 sự cố
  // - Kiểm tra: Bắt buộc phải chọn ít nhất 01 cột có sự cố
  // - Cập nhật vị trí cột: Bắt buộc chọn tuyến và ít nhất 01 cột (tem QR tự tạo khi bấm Tạo sự vụ)
  // - Khảo sát: Cho phép tạo bình thường vì đi rà quét tìm lỗi mới trên toàn tuyến
  const isPrefilledIotTarget = Boolean(
    initialIotTarget && selectedFaultIds.length > 0 && selectedPoleIds.length === 0
  )
  const isManualIotMode =
    !isPrefilledIotTarget &&
    targetMode === 'iot_cabinet' &&
    (initPhase === 'inspection' || initPhase === 'repair')
  const isIotCabinetFault = isPrefilledIotTarget || isManualIotMode

  const isSubmitDisabled =
    isGeneratingQrPdf ||
    (!isIotCabinetFault && !segment) ||
    (isManualIotMode && selectedFaultIds.length === 0) ||
    (initPhase === 'repair' && selectedFaultIds.length === 0) ||
    (initPhase === 'inspection' && !isIotCabinetFault && selectedPoleIds.length === 0) ||
    (initPhase === 'pole_gps_update' && selectedPoleIds.length === 0)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (initPhase === 'inspection' && isManualIotMode && selectedFaultIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 01 sự cố IoT cần kiểm tra!')
      return
    }

    if (initPhase === 'inspection' && !isIotCabinetFault && selectedPoleIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 01 cột có sự cố cần kiểm tra trên tuyến này!')
      return
    }

    let qrLabelsPdf: File | null = null
    if (initPhase === 'pole_gps_update') {
      if (selectedPoleIds.length === 0) {
        toast.warning('Vui lòng chọn ít nhất 01 cột cần cập nhật vị trí GPS!')
        return
      }
      qrLabelsPdf = await getQrLabelsPdf()
      if (!qrLabelsPdf) return
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
      if (isIotCabinetFault) {
        const iotTargetText = isPrefilledIotTarget
          ? [initialIotTarget?.nodeId, initialIotTarget?.cabinetId].filter(Boolean).join(' • ')
          : selectedCabinetId && selectedCabinetId !== '__ALL__'
            ? `Tủ ${selectedCabinetId}`
            : ''
        if (!effectiveTitle) {
          effectiveTitle = iotTargetText
            ? `Kiểm tra thiết bị IoT ${iotTargetText}`
            : 'Kiểm tra thiết bị IoT'
        }
      } else {
        if (!effectiveTitle) {
          effectiveTitle = `Kiểm tra cột ${selectedPoleIds.join(', ')} - ${segmentShortName}`
        }
        if (selectedPoleIds.length > 0) {
          const poleNote = `[Chỉ định kiểm tra trọng tâm]: ${selectedPoleIds.join(', ')}`
          effectiveNotes = effectiveNotes ? `${effectiveNotes}\n${poleNote}` : poleNote
        }
      }
    } else if (initPhase === 'repair') {
      if (!effectiveTitle) {
        if (isIotCabinetFault) {
          const iotTargetText = [initialIotTarget?.nodeId, initialIotTarget?.cabinetId]
            .filter(Boolean)
            .join(' • ')
          effectiveTitle = iotTargetText
            ? `Sửa chữa thiết bị IoT ${iotTargetText}`
            : 'Sửa chữa thiết bị IoT'
        } else {
          effectiveTitle = `Sửa chữa sự cố trên ${segmentShortName}`
        }
      }
    } else {
      if (!effectiveTitle) {
        effectiveTitle = `Khảo sát đêm tuyến ${segmentShortName}`
      }
    }

    onSubmit({
      title: effectiveTitle,
      segment: isIotCabinetFault ? '' : segment,
      initPhase,
      assigneeId,
      assigneeName,
      date,
      notes: effectiveNotes,
      materialsNote: initPhase === 'repair' && materialsNote.trim() ? materialsNote.trim() : undefined,
      poleIds: isIotCabinetFault ? [] : selectedPoleIds,
      faultIds: selectedFaultIds,
      qrPdfRawFiles: qrLabelsPdf ? [qrLabelsPdf] : undefined,
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
                icon={phaseOptionIcon(initPhase).icon}
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
                    label: 'Khảo sát',
                    nativeLabel: 'Khảo sát (Bước 1)',
                    subLabel: 'Rà quét camera AI & đo kiểm toàn tuyến ban đêm',
                    badge: 'Bước 1',
                    ...phaseOptionIcon('survey'),
                  },
                  {
                    value: 'inspection',
                    label: 'Kiểm tra',
                    nativeLabel: 'Kiểm tra (Bước 2)',
                    subLabel: 'Kiểm tra xác minh thực địa các cột có sự cố',
                    badge: 'Bước 2',
                    ...phaseOptionIcon('inspection'),
                  },
                  {
                    value: 'repair',
                    label: 'Sửa chữa',
                    nativeLabel: 'Sửa chữa (Bước 3)',
                    subLabel: 'Khắc phục & thay thế thiết bị cho sự cố đã xác nhận',
                    badge: 'Bước 3',
                    ...phaseOptionIcon('repair'),
                  },
                  {
                    value: 'pole_gps_update',
                    label: 'Cập nhật vị trí cột',
                    nativeLabel: 'Cập nhật vị trí cột (Độc lập)',
                    subLabel: 'Dán tem QR & thu thập tọa độ GPS cột',
                    badge: 'Độc lập',
                    ...phaseOptionIcon('pole_gps_update'),
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

            {/* Bộ chuyển đối tượng xử lý cho Kiểm tra / Sửa chữa: Theo Tuyến hoặc Theo Tủ IoT */}
            {!isPrefilledIotTarget && (initPhase === 'inspection' || initPhase === 'repair') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Đối tượng xử lý:</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode('segment')
                      setSelectedFaultIds([])
                      setSelectedPoleIds([])
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      targetMode === 'segment'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    Theo Tuyến đường &amp; Cột
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode('iot_cabinet')
                      setSelectedFaultIds([])
                      setSelectedPoleIds([])
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      targetMode === 'iot_cabinet'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    Theo Tủ điện IoT
                  </button>
                </div>
              </div>
            )}

            {/* Đối tượng kiểm tra IoT (Tủ điện / Node) hoặc Tuyến đường + Cột */}
            {isPrefilledIotTarget && (initPhase === 'inspection' || initPhase === 'repair') ? (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Vị trí Tủ điện & Thiết bị IoT cần xử lý
                  </span>
                  {initialIotTarget?.faultId && (
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                      {selectedFaultIds.length > 1
                        ? `${selectedFaultIds.length} sự cố (${selectedFaultIds.join(', ')})`
                        : initialIotTarget.faultId}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block">Tủ điện (Cabinet)</span>
                    <strong className="font-mono text-slate-800">{initialIotTarget?.cabinetId || '-'}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block">Node IoT</span>
                    <strong className="font-mono text-slate-800">{initialIotTarget?.nodeId || '-'}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block">Mạch (Feeder)</span>
                    <strong className="font-mono text-slate-800">{initialIotTarget?.feederId || '-'}</strong>
                  </div>
                </div>
                {initialIotTarget?.anomalyCode && (
                  <p className="text-[11px] text-indigo-800">
                    Lỗi ghi nhận: <strong>{iotAnomalyLabel(initialIotTarget.anomalyCode)}</strong>
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Lệnh công tác sẽ gửi trực tiếp tọa độ GPS của Tủ điện và ghi chú thiết bị xuống app kỹ sư.
                </p>
              </div>
            ) : isManualIotMode ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    Tủ điện IoT:
                  </label>
                  <OpsSelect
                    value={selectedCabinetId}
                    onChange={(val) => {
                      setSelectedCabinetId(val)
                      setSelectedFaultIds([])
                    }}
                    icon={<Cpu className="w-3.5 h-3.5" />}
                    headerLabel="Danh sách tủ điện"
                    headerBadge={`${storeCabinets.length} tủ`}
                    ariaLabel="Tủ điện IoT"
                    className="w-full"
                    triggerClassName="w-full min-h-[42px] px-3 py-2"
                    popoverClassName="w-full"
                    showTriggerBadge={false}
                    options={[
                      {
                        value: '__ALL__',
                        label: 'Tất cả tủ có sự cố IoT',
                        nativeLabel: 'Tất cả tủ có sự cố IoT',
                        dotColor: 'bg-indigo-500',
                      },
                      ...storeCabinets
                        .filter((c) => Boolean(c.cabinet_id))
                        .map((c) => {
                          const id = c.cabinet_id as string
                          const label = c.cabinet_name ? `${c.cabinet_name} (${id})` : id
                          return {
                            value: id,
                            label,
                            nativeLabel: label,
                            dotColor: 'bg-indigo-500',
                          }
                        }),
                    ]}
                  />
                </div>
                <IotFaultSelector
                  cabinetId={selectedCabinetId}
                  taskKind={initPhase === 'repair' ? 'repair' : 'inspection'}
                  selectedFaultIds={selectedFaultIds}
                  onChange={setSelectedFaultIds}
                />
              </div>
            ) : (
              <>
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
                        ? [
                            {
                              value: '',
                              label: isLoadingAssets
                                ? 'Đang tải danh sách tuyến...'
                                : loadAssetsError
                                  ? 'Không tải được danh sách tuyến'
                                  : 'Chưa có tuyến đường trong địa bàn',
                            },
                          ]
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
              </>
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
              <LateNightScheduleWarning
                selectedDate={date}
                onSwitchToTomorrow={(tomorrow) => setDate(tomorrow)}
              />
            </div>

            {/* Tem QR gửi kỹ sư (riêng cho Cập nhật vị trí cột): tự tạo từ các cột đã chọn, đính kèm khi bấm Tạo sự vụ */}
            {initPhase === 'pole_gps_update' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-violet-600" />
                  Tem QR gửi kỹ sư:
                </label>
                <div className="px-3 py-2.5 rounded-xl bg-violet-50/40 border border-violet-200 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">
                      {selectedPoleIds.length > 0
                        ? `Tem QR · ${selectedPoleIds.length} cột`
                        : 'Chưa chọn cột nào'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isGeneratingQrPdf
                        ? 'Đang tạo file PDF tem QR...'
                        : 'Tự tạo từ các cột đã chọn và đính kèm vào phiếu khi bấm Tạo sự vụ'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handlePreviewQrPdf}
                      disabled={selectedPoleIds.length === 0 || isGeneratingQrPdf}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingQrPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>Xem trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQrPdf}
                      disabled={selectedPoleIds.length === 0 || isGeneratingQrPdf}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ghi chú vật tư & thiết bị mang theo (dành cho giai đoạn Sửa chữa) */}
            {initPhase === 'repair' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  Ghi chú thiết bị &amp; vật tư mang theo (Quản lý chỉ định):
                </label>
                <textarea
                  rows={2}
                  value={materialsNote}
                  onChange={(e) => setMaterialsNote(e.target.value)}
                  placeholder="Ví dụ: 02 bóng LED 100W, 01 aptomat 16A..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
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
              {isGeneratingQrPdf ? 'Đang tạo tem QR...' : '+ Tạo sự vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
