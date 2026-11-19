import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Video,
  Camera,
  Gauge,
  Wrench,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Map as MapIcon,
  Cpu,
  RotateCcw,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import {
  saveEditedGpsLocations,
  type ScheduleCase,
  type SchedulePhase,
} from '../../../feature/work-schedule/workScheduleSlice'
import {
  fetchAssetsRequest,
  fetchSegmentDetailRequest,
} from '../../../feature/assets/assetSlice'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { EvidenceItem, WorkOrderPole, PolePhotoItem, WorkOrderPoleLocation } from '../../../types/workorders/orders'
import type { SetPoleLocationRequest } from '../../../types/assets/poles'
import { formatSegmentDisplay } from '../../../utils/work-schedule/workScheduleUtils'
import { FAULT_TYPE_LABELS_VN } from '../../../utils/citizen-report/citizenReviewFormat'
import { iotAnomalyLabel } from '../../../constants/iot'
import { SegmentRouteMap, type SegmentPoleItem } from '../../../components/SegmentRouteMap'
import {
  extractSegmentCoordinates,
  parseLineStringWkt,
  snapPointToPolyline,
  calculateDistanceMeters,
  projectPointOnSegment,
} from '../../../utils/gis-map/routeUtils'
import {
  orderPolesByChain,
  orderedPolesOfSegment,
  VERTEX_MATCH_METERS,
  type OrderedPole,
} from '../../../utils/gis-map/segmentPoleOrder'
import { EvidenceImage } from './EvidenceImage'
import { PolePhotoImage } from './PolePhotoImage'
import { PoleVideoPlayer } from './PoleVideoPlayer'

const BACKEND_CORRIDOR_LIMIT_M = 25

