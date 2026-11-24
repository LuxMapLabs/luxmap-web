import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  AlertTriangle,
  Zap,
  X,
  Info,
  Radio,
  Wrench,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldCheck,
  CameraOff,
  Sun,
  Moon,
  Clock,
  History,
  Unplug,
  ChevronRight,
  Pencil,
  PlugZap,
} from 'lucide-react'

import type { SegmentInfo, PoleFeature } from '../GisMapPage'
import cabinetSvg from '../../../assets/icons/cabinet.svg'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../../redux/store'
import { fetchPoleDetailRequest, clearPoleDetail } from '../../../feature/map/mapSlice'
import {
  FeederHistoryModal,
  type FeederHistoryTab,
} from '../../../components/FeederHistoryModal'
import {
  sendCommandRequest,
  resetCommandSend,
  fetchAutoPrefillRequest,
  clearAutoPrefill,
  selectCommandSend,
  selectAutoPrefill,
} from '../../../feature/iot/iotMonitorSlice'
import { autoBody, commandBody, type IotAutoType } from '../../../utils/iot/iotCommand'
import { toast } from 'sonner'
import type { FaultType, Severity, FaultStatus, FeederControlMode } from '../../../types/common/enums'
import type { PoleMapOpenFault } from '../../../types/map/poles'
import { FeederCommandDialog, type FeederCommandTarget } from './FeederCommandDialog'
import { useFeederCommandModes } from '../../../hooks/iot/useFeederCommandModes'
import { FeederElectricalSummary } from './FeederElectricalSummary'
import { segmentDisplayCode } from '../../../utils/gis-map/gisSearchUtils'
import { formatDate } from '../../../utils/dateUtils'
import { isManager } from '../../../utils/roleUtils'
import {
  retireFixtureRequest,
  createFixtureRequest,
  updateFixtureRequest,
  updatePoleRequest,
} from '../../../feature/assets/assetSlice'
import { AddFixtureModal } from '../../assets/components/fixtures/components/AddFixtureModal'
import { EditPoleModal } from '../../assets/components/poles/components/EditPoleModal'
import { poleUpdateRequest } from '../../../utils/assets/poleUpdateRequest'
import {
  RetireFixtureModal,
  type RetirableFixture,
} from '../../assets/components/fixtures/components/RetireFixtureModal'
import { useAuthImage } from '../../../hooks/useAuthImage'
import { POLE_LAMP_UI, poleFeatureLampState, poleLampState } from '../../../utils/gis-map/poleLampState'
import {
  IOT_GATEWAY_STATUS,
  IOT_NODE_STATUS,
  IOT_TONE_COLOR,
  iotStatusBadge,
  type IotTone,
} from '../../../constants/iot'
import { useCabinetIotStatus } from '../../../hooks/iot/useCabinetIotStatus'

const IOT_TONE_ORDER: Record<IotTone, number> = {
  bad: 0,
  warn: 1,
  ok: 2,
  muted: 3,
}

/** Nhãn ngắn cho dòng mạch trong khung tủ (chỗ hẹp); nhãn đầy đủ vẫn ở title. */
const NODE_STATUS_SHORT: Record<string, string> = {
  online: 'online',
  offline: 'mất tín hiệu',
  no_data: 'chưa có số',
  source_unavailable: 'lỗi nguồn đo',
  unconfigured: 'chưa gán nguồn',
}

// Nhãn trạng thái cột: fixture_status + power_state của mạch (poleLampState)
const poleStatusBadge = (p?: { fixture_status?: string | null; power_state?: string | null } | null) => {
  const ui = POLE_LAMP_UI[poleFeatureLampState(p)]
  return { label: ui.label, short: ui.short, className: `border ${ui.badge}` }
}

// Trạng thái cấp điện của mạch theo power_state do API trả về
const feederPowerLabel = (state?: string | null) =>
  state === 'on' ? 'Đang cấp điện' : state === 'off' ? 'Mạch đang tắt' : 'Chưa rõ'
const feederPowerBadge = (state?: string | null) =>
  state === 'on'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
    : state === 'off'
    ? 'bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600'
    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'

const fixtureTypeLabel = (type?: string | null) => (type === 'led_road_lamp' ? 'Đèn LED đường phố' : type || '-')

export interface GisDrawerPanelProps {
  selectedPole: PoleFeature | null
  setSelectedPole: (p: PoleFeature | null) => void
  setSelectedSegmentId: (s: string | null) => void
  activeSegmentDetail: SegmentInfo
  handleSelectPole: (f: PoleFeature) => void
  selectedCabinet?: any
  setSelectedCabinet?: (c: any) => void
  selectedFeeder?: any
  setSelectedFeeder?: (f: any) => void
  cabinets?: any[]
  effectivePoles?: PoleFeature[]
  /** Bắt đầu dời vị trí cột đang chọn trên bản đồ (Quản lý). */
  /** Quản lý: bật chế độ lấy hình tuyến theo đường trên bản đồ nền cho tuyến đang mở. */
}

const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  lamp_out: 'Đèn tắt hoàn toàn',
  lamp_dim: 'Đèn mờ / Sụt quang thông',
  segment_outage: 'Mất điện toàn tuyến',
  node_offline: 'Cảm biến IoT mất tín hiệu',
  runtime_decline: 'Suy giảm thời gian chiếu sáng',
  voltage_anomaly: 'Bất thường điện áp',
  current_anomaly: 'Bất thường dòng điện',
  iot_hardware_fault: 'Lỗi phần cứng IoT',
}

