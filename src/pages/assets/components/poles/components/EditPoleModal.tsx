import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CheckCircle2, Edit3, MapPin, Zap } from 'lucide-react'
import {
  AssetModalFrame,
  AssetModalHeader,
  AssetModalFooter,
  AssetModalError,
} from '../../common/AssetModal'
import type { FeatureCollection, Feature } from 'geojson'
import type { RootState } from '../../../../../redux/rootReducer'
import { useCloseAfterMutation } from '../../../../../hooks/assets/useCloseAfterMutation'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import {
  calculateDistanceMeters,
  parseLineStringWkt,
  snapPointToPolyline,
} from '../../../../../utils/gis-map/routeUtils'
import { orderedPolesOfSegment } from '../../../../../utils/gis-map/segmentPoleOrder'
import { ROUTE_CORRIDOR_M } from '../../../../../utils/gis-map/poleMove'
import {
  offRoadShapeMessage,
  segmentLineAfter,
  spliceRouteAroundPole,
} from '../../../../../utils/gis-map/segmentRoadShape'
import {
  clearSegmentDetail,
  fetchSegmentDetailRequest,
} from '../../../../../feature/assets/assetSlice'
import { DEFAULT_MAP_CENTER } from '../../../../../utils/gis-map/mapUtils'
import { CabinetSearchSelect } from '../../common/CabinetSearchSelect'
import { EditPoleMap } from './EditPoleMap'
import { findByIdOrRef } from '../../../../../utils/assets/findByIdOrRef'

export interface EditPoleModalProps {
  isOpen: boolean
  pole: PoleListItem | null
  segments?: SegmentListItem[]
  cabinets?: CabinetListItem[]
  allPoles?: PoleListItem[]
  onClose: () => void
  onSave: (updatedPole: PoleListItem) => void
}