const formatDurationMs = (ms?: number): string => {
  if (ms == null || ms <= 0) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const formatByteCount = (bytes?: number): string => {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FieldReportDetailModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  phase: SchedulePhase | null
  onClose: () => void
  onPreviewGis?: (payload: {
    code: string
    segment: string
    poles: WorkOrderPoleLocation[]
  }) => void
}

interface ZoomImageTarget {
  evidenceId?: string | null
  polePhotoId?: string | null
  workOrderId?: string | null
  src?: string
  title?: string
}

export const FieldReportDetailModal: React.FC<FieldReportDetailModalProps> = ({
  isOpen,
  caseItem,
  phase,
  onClose,
  onPreviewGis,
}) => {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState<'video' | 'photos' | 'ai' | 'gps'>('video')
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [zoomImage, setZoomImage] = useState<ZoomImageTarget | null>(null)
  const [backendEvidence, setBackendEvidence] = useState<EvidenceItem[]>([])
  const [poles, setPoles] = useState<WorkOrderPole[]>([])
  const [polePhotos, setPolePhotos] = useState<PolePhotoItem[]>([])
  const [decidingPhotoId, setDecidingPhotoId] = useState<string | null>(null)

  // State cho Popup Xem & Tinh chỉnh GIS (Dữ liệu tạm trước khi Duyệt báo cáo)
  const [isGisPreviewOpen, setIsGisPreviewOpen] = useState(false)
  const [draftPoleCoords, setDraftPoleCoords] = useState<Record<string, SetPoleLocationRequest>>({})

  const handleDecidePolePhoto = async (
    photoId: string | null | undefined,
    decision: 'confirm' | 'reject'
  ) => {
    if (!targetWorkOrderId || !photoId || decidingPhotoId) return
    setDecidingPhotoId(photoId)
    try {
      const updated = await workScheduleAPI.decidePolePhoto(targetWorkOrderId, photoId, {
        decision,
        note:
          decision === 'confirm'
            ? 'Quản lý xác nhận báo cáo khảo sát cột đèn.'
            : 'Quản lý từ chối ảnh/video khảo sát không hợp lệ.',
      })
      setPolePhotos((prev) =>
        prev.map((item) => (item.photo_id === photoId ? updated : item))
      )
      toast.success(
        decision === 'confirm'
          ? `Đã xác nhận báo cáo cột ${updated.pole_id || ''}!`
          : `Đã từ chối báo cáo ảnh/video cột ${updated.pole_id || ''}.`
      )
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { code?: string } } } }
      const code = errObj?.response?.data?.error?.code
      if (code === 'POLE_VIDEO_NOT_VIEWED') {
        toast.error('Vui lòng phát xem clip video của cột này trước khi bấm Xác nhận.')
      } else if (code === 'POLE_PHOTO_INCONCLUSIVE') {
        toast.error(
          'Ảnh chưa được Kỹ sư chốt trạng thái (Sáng/Tắt). Vui lòng Yêu cầu làm lại hoặc bấm Từ chối nếu ảnh không dùng.'
        )
      } else {
        toast.error('Không thể cập nhật quyết định cho báo cáo cột đèn này.')
      }
    } finally {
      setDecidingPhotoId(null)
    }
  }

  // Chi tiết lệnh công tác từ Redux store
  const workOrderDetail = useSelector((state: RootState) => state.workSchedule.workOrderDetail)
  const allSegments = useSelector((state: RootState) => state.assets.segments)
  const allAssetPoles = useSelector((state: RootState) => state.assets.poles)
  const segmentDetail = useSelector((state: RootState) => state.assets.segmentDetail)
  const editedGpsByWorkOrder = useSelector((state: RootState) => state.workSchedule.editedGpsByWorkOrder)

  // Xác định mã lệnh công tác (hỗ trợ fallback caseItem.code nếu phase.workOrderId trống)
  const targetWorkOrderId = phase?.workOrderId || caseItem?.code
  const isTargetDetail = Boolean(targetWorkOrderId && workOrderDetail?.work_order_id === targetWorkOrderId)
  const savedEditedGps = useMemo(
    () => (targetWorkOrderId ? editedGpsByWorkOrder?.[targetWorkOrderId] || {} : {}),
    [editedGpsByWorkOrder, targetWorkOrderId]
  )

  const effectivePoleGpsLocations: WorkOrderPoleLocation[] = useMemo(() => {
    if (isTargetDetail && workOrderDetail?.pole_locations) {
      return workOrderDetail.pole_locations
    }
    return phase?.report?.poleGpsLocations || []
  }, [isTargetDetail, workOrderDetail?.pole_locations, phase?.report?.poleGpsLocations])

  // Xác định mã tuyến đường của phiếu cập nhật GPS
  const targetSegmentId = useMemo(() => {
    if (isTargetDetail && workOrderDetail?.segment_id) return workOrderDetail.segment_id
    if (phase?.segmentId) return phase.segmentId
    const rawSeg = (caseItem?.segment || '').trim()
    if (rawSeg && rawSeg !== '-' && rawSeg !== '—') {
      const matchedByCodeOrName = allSegments.find(
        (s) =>
          s.segment_id === rawSeg ||
          s.external_ref === rawSeg ||
          s.segment_name === rawSeg
      )
      if (matchedByCodeOrName?.segment_id) return matchedByCodeOrName.segment_id
      const matchCode = rawSeg.match(/SEG-[A-Za-z0-9_-]+/i)
      if (matchCode) return matchCode[0].toUpperCase()
    }
    const firstReportedPoleId = effectivePoleGpsLocations[0]?.pole_id
    if (firstReportedPoleId) {
      const foundPole =
        poles.find((p) => p.pole_id === firstReportedPoleId) ||
        allAssetPoles.find((p) => p.pole_id === firstReportedPoleId)
      if (foundPole?.segment_id) return foundPole.segment_id
    }
    return ''
  }, [
    isTargetDetail,
    workOrderDetail?.segment_id,
    phase?.segmentId,
    caseItem?.segment,
    allSegments,
    effectivePoleGpsLocations,
    poles,
    allAssetPoles,
  ])

  const matchedSegment = useMemo(
    () => (targetSegmentId ? allSegments.find((s) => s.segment_id === targetSegmentId) || null : null),
    [allSegments, targetSegmentId]
  )

  // Cho phép Quản lý kéo thả tinh chỉnh tọa độ khi phiếu chưa đóng / chưa duyệt
  const canEditGps = Boolean(
    phase &&
      phase.status !== 'ended' &&
      phase.rawStatus !== 'verified' &&
      phase.rawStatus !== 'cancelled' &&
      (!isTargetDetail ||
        (workOrderDetail?.wo_status !== 'verified' && workOrderDetail?.wo_status !== 'cancelled'))
  )

  // Đường hình học cố định của tuyến (nếu tuyến đã có hình thật trên hệ thống)
  const roadPolylineCoords = useMemo<[number, number][]>(() => {
    if (
      targetSegmentId &&
      segmentDetail?.segmentId === targetSegmentId &&
      typeof segmentDetail.geomWkt === 'string' &&
      segmentDetail.geomWkt.trim().length > 0
    ) {
      return parseLineStringWkt(segmentDetail.geomWkt)
    }
    return []
  }, [targetSegmentId, segmentDetail])

  // Tổng hợp danh sách cột hiển thị trên bản đồ Popup Xem GIS (kết hợp cột trên tuyến & tọa độ đang tinh chỉnh)
  const previewMapPoles = useMemo<SegmentPoleItem[]>(() => {
    const mapByPoleId = new Map<string, SegmentPoleItem>()

    // 1. Lấy các cột đã có GPS trên cùng tuyến đường từ danh mục tài sản
    if (targetSegmentId) {
      allAssetPoles
        .filter(
          (p) =>
            p.segment_id === targetSegmentId &&
            p.pole_id &&
            p.location &&
            typeof p.location.lat === 'number' &&
            typeof p.location.lng === 'number' &&
            Number.isFinite(p.location.lat) &&
            Number.isFinite(p.location.lng)
        )
        .forEach((p) => {
          const pid = p.pole_id!
          mapByPoleId.set(pid, {
            id: pid,
            code: p.external_ref || pid,
            coord: [p.location.lng!, p.location.lat!],
            status: p.active_fixture ? 'normal' : 'unknown',
            atlas: p.active_fixture?.fixture_type,
          })
        })
    }

    // 2. Ghi đè bằng tọa độ kỹ sư gửi lên (hoặc tọa độ tạm Quản lý đang kéo thả; nếu phiếu đã duyệt thì ưu tiên tọa độ GIS thực tế của cột)
    effectivePoleGpsLocations.forEach((g) => {
      if (!g.pole_id) return
      const draft = draftPoleCoords[g.pole_id]
      const verifiedPoleLoc = !canEditGps
        ? poles.find((p) => p.pole_id === g.pole_id)?.location ||
          allAssetPoles.find((p) => p.pole_id === g.pole_id)?.location
        : undefined
      const lat =
        typeof draft?.lat === 'number'
          ? draft.lat
          : typeof verifiedPoleLoc?.lat === 'number' && Number.isFinite(verifiedPoleLoc.lat)
          ? verifiedPoleLoc.lat
          : g.lat
      const lng =
        typeof draft?.lng === 'number'
          ? draft.lng
          : typeof verifiedPoleLoc?.lng === 'number' && Number.isFinite(verifiedPoleLoc.lng)
          ? verifiedPoleLoc.lng
          : g.lng
      if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
        const existing = mapByPoleId.get(g.pole_id)
        mapByPoleId.set(g.pole_id, {
          id: g.pole_id,
          code: existing?.code || g.pole_id,
          coord: [lng, lat],
          status: existing?.status || 'normal',
          atlas: existing?.atlas,
        })
      }
    })

    return Array.from(mapByPoleId.values()).sort((a, b) =>
      (a.code || a.id).localeCompare(b.code || b.id, undefined, { numeric: true })
    )
  }, [targetSegmentId, allAssetPoles, effectivePoleGpsLocations, draftPoleCoords, canEditGps, poles])

  // Kiểm tra các quy tắc Validate của Backend (Tiếng Việt ngắn gọn) theo thời gian thực khi Quản lý kéo thả
  const poleValidations = useMemo(() => {
    const result: Record<
      string,
      {
        isModified: boolean
        movedMeters: number
        distToRoadMeters: number | null
        errorVn: string | null
      }
    > = {}

    const hasFixedRoadGeometry = Boolean(matchedSegment?.has_geometry && roadPolylineCoords.length >= 2)

    effectivePoleGpsLocations.forEach((g) => {
      const pid = g.pole_id
      if (!pid) return
      const draft = draftPoleCoords[pid]
      const curLat = typeof draft?.lat === 'number' ? draft.lat : g.lat
      const curLng = typeof draft?.lng === 'number' ? draft.lng : g.lng

      const isModified = Boolean(
        draft &&
          typeof draft.lat === 'number' &&
          typeof draft.lng === 'number' &&
          typeof g.lat === 'number' &&
          typeof g.lng === 'number' &&
          (Math.abs(draft.lat - g.lat) > 0.0000005 || Math.abs(draft.lng - g.lng) > 0.0000005)
      )

      const movedMeters =
        typeof g.lat === 'number' &&
        typeof g.lng === 'number' &&
        typeof curLat === 'number' &&
        typeof curLng === 'number'
          ? calculateDistanceMeters([g.lng, g.lat], [curLng, curLat])
          : 0

      let distToRoadMeters: number | null = null
      let errorVn: string | null = null

      if (
        typeof curLat !== 'number' ||
        typeof curLng !== 'number' ||
        !Number.isFinite(curLat) ||
        !Number.isFinite(curLng) ||
        curLat < -90 ||
        curLat > 90 ||
        curLng < -180 ||
        curLng > 180
      ) {
        errorVn = `Cột ${pid}: tọa độ không hợp lệ`
      } else {
        if (hasFixedRoadGeometry) {
          const snap = snapPointToPolyline([curLng, curLat], roadPolylineCoords)
          distToRoadMeters = snap.distMeters
          if (distToRoadMeters > BACKEND_CORRIDOR_LIMIT_M) {
            errorVn = `Cột ${pid} cách tuyến ${distToRoadMeters.toLocaleString('vi-VN', {
              maximumFractionDigits: 1,
            })} m — vượt quá giới hạn ${BACKEND_CORRIDOR_LIMIT_M} m`
          }
        }

        // Kiểm tra trùng vị trí với cột khác trên tuyến (< 0.5m)
        if (!errorVn) {
          const collidingPole = previewMapPoles.find(
            (other) =>
              other.id !== pid &&
              calculateDistanceMeters([curLng, curLat], other.coord) < 0.5
          )
          if (collidingPole) {
            errorVn = `Cột ${pid} trùng vị trí với cột ${collidingPole.code || collidingPole.id}`
          }
        }
      }

      result[pid] = {
        isModified,
        movedMeters,
        distToRoadMeters,
        errorVn,
      }
    })

    return result
  }, [effectivePoleGpsLocations, draftPoleCoords, matchedSegment?.has_geometry, roadPolylineCoords, previewMapPoles])

  // Dựng đường nối lộ trình cho bản đồ Popup Xem GIS (Luôn luôn nối thẳng đường tuyến vào mọi điểm cột được cập nhật và chạy theo khi kéo thả)
  const previewRouteInfo = useMemo(() => {
    const previousPoles: OrderedPole[] = targetSegmentId
      ? orderedPolesOfSegment(allAssetPoles, targetSegmentId)
      : []

    // Nếu tuyến đã có đường hình học (roadPolylineCoords >= 2 đỉnh), gắn các đỉnh hiện có và nối trực tiếp mọi cột cập nhật vào tuyến
    if (roadPolylineCoords.length >= 2) {
      interface RouteNode {
        id?: string
        coord: [number, number]
      }

      // 1. Khởi tạo các đỉnh từ đường tuyến gốc; đỉnh nào trùng vị trí cũ của cột thì gắn poleId của cột đó
      const usedPrevIds = new Set<string>()
      let nodes: RouteNode[] = roadPolylineCoords.map((vertex) => {
        const matchedPrev = previousPoles.find(
          (p) =>
            !usedPrevIds.has(p.id) &&
            calculateDistanceMeters(p.coord, vertex) <= VERTEX_MATCH_METERS
        )
        if (matchedPrev) {
          usedPrevIds.add(matchedPrev.id)
          return { id: matchedPrev.id, coord: vertex }
        }
        return { coord: vertex }
      })

      // 2. Với mỗi cột hiển thị (đặc biệt là cột kỹ sư gửi lên / Quản lý đang kéo), cập nhật hoặc chèn thẳng vào đường tuyến
      previewMapPoles.forEach((pole) => {
        const existingIdx = nodes.findIndex((n) => n.id === pole.id)
        if (existingIdx !== -1) {
          // Gỡ đỉnh cũ của cột này ra để đặt lại theo vị trí mới (nếu kéo sang đoạn khác thì thứ tự trên tuyến tự đổi theo)
          nodes = nodes.filter((_, idx) => idx !== existingIdx)
        }

        if (nodes.length === 0) {
          nodes = [{ id: pole.id, coord: pole.coord }]
          return
        }
        if (nodes.length === 1) {
          nodes = [...nodes, { id: pole.id, coord: pole.coord }]
          return
        }

        // Tìm đoạn thẳng gần nhất trên tuyến để nối điểm cột vào (đầu tuyến, cuối tuyến, hoặc chèn vào giữa tuyến)
        let bestIdx = 0
        let bestT = 0
        let bestDist = Infinity
        for (let i = 0; i < nodes.length - 1; i++) {
          const proj = projectPointOnSegment(pole.coord, nodes[i].coord, nodes[i + 1].coord)
          if (proj.dist < bestDist) {
            bestDist = proj.dist
            bestIdx = i
            bestT = proj.t
          }
        }

        const lastEdgeIdx = nodes.length - 2
        if (bestIdx === 0 && bestT <= 0) {
          nodes = [{ id: pole.id, coord: pole.coord }, ...nodes]
        } else if (bestIdx === lastEdgeIdx && bestT >= 1) {
          nodes = [...nodes, { id: pole.id, coord: pole.coord }]
        } else {
          nodes = [
            ...nodes.slice(0, bestIdx + 1),
            { id: pole.id, coord: pole.coord },
            ...nodes.slice(bestIdx + 1),
          ]
        }
      })

      const coords = nodes.map((n) => n.coord)
      if (coords.length >= 2) {
        return {
          initialStart: coords[0],
          initialEnd: coords[coords.length - 1],
          initialCoords: coords,
        }
      }
    }

    // Nếu tuyến chưa có đường hình học sẵn, tự động sắp chuỗi và nối tất cả các cột hiện có trên bản đồ
    if (previewMapPoles.length >= 2) {
      const ordered = orderPolesByChain(
        previewMapPoles.map((p) => ({ id: p.id, coord: p.coord }))
      )
      const coords = ordered.map((item) => item.coord)
      return {
        initialStart: coords[0],
        initialEnd: coords[coords.length - 1],
        initialCoords: coords,
      }
    }

    return extractSegmentCoordinates(matchedSegment || {}, previewMapPoles)
  }, [
    targetSegmentId,
    allAssetPoles,
    roadPolylineCoords,
    previewMapPoles,
    matchedSegment,
  ])

  const editablePoleIds = useMemo(
    () =>
      effectivePoleGpsLocations
        .map((g) => g.pole_id)
        .filter((id): id is string => Boolean(id)),
    [effectivePoleGpsLocations]
  )

  const invalidPoleIds = useMemo(
    () => Object.entries(poleValidations).filter(([, v]) => Boolean(v.errorVn)).map(([id]) => id),
    [poleValidations]
  )

  const validationErrorMessages = useMemo(
    () =>
      Object.values(poleValidations)
        .map((v) => v.errorVn)
        .filter((msg): msg is string => Boolean(msg)),
    [poleValidations]
  )

  const handleOpenGisPreview = useCallback(() => {
    if (allSegments.length === 0 || allAssetPoles.length === 0) {
      dispatch(fetchAssetsRequest())
    }
    if (targetSegmentId && segmentDetail?.segmentId !== targetSegmentId) {
      dispatch(fetchSegmentDetailRequest(targetSegmentId))
    }
    setDraftPoleCoords({ ...savedEditedGps })
    setIsGisPreviewOpen(true)
    if (onPreviewGis && caseItem) {
      onPreviewGis({
        code: caseItem.code,
        segment: caseItem.segment,
        poles: effectivePoleGpsLocations,
      })
    }
  }, [
    allSegments.length,
    allAssetPoles.length,
    dispatch,
    targetSegmentId,
    segmentDetail?.segmentId,
    savedEditedGps,
    onPreviewGis,
    caseItem,
    effectivePoleGpsLocations,
  ])

  const handleDraftPoleDrag = useCallback(
    (poleId: string, newLng: number, newLat: number) => {
      if (!canEditGps) return
      const original = effectivePoleGpsLocations.find((g) => g.pole_id === poleId)
      setDraftPoleCoords((prev) => {
        if (
          original &&
          typeof original.lat === 'number' &&
          typeof original.lng === 'number' &&
          Math.abs(original.lat - newLat) <= 0.0000005 &&
          Math.abs(original.lng - newLng) <= 0.0000005
        ) {
          const next = { ...prev }
          delete next[poleId]
          return next
        }
        return {
          ...prev,
          [poleId]: { lat: newLat, lng: newLng },
        }
      })
    },
    [canEditGps, effectivePoleGpsLocations]
  )

  const handleRestoreSinglePoleDraft = useCallback((poleId: string) => {
    setDraftPoleCoords((prev) => {
      const next = { ...prev }
      delete next[poleId]
      return next
    })
  }, [])

  const handleSaveDraftGps = useCallback(() => {
    if (!targetWorkOrderId) return
    if (invalidPoleIds.length > 0) {
      toast.error('Còn vị trí cột đèn vi phạm quy tắc hành lang tuyến đường. Vui lòng kéo chỉnh lại trước khi lưu!')
      return
    }
    dispatch(
      saveEditedGpsLocations({
        workOrderId: targetWorkOrderId,
        locations: draftPoleCoords,
      })
    )
    const editedCount = Object.keys(draftPoleCoords).length
    if (editedCount > 0) {
      toast.success(
        `Đã lưu tạm tọa độ tinh chỉnh của ${editedCount} cột. Khi bấm "Duyệt & Import GIS", tọa độ này sẽ được cập nhật lên Bản đồ GIS thật!`
      )
    } else {
      toast.info('Đã khôi phục toàn bộ tọa độ về dữ liệu gốc của Kỹ sư hiện trường.')
    }
    setIsGisPreviewOpen(false)
  }, [targetWorkOrderId, invalidPoleIds.length, dispatch, draftPoleCoords])

  // Tải ảnh bằng chứng nghiệm thu và danh sách cột từ Backend nếu có mã lệnh công tác
  useEffect(() => {
    if (isOpen && targetWorkOrderId) {
      let cancelled = false
      setSelectedVideoIndex(0)
      workScheduleAPI
        .getAllWorkOrderEvidence(targetWorkOrderId)
        .then((items) => {
          if (!cancelled) {
            setBackendEvidence(items)
          }
        })
        .catch(() => {
          if (!cancelled) setBackendEvidence([])
        })

      workScheduleAPI
        .getWorkOrderPoles(targetWorkOrderId)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setPoles(res.items)
          } else {
            setPoles([])
          }
        })
        .catch(() => setPoles([]))

      // Tải danh sách ảnh chụp từng cột đèn khảo sát thực tế từ Kỹ sư Mobile
      workScheduleAPI
        .getWorkOrderPolePhotos(targetWorkOrderId)
        .then((res) => {
          if (cancelled) return
          const items = res.items || []
          setPolePhotos(items)
          if (phase?.phaseType === 'survey') {
            const hasClip = items.some((p) => Boolean(p.video && p.photo_id))
            setActiveTab(hasClip ? 'video' : items.length > 0 ? 'photos' : 'video')
          }
        })
        .catch(() => {
          if (!cancelled) setPolePhotos([])
        })

      return () => {
        cancelled = true
      }
    }
  }, [isOpen, targetWorkOrderId, phase?.phaseType])

  // Mỗi lần mở một giai đoạn mới thì quay về tab ảnh bằng chứng
  useEffect(() => {
    if (isOpen && phase) {
      if (phase.phaseType === 'survey') {
        setActiveTab('video')
      } else if (phase.phaseType === 'pole_gps_update') {
        setActiveTab('gps')
      } else {
        setActiveTab('photos')
      }
    }
  }, [isOpen, phase?.phaseType])

  if (!isOpen || !caseItem || !phase) return null

  const report = phase.report

  // Trích xuất dữ liệu báo cáo thực tế từ workOrderDetail nếu khớp lệnh
  const effectiveReportNote =
    (isTargetDetail && workOrderDetail?.report_note) ||
    report?.summary ||
    'Báo cáo kỹ thuật hiện trường'
  const effectiveSubmittedAt =
    (isTargetDetail && workOrderDetail?.completed_at)
      ? new Date(workOrderDetail.completed_at).toLocaleString('vi-VN')
      : report?.submittedAt
  const effectiveSuggestedMaterials =
    (isTargetDetail && workOrderDetail?.materials_note) ||
    report?.suggestedMaterialsNote
  const effectiveUsedMaterials =
    (isTargetDetail && workOrderDetail?.materials_used) ||
    report?.usedMaterialsNote

  // Phân loại báo cáo IoT (không tuyến, không cột) để hiển thị đúng Mạch & Node thay vì Cột đèn
  const normalizedSeg = (caseItem.segment || '').trim()
  const hasSegment = Boolean(
    normalizedSeg && normalizedSeg !== '-' && normalizedSeg !== '—'
  )
  const detailFaults = isTargetDetail && workOrderDetail?.faults ? workOrderDetail.faults : []
  const iotFaults = detailFaults.filter((f) => !f.pole_id && !f.segment_id)
  const iotCabinets = Array.from(
    new Set(
      iotFaults
        .map((f) => f.cabinet_id)
        .filter((v): v is string => Boolean(v))
    )
  )
  const isIotReport =
    phase.phaseType !== 'survey' &&
    phase.phaseType !== 'pole_gps_update' &&
    !hasSegment &&
    poles.length === 0 &&
    polePhotos.length === 0

  // Lọc các cột đèn có cảnh báo / bất thường
  const abnormalPoles = poles.filter(
    (p) =>
      (p.fixture_status && p.fixture_status !== 'normal' && p.fixture_status !== 'unknown') ||
      (p.open_fault_count && p.open_fault_count > 0)
  )

  // Danh sách hình ảnh bằng chứng thực địa từ Backend
  const displayPhotos = backendEvidence.map((ev, idx) => ({
    evidenceId: ev.evidence_id,
    src:
      ev.original_url ||
      ev.thumbnail_url ||
      workScheduleAPI.getEvidenceImageUrl(ev.evidence_id || '', 'original'),
    title: `Ảnh ${idx + 1}: ${
      ev.kind === 'before'
        ? 'Trước sửa chữa'
        : ev.kind === 'after'
        ? 'Sau sửa chữa'
        : 'Hiện trường'
    }`,
    desc: `Thời điểm ghi nhận: ${ev.captured_at ? new Date(ev.captured_at).toLocaleString('vi-VN') : ev.uploaded_at || 'Đã ghi nhận'}`,
    tag: ev.kind === 'before' ? 'Trước sửa' : ev.kind === 'after' ? 'Sau sửa' : 'Hiện trường',
  }))

  // Danh sách clip video thực địa theo từng cột đèn từ Backend
  const poleVideos = polePhotos.filter((p) => Boolean(p.video && p.photo_id))
  const selectedVideoPhoto = poleVideos[selectedVideoIndex] || poleVideos[0] || null

  // Tổng số ảnh thực tế hiển thị trong Tab 2 theo đúng giai đoạn
  const photoCount = phase.phaseType === 'survey' ? polePhotos.length : displayPhotos.length

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-black bg-blue-100 text-blue-800">
                  {caseItem.code}
                </span>
                <span className="text-slate-300">•</span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Báo Cáo Hiện Trường Thực Địa: {phase.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                {hasSegment
                  ? formatSegmentDisplay(caseItem.segment)
                  : iotCabinets.length > 0
                    ? `Tủ ${iotCabinets.join(', ')}`
                    : caseItem.title || '-'}{' '}
                — Nộp bởi: <strong>{phase.assigneeName}</strong> lúc {effectiveSubmittedAt || 'Đang cập nhật'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
          {phase.phaseType === 'pole_gps_update' ? (
            <button
              type="button"
              onClick={() => setActiveTab('gps')}
              className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'gps'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Tọa Độ GPS &amp; Ảnh Từng Cột ({effectivePoleGpsLocations.length})</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'video'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'survey'
                    ? `Video Quét Thực Địa (${poleVideos.length})`
                    : `Video Tuyến (${poleVideos.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'photos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'repair'
                    ? `Ảnh Trước & Sau Sửa Chữa (${photoCount})`
                    : phase.phaseType === 'inspection'
                    ? `Ảnh Hiện Trường & Đo Đạc (${photoCount})`
                    : `Ảnh Chụp Bằng Chứng (${photoCount})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeTab === 'ai'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>
                  {phase.phaseType === 'survey'
                    ? 'Kết Quả Khảo Sát & Đánh Giá Kỹ Thuật'
                    : phase.phaseType === 'inspection'
                    ? 'Chẩn Đoán Lỗi & Đề Xuất Vật Tư'
                    : 'Nghiệm Thu Kỹ Thuật & Vật Tư'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar bg-slate-50/50">
          {/* TAB GPS (DÀNH RIÊNG CHO CẬP NHẬT VỊ TRÍ CỘT) */}
          {activeTab === 'gps' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-violet-50/70 border border-violet-200">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-xs font-extrabold text-violet-950 mb-1">
                    Ghi chú báo cáo từ kỹ sư:
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                    {effectiveReportNote}
                  </p>
                  {Object.keys(savedEditedGps).length > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-300 text-[11px] font-bold text-amber-900">
                      <span>
                        ✏️ Đã lưu tạm tọa độ tinh chỉnh cho {Object.keys(savedEditedGps).length} cột (chỉ cập nhật lên GIS thật khi bấm Duyệt &amp; Import GIS)
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenGisPreview}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Xem GIS</span>
                  {Object.keys(savedEditedGps).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      {Object.keys(savedEditedGps).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase">
                      <th className="py-2.5 px-3 font-extrabold">Mã cột</th>
                      <th className="py-2.5 px-3 font-extrabold">Ảnh chụp</th>
                      <th className="py-2.5 px-3 font-extrabold">Vĩ độ (Lat)</th>
                      <th className="py-2.5 px-3 font-extrabold">Kinh độ (Lng)</th>
                      <th className="py-2.5 px-3 font-extrabold">Thời gian ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {effectivePoleGpsLocations.length > 0 ? (
                      effectivePoleGpsLocations.map((g, idx) => {
                        const evidenceMatches = g.pole_id
                          ? backendEvidence.filter((ev) => ev.pole_id === g.pole_id)
                          : []
                        const matchedEvidence =
                          evidenceMatches.length > 0
                            ? evidenceMatches[evidenceMatches.length - 1]
                            : undefined
                        const savedEdit = g.pole_id ? savedEditedGps[g.pole_id] : undefined
                        const isSavedModified = Boolean(
                          savedEdit &&
                            typeof savedEdit.lat === 'number' &&
                            typeof savedEdit.lng === 'number'
                        )
                        const verifiedAssetLoc =
                          !canEditGps && g.pole_id
                            ? poles.find((p) => p.pole_id === g.pole_id)?.location ||
                              allAssetPoles.find((p) => p.pole_id === g.pole_id)?.location
                            : undefined
                        const isVerifiedModified = Boolean(
                          !isSavedModified &&
                            verifiedAssetLoc &&
                            typeof verifiedAssetLoc.lat === 'number' &&
                            typeof verifiedAssetLoc.lng === 'number' &&
                            g.lat != null &&
                            g.lng != null &&
                            (Math.abs(verifiedAssetLoc.lat - g.lat) > 0.000001 ||
                              Math.abs(verifiedAssetLoc.lng - g.lng) > 0.000001)
                        )
                        const subLat = isSavedModified
                          ? savedEdit?.lat
                          : isVerifiedModified
                          ? verifiedAssetLoc?.lat
                          : undefined
                        const subLng = isSavedModified
                          ? savedEdit?.lng
                          : isVerifiedModified
                          ? verifiedAssetLoc?.lng
                          : undefined

                        return (
                          <tr
                            key={g.pole_id || idx}
                            className={
                              isSavedModified
                                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                : 'hover:bg-violet-50/40'
                            }
                          >
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{g.pole_id || '-'}</span>
                                {isSavedModified && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-sans text-[10px] font-bold">
                                    Đã chỉnh tạm
                                  </span>
                                )}
                                {isVerifiedModified && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans text-[10px] font-bold">
                                    Đã chỉnh trên GIS
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {matchedEvidence?.evidence_id ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomImage({
                                      evidenceId: matchedEvidence.evidence_id,
                                      src:
                                        matchedEvidence.original_url ||
                                        matchedEvidence.thumbnail_url ||
                                        workScheduleAPI.getEvidenceImageUrl(
                                          matchedEvidence.evidence_id || '',
                                          'original'
                                        ),
                                      title: `Cột ${g.pole_id || ''}`,
                                    })
                                  }
                                  title="Bấm để phóng to ảnh"
                                  className="relative w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 group cursor-pointer block shadow-2xs"
                                >
                                  <EvidenceImage
                                    evidenceId={matchedEvidence.evidence_id}
                                    fallbackSrc={
                                      matchedEvidence.thumbnail_url ||
                                      matchedEvidence.original_url ||
                                      workScheduleAPI.getEvidenceImageUrl(
                                        matchedEvidence.evidence_id,
                                        'thumbnail'
                                      )
                                    }
                                    alt={`Ảnh cột ${g.pole_id || ''}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Chưa có ảnh
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              <div>{g.lat != null ? g.lat.toFixed(6) : '-'}</div>
                              {subLat != null && (
                                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10.5px] font-extrabold text-indigo-700">
                                  <span>
                                    {isSavedModified ? 'Đã chỉnh:' : 'GIS:'} {subLat.toFixed(6)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              <div>{g.lng != null ? g.lng.toFixed(6) : '-'}</div>
                              {subLng != null && (
                                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10.5px] font-extrabold text-indigo-700">
                                  <span>
                                    {isSavedModified ? 'Đã chỉnh:' : 'GIS:'} {subLng.toFixed(6)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  {g.captured_at
                                    ? new Date(g.captured_at).toLocaleString('vi-VN')
                                    : '-'}
                                </span>
                                {isSavedModified && g.pole_id && canEditGps && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!targetWorkOrderId || !g.pole_id) return
                                      const next = { ...savedEditedGps }
                                      delete next[g.pole_id]
                                      dispatch(
                                        saveEditedGpsLocations({
                                          workOrderId: targetWorkOrderId,
                                          locations: next,
                                        })
                                      )
                                      toast.info(`Đã khôi phục tọa độ gốc của kỹ sư cho cột ${g.pole_id}.`)
                                    }}
                                    className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                    title="Khôi phục về tọa độ gốc của kỹ sư"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Gốc</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Chưa có dữ liệu tọa độ GPS chi tiết cho từng cột.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 1: VIDEO KHẢO SÁT THỰC ĐỊA */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {poleVideos.length > 0 && selectedVideoPhoto && targetWorkOrderId ? (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-xl border border-slate-800">
                    <PoleVideoPlayer
                      workOrderId={targetWorkOrderId}
                      photoId={selectedVideoPhoto.photo_id}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>

                  {/* Thông số thực tế và báo cáo của kỹ sư trên clip đang phát */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-900 text-white">
                        {selectedVideoPhoto.pole_id || 'Cột đèn'}
                      </span>
                      <span className="text-slate-600 font-medium">
                        Thời lượng: <strong>{formatDurationMs(selectedVideoPhoto.video?.duration_ms)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">
                        Dung lượng: <strong>{formatByteCount(selectedVideoPhoto.video?.byte_count)}</strong>
                      </span>
                      {(() => {
                        const effectiveState = selectedVideoPhoto.final_cv_state || selectedVideoPhoto.cv_state
                        const isOut = effectiveState === 'off'
                        const isNormal = effectiveState === 'on'
                        return (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium">
                              Báo cáo kỹ sư:{' '}
                              <strong
                                className={
                                  isOut
                                    ? 'text-rose-700'
                                    : isNormal
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }
                              >
                                {isOut ? 'Mất sáng (Cần kiểm tra)' : isNormal ? 'Đèn sáng bình thường' : 'Chưa chốt trạng thái'}
                              </strong>
                            </span>
                          </>
                        )
                      })()}
                      {selectedVideoPhoto.video?.hdr && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          HDR
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedVideoPhoto.captured_at && (
                        <span className="text-[11px] text-slate-500">
                          Quay lúc: {new Date(selectedVideoPhoto.captured_at).toLocaleString('vi-VN')}
                        </span>
                      )}
                      {selectedVideoPhoto.decision === 'confirm' ? (
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ✓ Đã xác nhận
                        </span>
                      ) : selectedVideoPhoto.decision === 'reject' ? (
                        <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          ✕ Đã từ chối
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={decidingPhotoId === selectedVideoPhoto.photo_id}
                            onClick={() => handleDecidePolePhoto(selectedVideoPhoto.photo_id, 'confirm')}
                            className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                          >
                            ✓ Xác nhận clip
                          </button>
                          <button
                            type="button"
                            disabled={decidingPhotoId === selectedVideoPhoto.photo_id}
                            onClick={() => handleDecidePolePhoto(selectedVideoPhoto.photo_id, 'reject')}
                            className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Danh sách chọn video theo cột đèn (nếu có nhiều hơn 1 clip) */}
                  {poleVideos.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Danh sách video cột đèn ({poleVideos.length} clip)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {poleVideos.map((vp, idx) => {
                          const effectiveState = vp.final_cv_state || vp.cv_state
                          const isOut = effectiveState === 'off'
                          const isNormal = effectiveState === 'on'
                          const isSelected = idx === selectedVideoIndex

                          return (
                            <button
                              key={vp.photo_id || idx}
                              type="button"
                              onClick={() => setSelectedVideoIndex(idx)}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                                  : 'bg-white border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs text-slate-900 truncate">
                                  {vp.pole_id || `Clip #${idx + 1}`}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    isOut
                                      ? 'bg-rose-100 text-rose-800'
                                      : isNormal
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isOut ? 'LỖI' : isNormal ? 'ĐẠT' : 'CHƯA RÕ'}
                                </span>
                              </div>
                              <span className="text-[10.5px] text-slate-500 font-mono">
                                {formatDurationMs(vp.video?.duration_ms)} • {formatByteCount(vp.video?.byte_count)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                  <Video className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Chưa có video thực địa được tải lên</span>
                  <span className="text-[11px] text-slate-500 max-w-md">
                    Kỹ sư hiện trường chưa tải lên clip video nào cho lệnh công tác này. Sau khi kỹ sư đồng bộ video từ ứng dụng di động, video sẽ xuất hiện tại đây.
                  </span>
                </div>
              )}

              {/* Thông tin mô tả video & báo cáo kỹ sư */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Ghi Nhận Báo Cáo Khảo Sát Thực Địa
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {effectiveReportNote}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ẢNH CHỤP BẰNG CHỨNG HIỆN TRƯỜNG */}
          {activeTab === 'photos' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Trường hợp 1: Giai đoạn Khảo sát (Survey) - Hiển thị ảnh chụp từng cột đèn từ Mobile */}
              {phase.phaseType === 'survey' ? (
                polePhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {polePhotos.map((photo, idx) => {
                      const effectiveState = photo.final_cv_state || photo.cv_state
                      const isOut = effectiveState === 'off'
                      const isNormal = effectiveState === 'on'
                      const isConfirmed = photo.decision === 'confirm'
                      const isRejected = photo.decision === 'reject'

                      return (
                        <div
                          key={photo.photo_id || idx}
                          onClick={() =>
                            setZoomImage({
                              polePhotoId: photo.photo_id,
                              workOrderId: targetWorkOrderId,
                              src: photo.original_url || photo.thumbnail_url || undefined,
                              title: `Cột ${photo.pole_id || ''}`,
                            })
                          }
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group flex flex-col"
                        >
                          <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                            <PolePhotoImage
                              workOrderId={targetWorkOrderId}
                              photoId={photo.photo_id}
                              fallbackSrc={photo.original_url || photo.thumbnail_url || undefined}
                              alt={`Cột ${photo.pole_id || ''}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Badge trạng thái phát hiện của đèn */}
                            <span
                              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md shadow-xs border ${
                                isOut
                                  ? 'bg-rose-600/90 text-white border-rose-400/30'
                                  : isNormal
                                  ? 'bg-emerald-600/90 text-white border-emerald-400/30'
                                  : 'bg-amber-600/90 text-white border-amber-400/30'
                              }`}
                            >
                              {isOut ? 'MẤT SÁNG (LỖI)' : isNormal ? 'ĐẠT CHUẨN' : 'CHƯA RÕ'}
                            </span>

                            {/* Mã cột & nhãn có video */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/80 backdrop-blur-md text-white border border-blue-400/20">
                                {photo.pole_id || `Cột #${idx + 1}`}
                              </span>
                              {photo.video && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/30 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> Video
                                </span>
                              )}
                            </div>

                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg">
                                <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-between text-xs">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  Cột {photo.pole_id || 'Chưa định danh'}
                                </span>
                                {isConfirmed ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ Đã xác nhận
                                  </span>
                                ) : isRejected ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    ✕ Đã từ chối
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Chờ duyệt ca
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Chụp lúc: {photo.captured_at ? new Date(photo.captured_at).toLocaleString('vi-VN') : '-'}
                              </p>
                              {photo.review_note && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1 line-clamp-2">
                                  <strong>Ghi chú:</strong> {photo.review_note}
                                </p>
                              )}
                              {!photo.decision && (
                                <div
                                  className="flex items-center gap-1.5 mt-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={decidingPhotoId === photo.photo_id}
                                    onClick={() => handleDecidePolePhoto(photo.photo_id, 'confirm')}
                                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition cursor-pointer disabled:opacity-50"
                                  >
                                    ✓ Xác nhận
                                  </button>
                                  <button
                                    type="button"
                                    disabled={decidingPhotoId === photo.photo_id}
                                    onClick={() => handleDecidePolePhoto(photo.photo_id, 'reject')}
                                    className="py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10.5px] transition cursor-pointer disabled:opacity-50"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                              <span>
                                Đánh giá:{' '}
                                <strong className="text-slate-700">
                                  {isOut
                                    ? 'Mất sáng'
                                    : isNormal
                                    ? 'Đèn sáng'
                                    : 'Chưa chốt kết luận'}
                                </strong>
                              </span>
                              {photo.lat && photo.lng && (
                                <span className="font-mono text-slate-400">
                                  GPS: {photo.lat.toFixed(4)}, {photo.lng.toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Chưa có ảnh khảo sát cột đèn</span>
                    <span className="text-[11px] text-slate-500 max-w-md">
                      Kỹ sư hiện trường chưa tải lên ảnh chụp cột đèn nào cho lệnh khảo sát này. Sau khi kỹ sư hoàn tất trên ứng dụng di động, ảnh sẽ xuất hiện tại đây.
                    </span>
                  </div>
                )
              ) : (
                /* Trường hợp 2: Giai đoạn Kiểm tra / Sửa chữa - Hiển thị ảnh Before/After/Observation */
                displayPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {displayPhotos.map((photo, idx) => (
                      <div
                        key={idx}
                        onClick={() => setZoomImage({ evidenceId: photo.evidenceId, src: photo.src })}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group flex flex-col"
                      >
                        <div className="relative aspect-4/3 overflow-hidden bg-slate-950">
                          <EvidenceImage
                            evidenceId={photo.evidenceId}
                            fallbackSrc={photo.src}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                            {photo.tag}
                          </span>
                          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg">
                              <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col gap-1 flex-1 justify-between">
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                            {photo.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {photo.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Chưa có ảnh bằng chứng được tải lên</span>
                    <span className="text-[11px] text-slate-500">
                      Kỹ sư hiện trường chưa đính kèm ảnh trước / sau tác nghiệp cho lệnh này.
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: KẾT QUẢ KHẢO SÁT & ĐÁNH GIÁ KỸ THUẬT */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Thẻ danh sách cột đèn hoặc Mạch & Node IoT kỹ sư hiện trường ghi nhận */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    {isIotReport ? (
                      <>
                        <Cpu className="w-4 h-4 text-indigo-600" />
                        Danh Sách Mạch (Feeder) &amp; Node IoT Ghi Nhận Từ Kỹ Sư Hiện Trường
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-blue-600" />
                        Danh Sách Cột Đèn Ghi Nhận Từ Kỹ Sư Hiện Trường
                      </>
                    )}
                  </h4>
                </div>

                {/* Nhánh riêng cho phiếu IoT: hiển thị Tủ, Mạch, Node & kết quả kiểm tra */}
                {isIotReport ? (
                  iotFaults.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {iotFaults.map((f, idx) => {
                        const outcome = f.inspection_outcome
                        const outcomeBadge =
                          outcome === 'fault_present'
                            ? { label: 'Xác nhận có sự cố', cls: 'bg-rose-100 text-rose-800 border-rose-200' }
                            : outcome === 'fault_absent'
                            ? { label: 'Thiết bị bình thường', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                            : outcome === 'inconclusive'
                            ? { label: 'Chưa kết luận', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
                            : { label: 'Đã tiếp nhận / xử lý', cls: 'bg-slate-100 text-slate-700 border-slate-200' }
                        const typeLabel =
                          (f.fault_type && FAULT_TYPE_LABELS_VN[f.fault_type]) || f.fault_type || '-'

                        return (
                          <div
                            key={f.fault_id || idx}
                            className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-wrap items-start justify-between gap-2.5 text-xs"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{f.fault_id || '-'}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                                  {typeLabel}
                                </span>
                                {f.iot_anomaly_code && (
                                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {iotAnomalyLabel(f.iot_anomaly_code)}
                                  </span>
                                )}
                                {f.recovered_at && (
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    title={`Tự phục hồi lúc ${new Date(f.recovered_at).toLocaleString('vi-VN')}`}
                                  >
                                    Đã tự phục hồi
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono text-indigo-800">
                                <span>Tủ: {f.cabinet_id || '-'}</span>
                                <span>Mạch: {f.feeder_id || '-'}</span>
                                <span>Node: {f.origin_node_id || '-'}</span>
                              </div>
                              {f.location?.lat != null && f.location?.lng != null && (
                                <div className="text-[10.5px] font-mono text-slate-500">
                                  GPS tủ: {f.location.lat.toFixed(6)}, {f.location.lng.toFixed(6)}
                                </div>
                              )}
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${outcomeBadge.cls}`}>
                              {outcomeBadge.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Chưa có dữ liệu thiết bị IoT (Mạch / Node) gắn với lệnh công tác này.
                    </div>
                  )
                ) : phase.phaseType === 'survey' && polePhotos.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {polePhotos.map((photo, idx) => {
                      const effectiveState = photo.final_cv_state || photo.cv_state
                      const isOut = effectiveState === 'off'
                      const isNormal = effectiveState === 'on'

                      return (
                        <div
                          key={photo.photo_id || idx}
                          className={`p-3 rounded-xl border flex items-start gap-3 ${
                            isOut
                              ? 'bg-rose-50/70 border-rose-200'
                              : isNormal
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : 'bg-amber-50/70 border-amber-200'
                          }`}
                        >
                          <AlertTriangle
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isOut
                                ? 'text-rose-600'
                                : isNormal
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          />
                          <div className="flex flex-col gap-1 text-xs text-slate-900 flex-1">
                            <div className="font-extrabold text-sm flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-blue-700 font-bold">
                                {photo.pole_id || '-'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-800'
                                    : isNormal
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isOut
                                  ? 'Báo mất sáng (Cần kiểm tra)'
                                  : isNormal
                                  ? 'Đèn sáng bình thường'
                                  : 'Chưa chốt trạng thái (Cần yêu cầu làm lại)'}
                              </span>
                              {photo.decision === 'confirm' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  ✓ Đã duyệt nghiệm thu
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700 leading-relaxed">
                              {photo.review_note || 'Kỹ sư không đính kèm ghi chú riêng cho cột này.'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : abnormalPoles.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {abnormalPoles.map((p, idx) => (
                      <div
                        key={p.pole_id || idx}
                        className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1 text-xs text-amber-950 flex-1">
                          <div className="font-extrabold text-sm flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-blue-700 font-bold">{p.pole_id}</span>
                            <span>Trạng thái: {p.fixture_status || 'Cần kiểm tra'}</span>
                            {p.open_fault_count && p.open_fault_count > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                {p.open_fault_count} sự cố mở
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            {p.note || 'Chưa có ghi chú cho cột này.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : poles.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Tuyến <strong>{formatSegmentDisplay(caseItem.segment)}</strong> ({poles.length} cột): Không có cột đèn nào bị đánh dấu bất thường hoặc đang có sự cố mở.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    Tuyến: <strong>{formatSegmentDisplay(caseItem.segment)}</strong>. Chưa có dữ liệu cột đèn cho lệnh này.
                  </div>
                )}
              </div>

              {/* Báo cáo kỹ thuật thực tế của Kỹ sư */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Nội dung báo cáo hiện trường từ Kỹ sư ({phase.assigneeName})
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line">
                  {effectiveReportNote}
                </p>
              </div>

              {/* Thẻ đo đạc Luxmeter & Vật tư */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-600" />
                    Độ rọi mặt đường đo thực tế
                  </span>
                  {report?.luxMeasured ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600 font-mono">{report.luxMeasured}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">Chưa có số đo Lux thực tế</span>
                      <p className="text-[11px] text-slate-400">
                        Kỹ sư hiện trường chưa ghi nhận kết quả đo độ rọi mặt đường cho giai đoạn này.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    Vật tư đề xuất từ kỹ sư
                  </span>
                  <div className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {effectiveSuggestedMaterials || effectiveUsedMaterials || 'Kỹ sư không ghi nhận vật tư'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Thông tin đề xuất phục vụ lập kế hoạch cho các giai đoạn tiếp theo của sự vụ.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Bằng chứng gốc:</strong> Được tải lên trực tiếp từ thiết bị của Kỹ sư hiện trường (
              <strong>{phase.assigneeName}</strong>). Quản lý chỉ có quyền xem &amp; thẩm định, không được phép chỉnh sửa bằng chứng gốc.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            Đóng Báo Cáo
          </button>
        </div>
      </div>

      {/* Popup Bản Đồ Vệ Tinh Xem Trước & Kéo Thả Tinh Chỉnh Tọa Độ GIS (Dữ Liệu Tạm) */}
      {isGisPreviewOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsGisPreviewOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popup GIS */}
            <div className="px-6 py-4 bg-linear-to-r from-indigo-700 via-violet-700 to-indigo-800 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <MapIcon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-md font-bold">
                      {targetWorkOrderId || caseItem.code}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                      {canEditGps
                        ? 'Kéo thả ghim cột (✥) để tinh chỉnh tạm'
                        : 'Phiếu đã nghiệm thu — Chế độ chỉ xem'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base mt-0.5 truncate">
                    Xem &amp; Tinh chỉnh Tọa độ GIS:{' '}
                    {matchedSegment?.segment_name || formatSegmentDisplay(caseItem.segment)}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGisPreviewOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Đóng bản đồ xem trước"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body Popup GIS */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3.5 custom-scrollbar bg-slate-50/60">
              {/* Hướng dẫn & Thông số nhanh (Cố định chiều cao, không bao giờ co giãn) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs shrink-0">
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Tuyến đường:</span>
                  <span className="font-extrabold text-slate-900 truncate ml-2">
                    {matchedSegment?.external_ref || targetSegmentId || formatSegmentDisplay(caseItem.segment)}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Số cột kỹ sư gửi:</span>
                  <span className="font-extrabold text-indigo-700 font-mono">
                    {effectivePoleGpsLocations.length} cột
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Hành lang tuyến tối đa:</span>
                  <span className="font-extrabold text-emerald-700 font-mono">
                    {matchedSegment?.has_geometry && roadPolylineCoords.length >= 2
                      ? `≤ ${BACKEND_CORRIDOR_LIMIT_M} m quanh tuyến`
                      : 'Tuyến chưa có hình (tự nối cột)'}
                  </span>
                </div>
              </div>

              {/* Bản đồ vệ tinh tương tác (Cố định vị trí tuyệt đối để không bao giờ bị giật khung khi kéo thả) */}
              <div className="relative w-full h-[350px] shrink-0 rounded-2xl overflow-hidden border border-slate-300 shadow-xs bg-slate-900">
                <SegmentRouteMap
                  height="350px"
                  coordinates={previewRouteInfo.initialCoords}
                  startCoord={previewRouteInfo.initialStart}
                  endCoord={previewRouteInfo.initialEnd}
                  poles={previewMapPoles}
                  communeId={matchedSegment?.commune_id || workOrderDetail?.commune_id}
                  editablePoleIds={canEditGps ? editablePoleIds : []}
                  invalidPoleIds={invalidPoleIds}
                  onPoleLocationChange={handleDraftPoleDrag}
                />

                {/* Thanh trạng thái kiểm tra hành lang nổi gọn trên đáy bản đồ (pointer-events-none, không làm dịch chuyển khung bản đồ) */}
                <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-12 z-40 flex items-center">
                  {validationErrorMessages.length > 0 ? (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-600/95 text-white text-[11px] font-bold shadow-lg border border-rose-300/60 flex items-center gap-2 backdrop-blur-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                      <span className="truncate">{validationErrorMessages[0]}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-emerald-300 text-[11px] font-bold shadow-md border border-white/15 flex items-center gap-1.5 backdrop-blur-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {matchedSegment?.has_geometry && roadPolylineCoords.length >= 2
                          ? `Vị trí cột hợp lệ (cách tuyến ≤ ${BACKEND_CORRIDOR_LIMIT_M} m)`
                          : 'Kéo thả chấm cột tím (✥) để tinh chỉnh vị trí'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảng Tọa độ Thời gian thực (Cập nhật tức thì khi Quản lý kéo thả ghim trên bản đồ) */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs shrink-0">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-800">
                    Bảng tọa độ GPS theo thời gian thực khi kéo thả trên bản đồ
                  </span>
                  {canEditGps && Object.keys(draftPoleCoords).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftPoleCoords({})}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục tất cả về tọa độ gốc của kỹ sư</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10.5px] uppercase">
                        <th className="py-2 px-3 font-extrabold">Mã cột</th>
                        <th className="py-2 px-3 font-extrabold">Tọa độ Kỹ sư gửi (Gốc)</th>
                        <th className="py-2 px-3 font-extrabold">Tọa độ trên bản đồ (Hiện tại)</th>
                        <th className="py-2 px-3 font-extrabold">Độ lệch / Hành lang tuyến</th>
                        <th className="py-2 px-3 font-extrabold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {effectivePoleGpsLocations.map((g, idx) => {
                        const pid = g.pole_id || ''
                        const draft = pid ? draftPoleCoords[pid] : undefined
                        const curLat = typeof draft?.lat === 'number' ? draft.lat : g.lat
                        const curLng = typeof draft?.lng === 'number' ? draft.lng : g.lng
                        const valInfo = pid ? poleValidations[pid] : undefined
                        const isMod = Boolean(valInfo?.isModified)
                        const hasErr = Boolean(valInfo?.errorVn)

                        return (
                          <tr
                            key={pid || idx}
                            className={
                              hasErr
                                ? 'bg-rose-50/70'
                                : isMod
                                ? 'bg-amber-50/60'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="py-2 px-3 font-mono font-black text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{pid || '-'}</span>
                                {isMod && !hasErr && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-sans text-[10px] font-bold">
                                    Đã kéo chỉnh
                                  </span>
                                )}
                                {hasErr && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-sans text-[10px] font-bold">
                                    Ngoài hành lang
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {g.lat != null && g.lng != null
                                ? `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`
                                : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-extrabold text-indigo-700">
                              {curLat != null && curLng != null
                                ? `${curLat.toFixed(6)}, ${curLng.toFixed(6)}`
                                : '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-slate-700">
                                  Dời:{' '}
                                  <strong>
                                    {(valInfo?.movedMeters ?? 0).toLocaleString('vi-VN', {
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    m
                                  </strong>
                                </span>
                                {valInfo?.distToRoadMeters != null && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold ${
                                      valInfo.distToRoadMeters > BACKEND_CORRIDOR_LIMIT_M
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    Cách tuyến:{' '}
                                    {valInfo.distToRoadMeters.toLocaleString('vi-VN', {
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    m / {BACKEND_CORRIDOR_LIMIT_M} m
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {canEditGps && pid && isMod ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSinglePoleDraft(pid)}
                                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Khôi phục gốc</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Tọa độ gốc</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Popup GIS */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-600 max-w-xl leading-relaxed">
                💡 <strong>Lưu ý:</strong> Tọa độ điều chỉnh trên bản đồ này là <strong>dữ liệu tạm</strong>. Chỉ khi bạn bấm{' '}
                <strong className="text-indigo-700">Lưu tọa độ đã chỉnh</strong> và sau đó bấm{' '}
                <strong className="text-emerald-700">Duyệt &amp; Import GIS</strong> trên phiếu công tác thì dữ liệu mới được cập nhật lên Bản đồ GIS thật.
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsGisPreviewOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Đóng
                </button>
                {canEditGps && (
                  <button
                    type="button"
                    disabled={invalidPoleIds.length > 0}
                    onClick={handleSaveDraftGps}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl shadow-xs transition ${
                      invalidPoleIds.length > 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu tọa độ đã chỉnh</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Phóng To Hình Ảnh (Lightbox Preview) */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {zoomImage.polePhotoId && zoomImage.workOrderId ? (
              <PolePhotoImage
                workOrderId={zoomImage.workOrderId}
                photoId={zoomImage.polePhotoId}
                fallbackSrc={zoomImage.src}
                preferOriginal={true}
                alt={zoomImage.title || 'Zoomed Pole'}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
              />
            ) : (
              <EvidenceImage
                evidenceId={zoomImage.evidenceId}
                fallbackSrc={zoomImage.src}
                preferOriginal={true}
                alt={zoomImage.title || 'Zoomed Evidence'}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
              />
            )}
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