const SEVERITY_BADGES: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: 'Khẩn cấp',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  high: {
    label: 'Cao',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  medium: {
    label: 'Trung bình',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  low: {
    label: 'Thấp',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
}

const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  detected: 'Mới phát hiện',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang sửa chữa',
  resolved: 'Đã khắc phục',
  verified: 'Đã nghiệm thu',
  rejected: 'Đã từ chối',
}

export const GisDrawerPanel: React.FC<GisDrawerPanelProps> = ({
  selectedPole,
  setSelectedPole,
  setSelectedSegmentId,
  activeSegmentDetail,
  handleSelectPole,
  selectedCabinet,
  setSelectedCabinet,
  selectedFeeder,
  setSelectedFeeder,
  effectivePoles: propsEffectivePoles = [],
}) => {
  // Khung cột / mạch điện → khung tuyến của nó. Bấm đường tuyến trên
  // bản đồ thường trúng dây mạch nằm chồng lên, nên đây là lối mở khung tuyến chắc chắn.
  const openSegmentPanel = () => {
    if (!activeSegmentDetail.id) return
    setSelectedPole(null)
    setSelectedCabinet?.(null)
    setSelectedFeeder?.(null)
    setSelectedSegmentId(activeSegmentDetail.id)
  }
  const segmentLink = (label: React.ReactNode) =>
    activeSegmentDetail.id ? (
      <button
        type="button"
        onClick={openSegmentPanel}
        title="Mở khung tuyến"
        className="inline-flex items-center gap-0.5 font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
      >
        {label}
        <ChevronRight className="w-3 h-3" />
      </button>
    ) : (
      <strong className="text-slate-900 dark:text-white">{label}</strong>
    )

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string
    title: string
  } | null>(null)
  // Ảnh gốc của ảnh tài sản chỉ được tải khi người dùng mở lightbox
  const [wantsAssetOriginal, setWantsAssetOriginal] = useState(false)
  // Ảnh dọc hiện nguyên khung (object-contain) để không bị cắt mất bóng đèn ở đầu cột
  const [isPortraitPhoto, setIsPortraitPhoto] = useState(false)

  // Maintenance Status
  const poleId = selectedPole?.properties?.pole_id || ''
  const dispatch = useDispatch<AppDispatch>()
  const { poleDetail } = useSelector((state: RootState) => state.map)
  const {
    feeders: assetFeeders,
    poles: assetPoles,
    segments: assetSegments,
    cabinets: assetCabinets,
  } = useSelector((state: RootState) => state.assets)
  // Bật/Tắt/Auto là capability ControlLighting: chỉ Quản lý; Cấp giám sát chỉ xem
  const canControlLighting = useSelector((state: RootState) => isManager(state.auth.user?.role))
  // Dời cột (EditPoleLocation), tháo bóng và sửa hình tuyến (ManageAssets): trên web chỉ Quản lý có các quyền này
  const canEditAssets = canControlLighting
  const [retiringFixture, setRetiringFixture] = useState<RetirableFixture | null>(null)
  // Sửa thông tin cột / gắn bộ đèn: cùng form với tab Quản lý tài sản, dữ liệu lấy từ danh sách tài sản đã tải
  const [isEditingPole, setIsEditingPole] = useState(false)
  const [isAddingFixture, setIsAddingFixture] = useState(false)
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null)
  const poleItem = poleId ? (assetPoles ?? []).find((p) => p.pole_id === poleId) ?? null : null

  // Bật / Tắt / AUTO qua POST /iot/nodes/{nodeId}/command (docs/LUXMAP-IOT-FE.md mục 4), không qua /lighting/commands.
  // AUTO luôn kèm lịch: bấm Auto mở form lịch (điền sẵn lịch đang có trên node), gửi từ form.
  // Hộp xác nhận lệnh: Bật / Tắt hỏi lại trước khi gửi, AUTO mở form lịch
  const [commandTarget, setCommandTarget] = useState<FeederCommandTarget | null>(null)
  const commandSentRef = useRef(false)
  const commandSend = useSelector(selectCommandSend)
  const sendingCommand = commandSend.status === 'sending'
  // Đổi giá trị để đọc lại chế độ mạch (lịch sử lệnh) ngay sau khi gửi lệnh
  const [modeRefresh, setModeRefresh] = useState(0)
  // Modal lịch sử mạch mở trực tiếp trên GIS (Quản lý)
  const [feederHistory, setFeederHistory] = useState<{
    feederId: string
    feederLabel: string | null
    nodeId: string | null
    tab: FeederHistoryTab
  } | null>(null)

  const autoReqSeq = useRef(0)
  const pendingAutoRef = useRef<{
    requestId: string
    feederId: string
    nodeId: string
    mode: FeederControlMode
    info: Pick<FeederCommandTarget, 'feederName' | 'feederCode' | 'poleCount'>
  } | null>(null)
  const autoPrefill = useSelector(selectAutoPrefill)

  useEffect(() => {
    dispatch(resetCommandSend())
    return () => {
      dispatch(clearAutoPrefill())
    }
  }, [dispatch])

  useEffect(() => {
    if (commandSend.status === 'succeeded' && commandSentRef.current) {
      setCommandTarget(null)
      setModeRefresh((n) => n + 1)
      commandSentRef.current = false
      dispatch(resetCommandSend())
    } else if (commandSend.status === 'failed') {
      commandSentRef.current = false
      dispatch(resetCommandSend())
    }
  }, [commandSend.status, dispatch])

  useEffect(() => {
    if (autoPrefill?.status === 'ready' && autoPrefill.requestId === pendingAutoRef.current?.requestId) {
      const { feederId, nodeId, mode, info } = pendingAutoRef.current
      setCommandTarget({ feederId, nodeId, mode, initial: autoPrefill.schedule, ...info })
      pendingAutoRef.current = null
      dispatch(clearAutoPrefill())
    }
  }, [autoPrefill, dispatch])

  const sendFeederCommand = (
    feederId: string,
    nodeId: string,
    mode: FeederControlMode,
    auto?: { type: IotAutoType; schedule?: { day_start: string; night_start: string } }
  ) => {
    commandSentRef.current = true
    const body = auto ? autoBody(auto.type, auto.schedule) : commandBody(mode)
    dispatch(
      sendCommandRequest({
        feederId,
        nodeId,
        mode,
        body,
        cabinetId: selectedCabinet?.cabinet_id || null,
      })
    )
  }

  const handleControlFeederMode = (
    feederId: string,
    mode: FeederControlMode,
    info: Pick<FeederCommandTarget, 'feederName' | 'feederCode' | 'poleCount'> = {}
  ) => {
    // Node gán cho mạch (feederNodeId bên dưới, mỗi node IoT gán đúng một mạch)
    const nodeId = feederNodeId(feederId, selectedFeeder?.feeder_id === feederId ? selectedFeeder : undefined)
    if (!nodeId) {
      toast.error(`Mạch ${feederId} chưa đấu vào node IoT nên không gửi lệnh được.`)
      return
    }
    if (mode !== 'auto') {
      setCommandTarget({ feederId, nodeId, mode, initial: null, ...info })
      return
    }
    const requestId = String(++autoReqSeq.current)
    pendingAutoRef.current = { requestId, feederId, nodeId, mode, info }
    dispatch(fetchAutoPrefillRequest({ requestId, feederId, nodeId }))
  }

  const effectiveFixtureStatus =
    poleDetail?.current_status?.fixture_status || selectedPole?.properties?.fixture_status || 'unknown'
  // Màu / nhãn như marker: power_state lấy cùng nguồn với marker trước, rồi từ chi tiết cột
  const selectedPoleLamp = poleLampState(
    effectiveFixtureStatus,
    selectedPole?.properties?.power_state ?? poleDetail?.power_state
  )
  const openFaultCount =
    poleDetail?.open_faults?.length !== undefined
      ? poleDetail.open_faults.length
      : selectedPole?.properties?.open_fault_count || 0

  const isUnderRepair =
    effectiveFixtureStatus === 'dim' ||
    (openFaultCount > 0 && effectiveFixtureStatus !== 'out')
  const isFaulted = effectiveFixtureStatus === 'out'
  const isUnknown = effectiveFixtureStatus === 'unknown'

  const maintenanceStatus = isUnderRepair
    ? 'repairing'
    : isFaulted
    ? 'fault'
    : isUnknown
    ? 'unknown'
    : 'normal'

  // Fetch real pole detail via Redux Saga (GET /api/v1/map/poles/{pole_id});
  // tải lại khi trạng thái đèn của cột trên bản đồ đổi (chi tiết cột được ưu tiên hơn dữ liệu bản đồ nên không được để cũ)
  const liveFixtureStatus = selectedPole?.properties?.fixture_status
  React.useEffect(() => {
    if (!poleId) {
      dispatch(clearPoleDetail())
      return
    }

    dispatch(fetchPoleDetailRequest(poleId))
  }, [dispatch, poleId, liveFixtureStatus])

  // Real open faults from poleDetail
  const openFaults = poleDetail?.open_faults || []

  // Bộ đèn đang dùng của cột đang mở (luật web: 1 bộ / cột; bóng trong bộ giống nhau). Chi tiết cột của cột trước còn trong store thì chưa tính.
  const detailOfThisPole = poleDetail?.pole_id === poleId ? poleDetail : null
  const poleFixtures = detailOfThisPole
    ? detailOfThisPole.fixtures?.length
      ? detailOfThisPole.fixtures
      : detailOfThisPole.fixture
      ? [detailOfThisPole.fixture]
      : []
    : []
  const poleLabel = selectedPole?.properties?.external_ref || poleId
  // Sửa bộ đèn: cùng form gắn, điền sẵn từ chi tiết cột
  const editingFixture = editingFixtureId ? poleFixtures.find((f) => f.fixture_id === editingFixtureId) : undefined
  const editFixtureTarget =
    editingFixture?.fixture_id && poleItem
      ? {
          fixture: {
            fixture_id: editingFixture.fixture_id,
            fixture_type: editingFixture.fixture_type ?? 'led_road_lamp',
            power_source: editingFixture.power_source ?? 'grid',
            lamp_watt: editingFixture.lamp_watt ?? 100,
            lamp_count: editingFixture.lamp_count ?? 1,
            install_date: editingFixture.install_date ?? null,
            warranty_expiry: editingFixture.warranty_expiry ?? null,
            data_source: poleItem.data_source,
            note: editingFixture.note ?? null,
          },
          poleLabel: poleLabel || '',
        }
      : undefined
  /** Chỉ gắn khi cột chưa có bộ đèn đang dùng; bộ cũ phải tháo trước (như trang Tài sản). */
  const canAddFixture = !!detailOfThisPole && !!poleItem && poleFixtures.length === 0

  // Accordion state: auto-open if pole has issue, otherwise collapsed
  const hasIssue =
    selectedPole?.properties?.fixture_status === 'out' ||
    selectedPole?.properties?.fixture_status === 'dim' ||
    openFaults.length > 0 ||
    (selectedPole?.properties?.open_fault_count || 0) > 0

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(hasIssue)

  // Sync accordion state when a new pole is selected
  React.useEffect(() => {
    setIsHistoryOpen(hasIssue)
  }, [selectedPole?.properties?.pole_id, hasIssue])

  // Ảnh khung quét ưu tiên; cột chưa được quét thì dùng ảnh tài sản (cần token nên tải qua blob)
  const frameThumbUrl = poleDetail?.recent_frames?.[0]?.thumbnail_url || null
  const assetPhoto = frameThumbUrl ? undefined : poleDetail?.asset_photos?.[0]
  const assetThumb = useAuthImage(assetPhoto?.thumbnail_url)
  const assetOriginal = useAuthImage(assetPhoto?.original_url, wantsAssetOriginal)
  const polePhotoUrl = frameThumbUrl || assetThumb.url

  React.useEffect(() => {
    setWantsAssetOriginal(false)
  }, [selectedPole?.properties?.pole_id])

  // Dàn đèn do tủ phụ trách được xác định qua topology edges từ Redux Store
  const { cabinetTopologyEdges } = useSelector((state: RootState) => state.map)

  const cabinetConnectedPoles = useMemo(() => {
    if (!selectedCabinet) return []
    const cabId = selectedCabinet.cabinet_id
    const segId = selectedCabinet.segment_id

    if (cabinetTopologyEdges && cabinetTopologyEdges.length > 0) {
      const toPoleIds = new Set(
        cabinetTopologyEdges.map((e: any) => e.properties?.to_pole_id).filter(Boolean)
      )
      const matched = (propsEffectivePoles || []).filter((p) =>
        toPoleIds.has(p.properties?.pole_id)
      )
      if (matched.length > 0) return matched
    }

    return (propsEffectivePoles || []).filter(
      (f) =>
        f.properties?.cabinet_id === cabId ||
        (segId && f.properties?.segment_id === segId)
    )
  }, [cabinetTopologyEdges, selectedCabinet, propsEffectivePoles])

  // Danh sách các mạch điện (Feeders) thuộc tủ này
  const cabinetFeeders = useMemo(() => {
    if (!selectedCabinet) return []

    // 1. Ưu tiên đọc trực tiếp từ selectedCabinet.feeders (CabinetFeederState[] từ GET /map/cabinets)
    const beFeeders: any[] = selectedCabinet.feeders || []
    if (beFeeders.length > 0) {
      return beFeeders.map((fState, idx) => {
        const fId = fState.feeder_id || `fdr-${idx}`
        const assetMatch = (assetFeeders || []).find((af) => af.feeder_id === fId)
        const feederPoles = cabinetConnectedPoles.filter(
          (p) => p.properties.feeder_id === fId || (idx === 0 && !p.properties.feeder_id)
        )
        return {
          feeder_id: fId,
          external_ref: assetMatch?.external_ref || fId,
          feeder_name: assetMatch?.feeder_name || `Mạch ${idx + 1} - Lộ ${idx + 1}`,
          relay_no: fState.relay_no ?? assetMatch?.control?.relay_no,
          control_mode: fState.control_mode ?? assetMatch?.control?.control_mode,
          power_state: fState.power_state ?? assetMatch?.power_state,
          mode_reported_at: fState.mode_reported_at ?? assetMatch?.control?.mode_reported_at,
          pole_count: feederPoles.length || assetMatch?.pole_count || 0,
          cabinet: {
            cabinet_id: selectedCabinet.cabinet_id,
            cabinet_name: selectedCabinet.cabinet_name,
            location: selectedCabinet.location,
            cabinet_source: 'field' as any,
          },
          updated_at: null,
        }
      })
    }

    // 2. Fallback tìm các feeder từ assetFeeders liên kết với tủ này
    const matched = (assetFeeders || []).filter(
      (f) =>
        (f.cabinet?.cabinet_id && f.cabinet.cabinet_id === selectedCabinet.cabinet_id) ||
        (selectedCabinet.feeder_ids && selectedCabinet.feeder_ids.includes(f.feeder_id)) ||
        (selectedCabinet.external_ref && f.cabinet?.cabinet_name?.includes(selectedCabinet.external_ref))
    )
    if (matched.length > 0) return matched

    // 3. Fallback nếu tủ có danh sách feeder_ids hoặc mô phỏng mạch điện của tủ
    const ids =
      selectedCabinet.feeder_ids && selectedCabinet.feeder_ids.length > 0
        ? selectedCabinet.feeder_ids
        : [`FDR-${selectedCabinet.external_ref || selectedCabinet.cabinet_id || '01'}-1`, `FDR-${selectedCabinet.external_ref || selectedCabinet.cabinet_id || '01'}-2`]

    return ids.map((fId: string, idx: number) => ({
      feeder_id: fId,
      external_ref: fId,
      feeder_name: `Mạch ${idx + 1} - Lộ chiếu sáng ${idx + 1}`,
      commune_id: selectedCabinet.commune_id,
      commune_name: selectedCabinet.commune_name,
      has_geometry: false,
      pole_count: Math.ceil(cabinetConnectedPoles.length / ids.length) || 0,
      cabinet: {
        cabinet_id: selectedCabinet.cabinet_id,
        cabinet_name: selectedCabinet.cabinet_name,
        location: selectedCabinet.location,
        cabinet_source: 'field' as any,
      },
      updated_at: null,
    }))
  }, [selectedCabinet, assetFeeders, cabinetConnectedPoles])

  // Node IoT của mạch: mỗi IoT gán đúng một mạch (feeder.control.node_id)
  const feederNodeId = (feederId: string, feeder?: any): string | null =>
    (assetFeeders || []).find((af: any) => af.feeder_id === feederId)?.control?.node_id || feeder?.control?.node_id || null
  const cabinetIotCount = cabinetFeeders.filter((f: any) => feederNodeId(f.feeder_id, f)).length
  const selectedFeederNodeId = selectedFeeder
    ? feederNodeId(selectedFeeder.feeder_id || selectedFeeder.external_ref, selectedFeeder)
    : null
  // Tên / mã / số cột của mạch đang mở, hiện trong hộp lệnh (cùng số với khung mạch)
  const selectedFeederInfo = selectedFeeder
    ? {
        feederName: selectedFeeder.feeder_name || undefined,
        feederCode: selectedFeeder.external_ref || selectedFeeder.feeder_id,
        poleCount:
          (propsEffectivePoles ?? []).filter(
            (p) =>
              p.properties.feeder_id === selectedFeeder.feeder_id || p.properties.feeder_id === selectedFeeder.external_ref
          ).length ||
          selectedFeeder.pole_count ||
          undefined,
      }
    : {}
  // Chế độ đang chạy của từng mạch = lệnh success mới nhất trong lịch sử lệnh của node
  const commandModes = useFeederCommandModes(
    [...cabinetFeeders.map((f: any) => feederNodeId(f.feeder_id, f)), selectedFeederNodeId].filter(
      (id): id is string => Boolean(id)
    ),
    modeRefresh
  )
  const modeOf = (nodeId: string | null): FeederControlMode | undefined => (nodeId ? commandModes[nodeId] ?? undefined : undefined)

  const [expandedFeederId, setExpandedFeederId] = useState<string | null>(null)

  React.useEffect(() => {
    setExpandedFeederId(null)
  }, [selectedCabinet?.cabinet_id])

  const cabinetId = selectedCabinet?.cabinet_id || null
  const {
    nodes: cabinetIotNodes,
    servers: cabinetIotServers,
    loading: cabinetIotLoading,
    error: cabinetIotError,
  } = useCabinetIotStatus(cabinetId)

  const cabinetNodeGroups = useMemo(() => {
    if (cabinetIotNodes.length === 0) return []
    const countByLabel = new Map<string, { count: number; tone: IotTone; label: string }>()
    for (const n of cabinetIotNodes) {
      const badge = iotStatusBadge(IOT_NODE_STATUS, n.status)
      const existing = countByLabel.get(badge.label)
      if (existing) {
        existing.count += 1
      } else {
        countByLabel.set(badge.label, { count: 1, tone: badge.tone, label: badge.label })
      }
    }
    return Array.from(countByLabel.values()).sort(
      (a, b) => IOT_TONE_ORDER[a.tone] - IOT_TONE_ORDER[b.tone] || a.label.localeCompare(b.label)
    )
  }, [cabinetIotNodes])

  return (
    <>
      {feederHistory && (
        <FeederHistoryModal
          key={`${feederHistory.feederId}-${feederHistory.tab}`}
          feederId={feederHistory.feederId}
          feederLabel={feederHistory.feederLabel}
          nodeId={feederHistory.nodeId}
          initialTab={feederHistory.tab}
          onClose={() => setFeederHistory(null)}
        />
      )}
      {commandTarget && (
        <FeederCommandDialog
          target={commandTarget}
          sending={sendingCommand}
          onSend={(auto) => sendFeederCommand(commandTarget.feederId, commandTarget.nodeId, commandTarget.mode, auto)}
          onClose={() => setCommandTarget(null)}
        />
      )}
      <aside className="w-97.5 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-40 shrink-0 font-sans">
        
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                selectedPole
                  ? maintenanceStatus === 'repairing'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : maintenanceStatus === 'fault'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : maintenanceStatus === 'unknown'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : selectedCabinet
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : selectedFeeder
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : activeSegmentDetail.hasActiveSegmentFault
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {selectedPole ? (
                maintenanceStatus === 'repairing' ? (
                  <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : maintenanceStatus === 'fault' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )
              ) : selectedCabinet ? (
                <img
                  src={cabinetSvg}
                  className="w-4.5 h-4.5 shrink-0"
                  alt="Tủ điện"
                />
              ) : selectedFeeder ? (
                <Zap className="w-4 h-4 text-amber-500" />
              ) : (
                <Radio className={`w-4 h-4 ${activeSegmentDetail.hasActiveSegmentFault ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              )}
            </div>

            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>
                  {selectedPole
                    ? selectedPole.properties?.external_ref || selectedPole.properties?.pole_id
                    : selectedCabinet
                    ? selectedCabinet.cabinet_name || selectedCabinet.external_ref || selectedCabinet.cabinet_id
                    : selectedFeeder
                    ? selectedFeeder.feeder_name || selectedFeeder.external_ref || selectedFeeder.feeder_id
                    : activeSegmentDetail.name}
                </span>
                {selectedPole && (
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${POLE_LAMP_UI[selectedPoleLamp].badge}`}>
                    {POLE_LAMP_UI[selectedPoleLamp].label}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedPole
                  ? activeSegmentDetail.name
                  : selectedCabinet
                  ? [
                      selectedCabinet.external_ref || selectedCabinet.cabinet_name || selectedCabinet.cabinet_id,
                      selectedCabinet.landmark_note || selectedCabinet.atlas
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : selectedFeeder
                  ? [
                      selectedFeeder.external_ref || selectedFeeder.feeder_id,
                      selectedFeeder.cabinet_name ? `Tủ: ${selectedFeeder.cabinet_name}` : null,
                      selectedFeeder.segment_id
                        ? `Tuyến: ${activeSegmentDetail.id === selectedFeeder.segment_id ? segmentDisplayCode(activeSegmentDetail) : selectedFeeder.segment_id}`
                        : null
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${segmentDisplayCode(activeSegmentDetail)} · ${activeSegmentDetail.name}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPole(null)
              setSelectedSegmentId(null)
              if (setSelectedCabinet) setSelectedCabinet(null)
              if (setSelectedFeeder) setSelectedFeeder(null)
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {selectedPole ? (
            <div className="space-y-4 text-xs">
              {/* Cascade Fault Alert Banner */}

              {/* 1. Actual Pole Photo */}
              {polePhotoUrl ? (
                <div
                  onClick={() => {
                    setWantsAssetOriginal(!!assetPhoto)
                    setLightboxImage({
                      url: polePhotoUrl,
                      title: `Ảnh cột đèn: ${selectedPole.properties.external_ref || selectedPole.properties.pole_id}`,
                    })
                  }}
                  className={`relative ${isPortraitPhoto ? 'h-72' : 'h-44'} rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-2xs`}
                >
                  <img
                    src={polePhotoUrl}
                    alt={selectedPole.properties.external_ref || selectedPole.properties.pole_id}
                    onLoad={(e) =>
                      setIsPortraitPhoto(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)
                    }
                    className={`w-full h-full ${isPortraitPhoto ? 'object-contain' : 'object-cover group-hover:scale-105'} transition-transform duration-200`}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent flex items-end justify-between p-2.5 text-white">
                    <span className="text-[11px] font-medium drop-shadow-sm font-mono">
                      {selectedPole.properties.external_ref || selectedPole.properties.pole_id}
                    </span>
                    <div className="p-1 rounded bg-black/40 group-hover:bg-blue-600 text-white transition">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ) : assetThumb.isLoading ? (
                <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ) : (
                <div className="h-28 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <CameraOff className="w-6 h-6 mb-1 text-slate-300 dark:text-slate-600" />
                  <span>Chưa có ảnh cột đèn</span>
                </div>
              )}

                  {/* 2. Technical Specs Card (Core Asset Identity) */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Thông số kỹ thuật</span>
                    </div>

                    <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Tuyến:</span>
                        {selectedPole.properties.segment_id === activeSegmentDetail.id ? (
                          segmentLink(activeSegmentDetail.fullName || activeSegmentDetail.name)
                        ) : (
                          <strong className="text-slate-900 dark:text-white">Chưa gán</strong>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Nguồn cấp:</span>
                        <strong className="text-slate-900 dark:text-white">
                          Điện lưới 220V
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bộ đèn:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {fixtureTypeLabel(poleDetail?.fixture?.fixture_type || selectedPole.properties.fixture_type)}
                          {(poleDetail?.fixture?.lamp_watt || selectedPole.properties.lamp_watt) &&
                            ` (${poleDetail?.fixture?.lamp_watt || selectedPole.properties.lamp_watt}W)`}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tọa độ GPS:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {selectedPole.geometry.coordinates[1].toFixed(5)}° N, {selectedPole.geometry.coordinates[0].toFixed(5)}° E
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Lắp đặt:</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {formatDate(poleDetail?.fixture?.install_date || selectedPole.properties.install_date) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hạn bảo hành:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">
                          {formatDate(poleDetail?.fixture?.warranty_expiry || selectedPole.properties.warranty_expiry) || '—'}
                        </span>
                      </div>
                      {selectedPole.properties.near_sensitive_poi && (
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium">
                          <span>Vị trí nhạy cảm:</span>
                          <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-semibold">
                            <span className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold">!</span>
                            Gần trường học
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          Ghi chú vị trí:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {selectedPole.properties.atlas || selectedPole.properties.atlas_note || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thao tác trên cột (Quản lý): sửa cột (cả vị trí GPS, trong form), gắn / tháo từng bộ đèn */}
                  {canEditAssets && (
                    <div className="bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs space-y-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Thao tác</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPole(true)}
                          disabled={!poleItem}
                          title={poleItem ? 'Sửa mã, tuyến, mạch, ghi chú và vị trí GPS của cột' : 'Đang tải danh sách cột…'}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px] hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-3 h-3" />
                          Sửa cột
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {poleFixtures.length > 0 ? (
                          poleFixtures.map((fixture, idx) => (
                            <div
                              key={fixture.fixture_id || idx}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 text-[11px]"
                            >
                              <span className="text-slate-700 dark:text-slate-300">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {fixture.fixture_id || 'Bộ đèn'}
                                </span>
                                {typeof fixture.lamp_watt === 'number' &&
                                  ` · ${fixture.lamp_watt} W (${fixture.lamp_count || 1} bóng)`}
                                {fixture.install_date && ` · lắp ${formatDate(fixture.install_date)}`}
                                {fixture.note && (
                                  <span className="block italic text-slate-500 dark:text-slate-400">
                                    Ghi chú: {fixture.note}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingFixtureId(fixture.fixture_id)}
                                disabled={!fixture.fixture_id || !poleItem}
                                title="Sửa thông tin nhập sai của bộ đèn"
                                className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Pencil className="w-3 h-3" />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRetiringFixture({
                                    fixture_id: fixture.fixture_id,
                                    pole_id: poleId,
                                    pole_external_ref: poleLabel,
                                    install_date: fixture.install_date ?? null,
                                    lamp_watt: fixture.lamp_watt,
                                    lamp_count: fixture.lamp_count,
                                  })
                                }
                                disabled={!fixture.fixture_id}
                                className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Unplug className="w-3 h-3" />
                                Tháo bộ đèn
                              </button>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="py-1.5 text-center text-slate-400 dark:text-slate-500 text-[11px]">
                            {detailOfThisPole ? 'Cột chưa có bộ đèn đang dùng' : 'Đang tải bộ đèn…'}
                          </div>
                        )}
                        {canAddFixture && (
                          <button
                            type="button"
                            onClick={() => setIsAddingFixture(true)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlugZap className="w-3.5 h-3.5" />
                            Gắn bộ đèn
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Collapsible Active Faults & Issues (Accordion at the bottom) */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden bg-white dark:bg-slate-800/50 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        {openFaults.length > 0 ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>Sự cố đang ghi nhận</span>
                        {openFaults.length > 0 ? (
                          <span className="ml-1.5 px-2 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                            {openFaults.length} sự cố
                          </span>
                        ) : (
                          <span className="ml-1.5 px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Không có sự cố
                          </span>
                        )}
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                      )}
                    </button>

                    {isHistoryOpen && (
                      <div className="p-3 pt-2 space-y-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-900/40">
                        {openFaults.length > 0 ? (
                          openFaults.map((fault: PoleMapOpenFault, idx: number) => {
                            const faultType = fault.fault_type
                            const severity = fault.severity
                            const faultStatus = fault.fault_status
                            const sevConfig = severity ? SEVERITY_BADGES[severity] : null

                            return (
                              <div
                                key={fault.fault_id || idx}
                                className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[11px] font-bold text-blue-900 dark:text-blue-300">
                                    {fault.fault_id || `FAULT-#${idx + 1}`}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {sevConfig && (
                                      <span
                                        className={`text-[9.5px] px-1.5 py-0.2 rounded border font-semibold ${sevConfig.className}`}
                                      >
                                        {sevConfig.label}
                                      </span>
                                    )}
                                    {faultStatus && (
                                      <span className="text-[9.5px] px-1.5 py-0.2 rounded font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                        {FAULT_STATUS_LABELS[faultStatus] || faultStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between">
                                  <span>
                                    {faultType ? FAULT_TYPE_LABELS[faultType] || faultType : 'Sự cố chiếu sáng'}
                                  </span>
                                  {typeof fault.priority_score === 'number' && (
                                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                      Ưu tiên: {fault.priority_score}đ
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="py-4 px-3 flex flex-col items-center justify-center text-center space-y-1.5 text-slate-500 dark:text-slate-400">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-4.5 h-4.5" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              Không có sự cố nào đang ghi nhận
                            </span>
                            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 max-w-60 leading-relaxed">
                              Cột đèn hoạt động bình thường, không có cảnh báo bất thường từ các đợt khảo sát và vận hành.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          ) : selectedCabinet ? (
            <div className="space-y-4 text-xs">
              {/* Cabinet Details Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <img
                      src={cabinetSvg}
                      className="w-4 h-4 shrink-0"
                      alt="Tủ điện"
                    />
                    <span>Thông số Tủ Điện Điều Khiển</span>
                  </span>
                  
                </div>

                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã hiệu quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{selectedCabinet.external_ref || selectedCabinet.cabinet_name || selectedCabinet.cabinet_id}</strong>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Ghi chú vị trí:
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-right max-w-55">
                      {selectedCabinet.atlas || selectedCabinet.landmark_note || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuyến đường cấp nguồn:</span>
                    <strong className="text-blue-700 dark:text-blue-400 font-bold">{selectedCabinet.segment_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Số lượng mạch điện (Feeders):</span>
                    <strong className="text-purple-700 dark:text-purple-400 font-bold font-mono">
                      {cabinetFeeders.length} mạch nguồn
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số đèn quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {cabinetConnectedPoles.length || selectedCabinet.total_poles_managed || 0} cột đèn
                    </strong>
                  </div>
                </div>

                </div>

              {/* Electrical Specs Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Hệ thống IoT Giám sát từ xa</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                    {cabinetIotCount > 0 ? `${cabinetIotCount}/${cabinetFeeders.length} mạch có IoT` : 'Chưa gắn thiết bị'}
                  </span>
                </div>

                {cabinetIotLoading && cabinetIotNodes.length === 0 ? (
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 py-0.5">
                    Đang tải trạng thái IoT…
                  </div>
                ) : cabinetIotError && cabinetIotNodes.length === 0 ? (
                  <div className="text-[11.5px] text-rose-600 dark:text-rose-400 py-0.5">
                    {cabinetIotError}
                  </div>
                ) : cabinetIotNodes.length === 0 ? (
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 py-0.5">
                    Chưa có node IoT gắn tủ này.
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                    {/* Dòng Trạm IoT */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 w-16 font-medium">Trạm IoT</span>
                      <div className="flex-1 space-y-1 min-w-0">
                        {cabinetIotServers.length > 0 ? (
                          cabinetIotServers.map((server) => {
                            const badge = iotStatusBadge(IOT_GATEWAY_STATUS, server.status)
                            return (
                              <div key={server.server_id} className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: IOT_TONE_COLOR[badge.tone] }}
                                />
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                  {server.server_id}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {badge.label}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Dòng Node */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 w-16 font-medium">Node</span>
                      <div className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {cabinetNodeGroups.map((group, idx) => (
                          <React.Fragment key={group.label}>
                            {idx > 0 && <span className="text-slate-400 dark:text-slate-500"> · </span>}
                            <span className={`whitespace-nowrap ${group.tone === 'bad' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                              {group.count} {group.label}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feeder Circuits Section with Individual On/Off Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="truncate">Danh sách Mạch điện của Tủ ({cabinetFeeders.length} mạch)</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {cabinetFeeders.map((feeder: any, idx: number) => {
                    const fId = feeder.feeder_id || feeder.external_ref || `fdr-${idx}`
                    const cabFeeder = (selectedCabinet?.feeders || []).find((cf: any) => cf.feeder_id === fId)
                    const nodeId = feederNodeId(fId, feeder)
                    const currentMode = modeOf(nodeId)
                    const feederPoles = cabinetConnectedPoles.filter(
                      (p) => p.properties.feeder_id === fId || (idx === 0 && !p.properties.feeder_id)
                    )
                    const poleCount = feederPoles.length || feeder.pole_count || 0
                    const fName = feeder.feeder_name || `Mạch ${idx + 1}`
                    const fCode = feeder.external_ref || fId
                    const isExpanded = expandedFeederId === fId

                    const nodeObj = nodeId ? cabinetIotNodes.find((n) => n.node_id === nodeId) : undefined
                    const nodeBadge = nodeId
                      ? iotStatusBadge(IOT_NODE_STATUS, nodeObj ? nodeObj.status : undefined)
                      : null
                    const nodeStatusShort = nodeId
                      ? (nodeObj?.status ? NODE_STATUS_SHORT[nodeObj.status] : undefined) ?? 'không rõ'
                      : ''
                    const nodeToneClass =
                      nodeBadge?.tone === 'bad'
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : nodeBadge?.tone === 'warn'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'

                    return (
                      <div
                        key={fId}
                        className={`px-2.5 py-2 rounded-xl border transition-all ${
                          currentMode === 'off'
                            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600'
                            : currentMode === 'on'
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {/* Vùng trái: button bấm để mở/đóng */}
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`feeder-detail-${fId}`}
                            title={fName}
                            onClick={() => setExpandedFeederId((prev) => (prev === fId ? null : fId))}
                            className="flex-1 min-w-0 text-left cursor-pointer group rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {nodeBadge ? (
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: IOT_TONE_COLOR[nodeBadge.tone] }}
                                  />
                                ) : (
                                  <span className="w-2 h-2 rounded-full shrink-0 border border-slate-400 dark:border-slate-500 bg-transparent" />
                                )}
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                                  {fName}
                                </span>
                                <span className="sr-only">{fCode}</span>
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 transition-transform motion-reduce:transition-none ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                            <div className="mt-0.5 pl-3.5 flex items-center gap-1 min-w-0 text-[10.5px]">
                              {nodeId ? (
                                <>
                                  <span className="font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                                    {nodeId}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 shrink-0">·</span>
                                  <span className={`truncate ${nodeToneClass}`} title={nodeBadge?.label}>
                                    {nodeStatusShort}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  Chưa gắn IoT
                                </span>
                              )}
                            </div>
                          </button>

                          {/* 3-State Segmented Control: ON / OFF / AUTO */}
                          {canControlLighting && (
                            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleControlFeederMode(fId, 'on', { feederName: fName, feederCode: fCode, poleCount })}
                                aria-pressed={currentMode === 'on'}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                  currentMode === 'on'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                                }`}
                                title="Bật nguồn cưỡng bức ngay lập tức"
                              >
                                Bật
                              </button>

                              <button
                                type="button"
                                onClick={() => handleControlFeederMode(fId, 'off', { feederName: fName, feederCode: fCode, poleCount })}
                                aria-pressed={currentMode === 'off'}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                  currentMode === 'off'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                                }`}
                                title="Ngắt nguồn cưỡng bức (Tắt)"
                              >
                                Tắt
                              </button>

                              <button
                                type="button"
                                onClick={() => handleControlFeederMode(fId, 'auto', { feederName: fName, feederCode: fCode, poleCount })}
                                aria-pressed={currentMode === 'auto'}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                  currentMode === 'auto'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                                }`}
                                title="Chạy tự động theo lịch hẹn giờ"
                              >
                                Auto
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Vùng chi tiết chỉ render khi mở */}
                        {isExpanded && (
                          <div id={`feeder-detail-${fId}`} className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 min-w-0">
                                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                  {fCode}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${feederPowerBadge(
                                    cabFeeder?.power_state ?? feeder.power_state
                                  )}`}
                                >
                                  {feederPowerLabel(cabFeeder?.power_state ?? feeder.power_state)}
                                </span>
                                <span className="whitespace-nowrap">{poleCount} cột đèn</span>
                              </div>
                              {canControlLighting && nodeId && (
                                <button
                                  type="button"
                                  onClick={() => setFeederHistory({ feederId: fId, feederLabel: fCode, nodeId, tab: 'electrical' })}
                                  title="Xem lịch sử mạch"
                                  aria-label="Xem lịch sử mạch"
                                  className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  Lịch sử
                                </button>
                              )}
                            </div>
                            <FeederElectricalSummary feederId={fId} nodeId={nodeId} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              </div>
          ) : selectedFeeder ? (
            <div className="space-y-4 text-xs">
              {/* Số đo điện của mạch (từ node IoT gán cho mạch) */}
              {(() => {
                const selId = selectedFeeder.feeder_id || selectedFeeder.external_ref
                const nodeId = feederNodeId(selId, selectedFeeder)
                return (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Số đo điện của mạch</span>
                      {canControlLighting && nodeId && (
                        <button
                          type="button"
                          onClick={() =>
                            setFeederHistory({
                              feederId: selId,
                              feederLabel: selectedFeeder.external_ref || selId,
                              nodeId,
                              tab: 'electrical',
                            })
                          }
                          title="Xem lịch sử mạch"
                          aria-label="Xem lịch sử mạch"
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          Lịch sử
                        </button>
                      )}
                    </div>
                    <FeederElectricalSummary feederId={selId} nodeId={nodeId} />
                  </div>
                )
              })()}
              {/* 1. Feeder Control Card with 3-Mode Tri-State Buttons */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{canControlLighting ? 'Điều khiển nguồn Mạch điện (IoT)' : 'Nguồn Mạch điện'}</span>
                  </span>
                  {(() => {
                    const selId = selectedFeeder.feeder_id || selectedFeeder.external_ref
                    const assetFeeder = (assetFeeders || []).find((af: any) => af.feeder_id === selId)
                    const mode: FeederControlMode | undefined =
                      selectedFeeder.control?.control_mode ||
                      selectedFeeder.control_mode ||
                      assetFeeder?.control?.control_mode
                    if (!mode) return null
                    return (
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                          mode === 'on'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : mode === 'off'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                        }`}
                      >
                        {mode === 'on' ? 'Chế độ: Bật' : mode === 'off' ? 'Chế độ: Tắt' : 'Chế độ: Tự động'}
                      </span>
                    )
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/60 gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                      {selectedFeeder.feeder_name || selectedFeeder.external_ref || selectedFeeder.feeder_id}
                    </div>
                    {canControlLighting && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Chuyển đổi trạng thái nguồn rơ-le điều khiển mạch
                      </div>
                    )}
                  </div>

                  {/* 3-Mode Tri-State Control Buttons */}
                  {(() => {
                    const selId = selectedFeeder.feeder_id || selectedFeeder.external_ref
                    const currentMode = modeOf(selectedFeederNodeId)
                    if (!canControlLighting) return null
                    return (
                      <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleControlFeederMode(selId, 'on', selectedFeederInfo)}
                          aria-pressed={currentMode === 'on'}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            currentMode === 'on'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                          }`}
                          title="Bật nguồn cưỡng bức ngay lập tức"
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Bật</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleControlFeederMode(selId, 'off', selectedFeederInfo)}
                          aria-pressed={currentMode === 'off'}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            currentMode === 'off'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                          }`}
                          title="Ngắt nguồn cưỡng bức (Tắt)"
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Tắt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleControlFeederMode(selId, 'auto', selectedFeederInfo)}
                          aria-pressed={currentMode === 'auto'}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            currentMode === 'auto'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                          }`}
                          title="Chạy tự động theo lịch hẹn giờ"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Auto</span>
                        </button>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 2. Feeder Specifications Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Thông số Kỹ thuật Mạch điện</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã hiệu mạch:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {selectedFeeder.external_ref || selectedFeeder.feeder_id}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tủ cấp nguồn:</span>
                    <strong className="text-indigo-700 dark:text-indigo-400 font-bold">
                      {selectedFeeder.cabinet_name || selectedFeeder.cabinet_id || selectedFeeder.from_id || 'Chưa gán'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuyến đường:</span>
                    {activeSegmentDetail.id === selectedFeeder.segment_id ? (
                      segmentLink(selectedFeeder.segment_name || activeSegmentDetail.name)
                    ) : (
                      <strong className="text-blue-700 dark:text-blue-400 font-semibold">
                        {selectedFeeder.segment_name || selectedFeeder.segment_id || 'Chưa gán'}
                      </strong>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>Số cột đèn quản lý:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {propsEffectivePoles.filter(
                        (p) =>
                          p.properties.feeder_id === selectedFeeder.feeder_id ||
                          p.properties.feeder_id === selectedFeeder.external_ref
                      ).length || selectedFeeder.pole_count || 0} cột đèn
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái cấp điện:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {feederPowerLabel(
                        selectedFeeder.power_state ??
                          (assetFeeders || []).find(
                            (af: any) => af.feeder_id === (selectedFeeder.feeder_id || selectedFeeder.external_ref)
                          )?.power_state
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Poles on this Feeder Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Danh sách Cột đèn thuộc Mạch ({selectedFeeder.external_ref || selectedFeeder.feeder_id})
                  </p>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                  {propsEffectivePoles
                    .filter(
                      (p) =>
                        p.properties.feeder_id === selectedFeeder.feeder_id ||
                        p.properties.feeder_id === selectedFeeder.external_ref
                    )
                    .map((f: PoleFeature, index: number) => {
                      const statusBadge = poleStatusBadge(f.properties)
                      const lampLabel = f.properties.lamp_code || `Đèn số ${index + 1}`

                      return (
                        <div
                          key={f.properties.pole_id}
                          onClick={() => handleSelectPole(f)}
                          className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer flex items-center justify-between border border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700/50 transition group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {f.properties.external_ref || f.properties.pole_id}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {lampLabel}
                            </span>
                          </div>
                          <span className={`text-[9.5px] px-2 py-0.5 rounded font-bold ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* 1. Segment Overview Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700/60 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Thông tin tuyến</span>
                  </span>
                  {activeSegmentDetail.hasActiveSegmentFault && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded border bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                      Sự cố mất điện lộ nguồn
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Mã tuyến:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{segmentDisplayCode(activeSegmentDetail)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tên tuyến:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cấp đường:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {activeSegmentDetail.road_class === 'urban'
                        ? 'Đường đô thị'
                        : activeSegmentDetail.road_class === 'rural'
                        ? 'Đường nông thôn'
                        : activeSegmentDetail.road_class === 'inter_commune'
                        ? 'Đường liên xã'
                        : activeSegmentDetail.road_class || 'Đường giao thông'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chiều dài tuyến:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.lengthM} m</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số cột:</span>
                    <strong className="text-slate-900 dark:text-white">{activeSegmentDetail.poleCount} cột</strong>
                  </div>
                </div>
              </div>

              {/* 2. Pole List on this Segment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Danh sách cột ({activeSegmentDetail.name})
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {activeSegmentDetail.poleCount} cột
                  </span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-0.5">
                  {(propsEffectivePoles || [])
                    .filter((f: PoleFeature) => f.properties?.segment_id === activeSegmentDetail.id)
                    .map((f: PoleFeature) => (
                      <div
                        key={f.properties.pole_id}
                        onClick={() => handleSelectPole(f)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer flex items-center justify-between border border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700/50 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {f.properties.external_ref || f.properties.pole_id}
                          </span>
                          {f.properties.near_sensitive_poi && (
                            <span
                              className="w-3.5 h-3.5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 shadow-xs"
                              title="Gần trường học"
                            >
                              !
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${poleStatusBadge(f.properties).className}`}>
                          {poleStatusBadge(f.properties).short}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </aside>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <h3 className="font-semibold text-xs text-slate-200">{lightboxImage.title}</h3>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-72 max-h-[70vh]">
              <img
                src={assetOriginal.url || lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tháo bộ đèn: cùng form với tab Quản lý tài sản; xong thì tải lại chi tiết cột và lớp bản đồ */}
      <RetireFixtureModal
        isOpen={retiringFixture !== null}
        onClose={() => setRetiringFixture(null)}
        fixture={retiringFixture}
        onConfirm={(fixtureId, req) => dispatch(retireFixtureRequest({ fixtureId, data: req, poleId }))}
      />

      {/* Gắn bộ đèn / sửa thông tin cột: xong thì tải lại chi tiết cột và lớp bản đồ */}
      {poleItem && (
        <AddFixtureModal
          isOpen={isAddingFixture}
          onClose={() => setIsAddingFixture(false)}
          poles={[poleItem]}
          fixedPole={poleItem}
          onAddFixture={(data) => dispatch(createFixtureRequest({ data, poleId }))}
        />
      )}
      {editFixtureTarget && (
        <AddFixtureModal
          isOpen
          onClose={() => setEditingFixtureId(null)}
          poles={poleItem ? [poleItem] : []}
          editFixture={editFixtureTarget}
          onUpdateFixture={(fixtureId, data) => dispatch(updateFixtureRequest({ fixtureId, data, poleId }))}
        />
      )}
      <EditPoleModal
        isOpen={isEditingPole}
        pole={poleItem}
        segments={assetSegments}
        cabinets={assetCabinets}
        allPoles={assetPoles}
        onClose={() => setIsEditingPole(false)}
        onSave={(updated) => {
          if (!updated.pole_id) return
          dispatch(
            updatePoleRequest({ poleId: updated.pole_id, data: poleUpdateRequest(updated), refreshMap: true })
          )
        }}
      />
    </>
  )
}