const EditPoleModalInner: React.FC<EditPoleModalProps & { pole: PoleListItem }> = ({
  pole,
  segments = [],
  cabinets = [],
  allPoles = [],
  onClose,
  onSave,
}) => {
  // Lưu xong mới đóng form; lỗi thì giữ form để sửa lại
  const { isSaving, markSent } = useCloseAfterMutation(onClose)

  // Lấy mapBounds từ Redux store
  const mapBounds = useSelector((state: RootState) => state?.auth?.user?.map_bounds)

  const fallbackLat =
    typeof mapBounds?.center?.lat === 'number' && Number.isFinite(mapBounds.center.lat)
      ? mapBounds.center.lat
      : DEFAULT_MAP_CENTER[1]
  const fallbackLng =
    typeof mapBounds?.center?.lng === 'number' && Number.isFinite(mapBounds.center.lng)
      ? mapBounds.center.lng
      : DEFAULT_MAP_CENTER[0]

  const initialLat =
    typeof pole.location?.lat === 'number' &&
    Number.isFinite(pole.location.lat) &&
    pole.location.lat !== 0
      ? pole.location.lat
      : fallbackLat
  const initialLng =
    typeof pole.location?.lng === 'number' &&
    Number.isFinite(pole.location.lng) &&
    pole.location.lng !== 0
      ? pole.location.lng
      : fallbackLng

  // Form State khởi tạo trực tiếp từ dữ liệu thực tế của cột đang sửa
  const [externalRef, setExternalRef] = useState(pole.external_ref || '')
  const [segmentId, setSegmentId] = useState(pole.segment_id || '')
  const [cabinetId, setCabinetId] = useState(pole.cabinet_id || '')
  const [selectedFeederId, setSelectedFeederId] = useState(pole.feeder_id || '')
  const [nearSensitivePoi, setNearSensitivePoi] = useState(Boolean(pole.near_sensitive_poi))
  const [noteText, setNoteText] = useState(pole.note || '')
  const [lat, setLat] = useState<number>(initialLat)
  const [lng, setLng] = useState<number>(initialLng)
  const [latStr, setLatStr] = useState<string>(initialLat.toFixed(6))
  const [lngStr, setLngStr] = useState<string>(initialLng.toFixed(6))
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Cột chưa có GPS chỉ hiện bản đồ khi người dùng chủ động bấm gắn vị trí
  const [hasPosition, setHasPosition] = useState<boolean>(Boolean(pole.location))

  // Danh sách mạch điện từ Redux store
  const allFeeders = useSelector((state: RootState) => state.assets.feeders)

  // Đồng bộ lại state nếu pole object thay đổi từ ngoài
  useEffect(() => {
    if (pole) {
      setExternalRef(pole.external_ref || '')
      setSegmentId(pole.segment_id || '')
      setCabinetId(pole.cabinet_id || '')
      setSelectedFeederId(pole.feeder_id || '')
      setNearSensitivePoi(Boolean(pole.near_sensitive_poi))
      setNoteText(pole.note || '')

      if (
        typeof pole.location?.lat === 'number' &&
        Number.isFinite(pole.location.lat) &&
        pole.location.lat !== 0
      ) {
        setLat(pole.location.lat)
        setLatStr(pole.location.lat.toFixed(6))
      }
      if (
        typeof pole.location?.lng === 'number' &&
        Number.isFinite(pole.location.lng) &&
        pole.location.lng !== 0
      ) {
        setLng(pole.location.lng)
        setLngStr(pole.location.lng.toFixed(6))
      }
      setErrorMsg(null)
    }
  }, [pole])

  // Hình tuyến đang lưu của tuyến được chọn (kèm điểm uốn), lấy từ Backend
  const dispatch = useDispatch()
  const segmentDetail = useSelector((state: RootState) => state.assets?.segmentDetail)
  useEffect(() => {
    if (!segmentId) return
    dispatch(fetchSegmentDetailRequest(segmentId))
    return () => {
      dispatch(clearSegmentDetail())
    }
  }, [dispatch, segmentId])
  const isSegmentDetailReady =
    !segmentId || (segmentDetail?.segmentId === segmentId && segmentDetail.isSettled)
  const storedGeomWkt = isSegmentDetailReady && segmentId ? (segmentDetail?.geomWkt ?? null) : null

  // Đường xem trước và đường đang lưu (đứng yên để đối chiếu).
  // Khi dời cột tại chỗ trên tuyến đã có hình: chỉ thay đoạn giữa hai cột kề, giữ nguyên phần còn lại.
  // Các trường hợp khác (chưa có hình, gắn GPS mới, đổi tuyến): dùng segmentLineAfter như mặc định.
  const segmentLine = useMemo(() => {
    if (!segmentId) {
      return {
        roadShape: false,
        line: [] as [number, number][],
        savedLine: [] as [number, number][],
      }
    }
    const storedLine = storedGeomWkt ? parseLineStringWkt(storedGeomWkt) : []
    const poleId = pole.pole_id
    const previous = orderedPolesOfSegment(allPoles, segmentId)

    if (
      storedLine.length >= 2 &&
      Boolean(pole.location) &&
      segmentId === (pole.segment_id || '') &&
      hasPosition &&
      poleId
    ) {
      const spliced = spliceRouteAroundPole(storedLine, previous, poleId, [lng, lat])
      if (spliced) {
        return {
          roadShape: false,
          line: spliced,
          savedLine: storedLine,
        }
      }
    }

    const saved = segmentLineAfter(previous, storedGeomWkt, previous)
    const current = orderedPolesOfSegment(allPoles, segmentId, poleId)
    if (hasPosition && poleId) current.push({ id: poleId, coord: [lng, lat] })
    const preview = segmentLineAfter(previous, storedGeomWkt, current)
    return {
      roadShape: preview.roadShape,
      line: preview.line,
      savedLine: saved.line,
    }
  }, [
    allPoles,
    segmentId,
    pole.pole_id,
    pole.location,
    pole.segment_id,
    hasPosition,
    lng,
    lat,
    storedGeomWkt,
  ])
  const segmentCoords = segmentLine.line
  const savedSegmentCoords = segmentLine.savedLine

  // Đường làm mốc đo hành lang 25 m: ưu tiên hình tuyến đang lưu, không có thì dùng tuyến nối cột hiện tại
  const corridorLine = useMemo<[number, number][]>(() => {
    const stored = storedGeomWkt ? parseLineStringWkt(storedGeomWkt) : []
    if (stored.length >= 2) return stored
    return savedSegmentCoords.length >= 2 ? savedSegmentCoords : []
  }, [storedGeomWkt, savedSegmentCoords])

  // Vị trí gốc đã lưu của cột (nếu có)
  const originCoord = useMemo<[number, number] | undefined>(() => {
    if (
      pole.location &&
      typeof pole.location.lng === 'number' &&
      typeof pole.location.lat === 'number' &&
      Number.isFinite(pole.location.lng) &&
      Number.isFinite(pole.location.lat) &&
      pole.location.lng !== 0 &&
      pole.location.lat !== 0
    ) {
      return [pole.location.lng, pole.location.lat]
    }
    return undefined
  }, [pole.location])

  // Hình thật không chạy theo cột, và backend không đo khi sửa cột: web tự đo cột tới hình
  const offRoadDistance = (coord: [number, number]): number | null =>
    segmentLine.roadShape ? snapPointToPolyline(coord, segmentLine.line).distMeters : null
  const offRoadM = hasPosition ? offRoadDistance([lng, lat]) : null
  const isOffRoad = offRoadM !== null && offRoadM > ROUTE_CORRIDOR_M

  // Trích xuất các cột khác trên cùng tuyến đường (GeoJSON FeatureCollection)
  const otherPolesGeoJSON = useMemo<FeatureCollection>(() => {
    if (!segmentId) {
      return { type: 'FeatureCollection', features: [] }
    }
    const features: Feature[] = allPoles
      .filter(
        (p) =>
          p.segment_id === segmentId &&
          p.pole_id !== pole?.pole_id &&
          p.location &&
          Number.isFinite(p.location.lng) &&
          Number.isFinite(p.location.lat)
      )
      .map((p) => ({
        type: 'Feature',
        properties: {
          id: p.pole_id,
          code: p.external_ref || p.pole_id,
          cabinet_id: p.cabinet_id || p.feeder_id,
        },
        geometry: {
          type: 'Point',
          coordinates: [p.location.lng, p.location.lat],
        },
      }))

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [allPoles, segmentId, pole?.pole_id])

  // Lọc tủ điện cấp nguồn tương ứng với 1 tuyến đường
  const getAvailableCabinetsForSegment = useCallback(
    (targetSegId: string) => {
      if (!targetSegId || !cabinets || cabinets.length === 0) return cabinets || []

      // 1. Lấy ID tủ mà các cột trên tuyến này đang kết nối
      const connectedCabinetIds = new Set<string>()
      allPoles
        .filter((p) => p.segment_id === targetSegId)
        .forEach((p) => {
          if (p.cabinet_id) connectedCabinetIds.add(p.cabinet_id)
          if (p.feeder_id) connectedCabinetIds.add(p.feeder_id)
        })

      // 2. Lọc theo từ khóa tên tuyến (ví dụ: "Tỉnh Lộ 8")
      const segObj = findByIdOrRef(segments, (s) => s.segment_id, targetSegId)
      const segKeyword = segObj?.segment_name?.includes(' - ')
        ? segObj.segment_name.split(' - ')[1].trim().toLowerCase()
        : segObj?.segment_name?.toLowerCase() || ''

      const filtered = cabinets.filter((cab) => {
        if (
          (cab.cabinet_id && connectedCabinetIds.has(cab.cabinet_id)) ||
          (cab.external_ref && connectedCabinetIds.has(cab.external_ref))
        ) {
          return true
        }
        if (segKeyword && cab.cabinet_name?.toLowerCase().includes(segKeyword)) {
          return true
        }
        return false
      })

      return filtered.length > 0 ? filtered : cabinets
    },
    [cabinets, segments, allPoles]
  )

  // Lọc tủ điện cấp nguồn tương ứng với tuyến đường đang chọn
  const availableCabinetsOnSegment = useMemo(() => {
    return getAvailableCabinetsForSegment(segmentId)
  }, [getAvailableCabinetsForSegment, segmentId])

  // Xử lý đổi tuyến đường ở dropdown: cập nhật tuyến và reset tủ nếu tủ cũ không thuộc tuyến mới
  const handleSegmentChange = (newSegId: string) => {
    setSegmentId(newSegId)
    const newAvailableCabinets = getAvailableCabinetsForSegment(newSegId)
    const isStillValid = !!findByIdOrRef(newAvailableCabinets, (c) => c.cabinet_id, cabinetId)
    if (!isStillValid) {
      setCabinetId('')
    }
  }

  // Tủ điện đang được chọn
  const currentCabinet = useMemo(() => {
    return findByIdOrRef(cabinets, (c) => c.cabinet_id, cabinetId)
  }, [cabinets, cabinetId])

  // Danh sách mạch điện khả dụng của Tủ điện đang chọn
  const availableFeeders = useMemo(() => {
    if (!cabinetId || !allFeeders) return []
    const cabId = currentCabinet?.cabinet_id || cabinetId
    const cabExt = currentCabinet?.external_ref
    return allFeeders.filter((f) => {
      if (
        f.cabinet?.cabinet_id &&
        (f.cabinet.cabinet_id === cabId || f.cabinet.cabinet_id === cabExt)
      )
        return true
      if (currentCabinet?.feeder_ids?.includes(f.feeder_id || '')) return true
      if (cabExt && f.external_ref && f.external_ref.toLowerCase().includes(cabExt.toLowerCase()))
        return true
      return false
    })
  }, [allFeeders, cabinetId, currentCabinet])

  // Tự động gán mạch nếu tủ chỉ có 1 mạch hoặc mạch hiện tại không hợp lệ
  useEffect(() => {
    if (availableFeeders.length === 1) {
      setSelectedFeederId(availableFeeders[0].feeder_id || '')
    } else if (availableFeeders.length > 1) {
      if (!selectedFeederId || !availableFeeders.some((f) => f.feeder_id === selectedFeederId)) {
        setSelectedFeederId(availableFeeders[0].feeder_id || '')
      }
    } else {
      setSelectedFeederId('')
    }
  }, [availableFeeders, selectedFeederId])

  // Validate và chuẩn hóa tọa độ (cột đặt tự do, không bám tim đường)
  const validateAndFormatCoords = (
    rawLngStr: string,
    rawLatStr: string
  ): { lng: number; lat: number } | null => {
    const trimmedLat = rawLatStr.trim()
    const trimmedLng = rawLngStr.trim()

    if (!trimmedLat || !trimmedLng) {
      setErrorMsg('Vui lòng nhập đầy đủ Vĩ độ và Kinh độ!')
      return null
    }

    const parsedNLat = parseFloat(trimmedLat)
    const parsedNLng = parseFloat(trimmedLng)

    if (isNaN(parsedNLat) || isNaN(parsedNLng)) {
      setErrorMsg('Tọa độ GIS không hợp lệ! Vui lòng nhập số thực cho Vĩ độ và Kinh độ.')
      return null
    }

    if (parsedNLat < -90 || parsedNLat > 90 || parsedNLng < -180 || parsedNLng > 180) {
      setErrorMsg('Tọa độ vượt quá phạm vi địa lý hợp lệ (Vĩ độ: -90..90, Kinh độ: -180..180)!')
      return null
    }

    setErrorMsg(null)
    return { lng: Number(parsedNLng.toFixed(6)), lat: Number(parsedNLat.toFixed(6)) }
  }

  const handleCoordBlur = () => {
    const result = validateAndFormatCoords(lngStr, latStr)
    if (result) {
      setLng(result.lng)
      setLat(result.lat)
      setLngStr(result.lng.toFixed(6))
      setLatStr(result.lat.toFixed(6))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const validatedCoords = hasPosition ? validateAndFormatCoords(lngStr, latStr) : null
    if (hasPosition && !validatedCoords) {
      return
    }

    if (validatedCoords) {
      if (!isSegmentDetailReady) {
        setErrorMsg('Đang tải hình tuyến để kiểm tra vị trí cột, thử lại sau giây lát.')
        return
      }
      const coord: [number, number] = [validatedCoords.lng, validatedCoords.lat]
      const distance = offRoadDistance(coord)
      // Chỉ chặn khi đặt cột vào chỗ mới (dời, đổi tuyến, gắn GPS); cột vốn đã nằm xa mà không dời thì chỉ cảnh báo
      const unchanged =
        segmentId === (pole.segment_id || '') &&
        Boolean(pole.location) &&
        calculateDistanceMeters([pole.location.lng, pole.location.lat], coord) < 0.5
      if (distance !== null && distance > ROUTE_CORRIDOR_M && !unchanged) {
        setErrorMsg(
          offRoadShapeMessage([
            externalRef.trim() || pole.external_ref || pole.pole_id || 'Cột này',
          ])
        )
        return
      }
      // Tuyến nháp, cùng tuyến: vị trí đổi qua /location, backend đo theo hình đang lưu (đi qua chỗ cũ của cột)
      const storedLine = storedGeomWkt ? parseLineStringWkt(storedGeomWkt) : []
      const sameSegment = segmentId === (pole.segment_id || '') && Boolean(pole.location)
      if (distance === null && sameSegment && !unchanged && storedLine.length >= 2) {
        const fromStored = snapPointToPolyline(coord, storedLine).distMeters
        if (fromStored > ROUTE_CORRIDOR_M) {
          setErrorMsg(
            `Vị trí mới cách hình tuyến đang lưu ${Math.round(fromStored)} m, quá ${ROUTE_CORRIDOR_M} m nên không lưu được. ` +
              'Dời ít hơn, hoặc sửa hình tuyến trước (Sửa tuyến → "Sửa hình bằng kéo thả" hoặc lấy hình theo đường) rồi dời cột.'
          )
          return
        }
      }
    }

    const selectedCab = findByIdOrRef(cabinets, (c) => c.cabinet_id, cabinetId)

    const effectiveFeederId =
      selectedFeederId ||
      availableFeeders[0]?.feeder_id ||
      (currentCabinet?.feeder_ids?.[0]?.startsWith('FDR-') ? currentCabinet.feeder_ids[0] : null) ||
      null

    const updated: PoleListItem = {
      ...pole,
      external_ref: externalRef.trim() || pole.external_ref,
      segment_id: segmentId || null,
      feeder_id: effectiveFeederId,
      cabinet_id: cabinetId || null,
      cabinet_name: selectedCab?.cabinet_name || null,
      near_sensitive_poi: nearSensitivePoi,
      note: noteText.trim() ? noteText.trim() : null,
      // Kiểu sinh từ BE chưa cho location null, nhưng cột chưa có GPS thì BE trả null
      location: validatedCoords
        ? { lat: validatedCoords.lat, lng: validatedCoords.lng }
        : (null as unknown as PoleListItem['location']),
      updated_at: new Date().toISOString(),
    }

    onSave(updated)
    markSent()
  }

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      <AssetModalHeader
        icon={<Edit3 className="w-5 h-5" />}
        accent="blue"
        title={`Chỉnh sửa cột đèn: ${pole.external_ref || pole.pole_id}`}
        subtitle="Hiệu chỉnh thông số kỹ thuật và định vị lại tọa độ chính xác trên bản đồ số"
        onClose={onClose}
      />

      <AssetModalError message={errorMsg} />

      {/* Body Form Layout 2 Cột */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* CỘT TRÁI: FORM THÔNG SỐ (42% width trên md) */}
          <div className="md:col-span-5 p-4 sm:p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 overflow-y-auto text-xs">
            {/* Dòng 1: Mã cột & Tuyến đường */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Mã Cột Điện (Tem Cột) <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="VD: C-01, P.12..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Tuyến Đường Chiếu Sáng:
              </label>
              <select
                value={segmentId}
                onChange={(e) => handleSegmentChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Chưa gán tuyến đường --</option>
                {segments.map((s) => (
                  <option
                    key={s.segment_id || s.external_ref || Math.random()}
                    value={s.segment_id || ''}
                  >
                    {s.segment_name || s.external_ref || s.segment_id || 'Tuyến không tên'}
                  </option>
                ))}
              </select>
            </div>

            {/* Dòng 2: Tủ điện quản lý & Mạch nguồn */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tủ Điện Quản Lý:</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  (Nguồn cấp)
                </span>
              </label>
              <CabinetSearchSelect
                cabinets={availableCabinetsOnSegment}
                value={cabinetId}
                onChange={(newCab) => {
                  setCabinetId(newCab)
                  setSelectedFeederId('')
                }}
                placeholder={
                  availableCabinetsOnSegment.length === 0
                    ? '(Tuyến này chưa có tủ điện khả dụng)'
                    : '-- Chọn tủ điện quản lý --'
                }
                disabled={availableCabinetsOnSegment.length === 0}
                disabledPlaceholder="(Tuyến này chưa có tủ điện khả dụng)"
                accentColor="indigo"
                allowClear={true}
                getId={(c) => c.cabinet_id || c.external_ref || ''}
              />
            </div>

            {/* Dropdown Mạch Điện / Lộ xuất tuyến */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mạch Điện (Lộ xuất tuyến):</span>
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  (1 Cột - 1 Mạch)
                </span>
              </label>
              <select
                value={selectedFeederId}
                onChange={(e) => setSelectedFeederId(e.target.value)}
                disabled={!cabinetId}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!cabinetId
                    ? '-- Vui lòng chọn tủ điện trước --'
                    : availableFeeders.length === 0
                      ? '(Tủ này chưa có mạch điện khả dụng)'
                      : '-- Chọn mạch điện cấp nguồn --'}
                </option>
                {availableFeeders.map((f) => (
                  <option key={f.feeder_id || f.external_ref} value={f.feeder_id || ''}>
                    ⚡️ {f.feeder_name || f.external_ref || f.feeder_id} (
                    {f.external_ref || f.feeder_id})
                  </option>
                ))}
              </select>
              {cabinetId && availableFeeders.length === 1 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 italic">
                  ✓ Đã tự động chọn mạch duy nhất của tủ này
                </p>
              )}
              {cabinetId && availableFeeders.length === 0 && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 italic">
                  ⚠ Tủ này chưa có mạch điện nào. Vui lòng thêm mạch tại Tab Mạch điện.
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2.5">
              <input
                id="edit-near-sensitive-poi-gis"
                type="checkbox"
                checked={nearSensitivePoi}
                onChange={(e) => setNearSensitivePoi(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="edit-near-sensitive-poi-gis"
                className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none leading-tight"
              >
                Gần khu vực nhạy cảm (Trường học, bệnh viện, ngã tư lớn)
              </label>
            </div>

            {/* Dòng 3: Ghi chú */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Ghi chú hiện trường:
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ghi chú điểm tham chiếu, tình trạng trụ..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <div className="text-right text-[10px] font-normal text-slate-400 tabular-nums">
                {noteText.length}/1000
              </div>
            </div>

            {/* Dòng 4: Tọa độ số hiển thị & cho phép nhập tay */}
            {!hasPosition ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Cột chưa có GPS</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Cột chưa hiện trên bản đồ. Khi đã biết vị trí, bấm nút bên dưới để chọn trên bản
                    đồ.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLatStr('')
                      setLngStr('')
                      setHasPosition(true)
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Gắn vị trí cho cột
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tọa độ WGS84 Hiện Tại:</span>
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      (Có thể nhập tay)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                        Kinh độ (Lng):
                      </label>
                      <input
                        type="text"
                        value={lngStr}
                        onChange={(e) => {
                          setLngStr(e.target.value)
                          setErrorMsg(null)
                        }}
                        onBlur={handleCoordBlur}
                        placeholder="VD: 106.489639"
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                        Vĩ độ (Lat):
                      </label>
                      <input
                        type="text"
                        value={latStr}
                        onChange={(e) => {
                          setLatStr(e.target.value)
                          setErrorMsg(null)
                        }}
                        onBlur={handleCoordBlur}
                        placeholder="VD: 10.970187"
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>
                  {isOffRoad && offRoadM !== null && (
                    <p
                      role="alert"
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400"
                    >
                      Cột cách hình tuyến{' '}
                      {offRoadM.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m, quá{' '}
                      {ROUTE_CORRIDOR_M} m: khảo sát sẽ không thấy cột này. Kéo cột về sát đường.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Nhập tay tọa độ hoặc kéo ghim cam / click bản đồ để định vị lại. Đoạn giữa
                    hai cột kề sẽ được thay (đỏ bỏ, xanh lá thêm); cột phải nằm trong{' '}
                    {ROUTE_CORRIDOR_M} m quanh hình tuyến đang lưu.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ GIS THEO NGỮ CẢNH (58% width trên md) */}
          {hasPosition ? (
            <EditPoleMap
              key={pole.pole_id || pole.external_ref || 'edit-pole-map'}
              lat={lat}
              lng={lng}
              segmentCoords={segmentCoords}
              savedSegmentCoords={savedSegmentCoords}
              previewKind={segmentLine.roadShape ? 'link' : 'route'}
              corridorLine={corridorLine}
              corridorMeters={ROUTE_CORRIDOR_M}
              originCoord={originCoord}
              otherPolesGeoJSON={otherPolesGeoJSON}
              communeId={pole.commune_id}
              currentCabinet={currentCabinet}
              onChangeCoords={({ lat: newLat, lng: newLng }) => {
                setLat(newLat)
                setLng(newLng)
                setLatStr(newLat.toFixed(6))
                setLngStr(newLng.toFixed(6))
                setErrorMsg(null)
              }}
            />
          ) : null}
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel={isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
          loading={isSaving}
        />
      </form>
    </AssetModalFrame>
  )
}

export const EditPoleModal: React.FC<EditPoleModalProps> = (props) => {
  if (!props.isOpen || !props.pole) return null
  return (
    <EditPoleModalInner
      key={props.pole.pole_id || props.pole.external_ref || 'edit-pole-dialog'}
      {...props}
      pole={props.pole}
    />
  )
}

export default EditPoleModal
