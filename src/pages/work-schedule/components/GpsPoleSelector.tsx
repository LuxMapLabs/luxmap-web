import React, { useMemo, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Search,
  CheckSquare,
  Square,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import { fetchAssetsRequest } from '../../../feature/assets/assetSlice'
import {
  fetchBusyGpsPolesRequest,
  clearBusyGpsPoles,
} from '../../../feature/work-schedule/workScheduleSlice'
import type { PoleListItem } from '../../../types/assets/poles'

interface GpsPoleSelectorProps {
  segmentId: string
  selectedPoleIds: string[]
  onChange: (poleIds: string[]) => void
}

function hasPoleGps(pole: PoleListItem): boolean {
  return Boolean(
    pole.location &&
      typeof pole.location.lat === 'number' &&
      typeof pole.location.lng === 'number'
  )
}

export const GpsPoleSelector: React.FC<GpsPoleSelectorProps> = ({
  segmentId,
  selectedPoleIds,
  onChange,
}) => {
  const dispatch = useDispatch()
  const { poles, isLoadingAssets, loadAssetsError } = useSelector(
    (state: RootState) => state.assets
  )
  const { busyGpsPoleIds, isLoadingBusyGpsPoles: isLoadingBusyPoles } = useSelector(
    (state: RootState) => state.workSchedule
  )
  const [isDropdownOpen, setIsDropdownOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (poles.length === 0 && !isLoadingAssets && !loadAssetsError) {
      dispatch(fetchAssetsRequest())
    }
  }, [dispatch, poles.length, isLoadingAssets, loadAssetsError])

  // Tải danh sách các cột đang nằm trong phiếu pole_gps_update chưa đóng qua Redux-Saga
  useEffect(() => {
    if (!segmentId) {
      dispatch(clearBusyGpsPoles())
      return
    }
    dispatch(fetchBusyGpsPolesRequest(segmentId))
  }, [dispatch, segmentId])

  const busyPoleIds = useMemo(() => new Set(busyGpsPoleIds), [busyGpsPoleIds])

  // Nếu danh sách chọn hiện tại có cột đang bận (ví dụ từ prefill), tự động loại bỏ
  useEffect(() => {
    if (busyPoleIds.size === 0 || selectedPoleIds.length === 0) return
    const cleaned = selectedPoleIds.filter((id) => !busyPoleIds.has(id))
    if (cleaned.length !== selectedPoleIds.length) {
      onChange(cleaned)
    }
  }, [busyPoleIds, selectedPoleIds, onChange])

  const totalSegmentPoleCount = useMemo(() => {
    if (!segmentId) return 0
    return poles.filter((p) => p.pole_id && p.segment_id === segmentId).length
  }, [poles, segmentId])

  // Lọc cột thuộc tuyến đang chọn, ẩn các cột đang nằm trong phiếu khác, và sort cột chưa có GPS lên đầu
  const sortedSegmentPoles = useMemo(() => {
    if (!segmentId) return []
    const inSegment = poles.filter(
      (p) => p.pole_id && p.segment_id === segmentId && !busyPoleIds.has(p.pole_id)
    )
    return [...inSegment].sort((a, b) => {
      const aHasGps = hasPoleGps(a)
      const bHasGps = hasPoleGps(b)
      if (aHasGps !== bHasGps) {
        return aHasGps ? 1 : -1
      }
      const codeA = (a.external_ref || a.pole_id || '').toLowerCase()
      const codeB = (b.external_ref || b.pole_id || '').toLowerCase()
      return codeA.localeCompare(codeB)
    })
  }, [poles, segmentId, busyPoleIds])

  const noGpsPoleIds = useMemo(
    () =>
      sortedSegmentPoles
        .filter((p) => !hasPoleGps(p))
        .map((p) => p.pole_id as string),
    [sortedSegmentPoles]
  )

  const filteredPoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sortedSegmentPoles
    return sortedSegmentPoles.filter((p) => {
      const poleId = (p.pole_id || '').toLowerCase()
      const extRef = (p.external_ref || '').toLowerCase()
      const note = (p.note || '').toLowerCase()
      return poleId.includes(q) || extRef.includes(q) || note.includes(q)
    })
  }, [sortedSegmentPoles, searchTerm])

  const handleTogglePole = (poleId: string) => {
    if (selectedPoleIds.includes(poleId)) {
      onChange(selectedPoleIds.filter((id) => id !== poleId))
    } else {
      onChange([...selectedPoleIds, poleId])
    }
  }

  const handleSelectAllNoGps = () => {
    onChange(Array.from(new Set([...selectedPoleIds, ...noGpsPoleIds])))
  }

  const isAllFilteredSelected =
    filteredPoles.length > 0 &&
    filteredPoles.every((p) => selectedPoleIds.includes(p.pole_id as string))

  const handleToggleAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredPoles.map((p) => p.pole_id as string))
      onChange(selectedPoleIds.filter((id) => !filteredSet.has(id)))
    } else {
      const filteredIds = filteredPoles.map((p) => p.pole_id as string)
      onChange(Array.from(new Set([...selectedPoleIds, ...filteredIds])))
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-violet-50/40 border border-violet-200/90 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <MapPin className="w-4 h-4 text-violet-600 shrink-0" />
          <label className="text-xs font-black text-slate-900">
            Cột đèn trên tuyến (*):
          </label>
          <span className="text-[11px] font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full">
            {sortedSegmentPoles.length === 0
              ? '0 cột'
              : `Đã chọn ${selectedPoleIds.length} / ${sortedSegmentPoles.length} cột`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="px-2.5 py-1 text-[11px] font-bold text-violet-700 bg-white hover:bg-violet-100/70 border border-violet-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
        >
          <span>{isDropdownOpen ? 'Thu gọn danh sách' : 'Mở danh sách cột'}</span>
          {isDropdownOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Tự động ưu tiên đưa <strong>các cột chưa có GPS</strong> lên đầu danh sách. Có thể chọn 1 hoặc nhiều cột.
      </p>

      {/* Trạng thái Loading */}
      {(isLoadingAssets || isLoadingBusyPoles) && (
        <div className="py-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
          <span>Đang tải danh sách cột đèn theo tuyến...</span>
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {!isLoadingAssets && !isLoadingBusyPoles && loadAssetsError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadAssetsError}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchAssetsRequest())}
            className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold text-[11px] hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái Rỗng */}
      {!isLoadingAssets && !isLoadingBusyPoles && !loadAssetsError && sortedSegmentPoles.length === 0 && (
        <div className="py-4 px-3 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
          {totalSegmentPoleCount > 0
            ? 'Tất cả cột đèn trên tuyến này hiện đã nằm trong các phiếu cập nhật vị trí cột khác đang mở.'
            : 'Tuyến đường này hiện chưa có cột đèn nào được ghi nhận trong hệ thống.'}
        </div>
      )}

      {/* Dropdown chọn cột có thanh tìm kiếm */}
      {!isLoadingAssets && !isLoadingBusyPoles && !loadAssetsError && sortedSegmentPoles.length > 0 && isDropdownOpen && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          {/* Thanh tìm kiếm & Thao tác nhanh */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo mã cột..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1.5">
              {noGpsPoleIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSelectAllNoGps}
                  className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 rounded-lg transition cursor-pointer"
                >
                  + Chọn tất cả chưa có GPS ({noGpsPoleIds.length})
                </button>
              ) : (
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Tất cả cột trên tuyến đã có GPS
                </span>
              )}

              {filteredPoles.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllFiltered}
                  className="px-2.5 py-1 text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredPoles.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Danh sách cột đã sort */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredPoles.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Không tìm thấy cột nào khớp với "{searchTerm}".
              </div>
            ) : (
              filteredPoles.map((pole) => {
                const poleId = pole.pole_id as string
                const isSelected = selectedPoleIds.includes(poleId)
                const hasGps = hasPoleGps(pole)

                return (
                  <div
                    key={poleId}
                    onClick={() => handleTogglePole(poleId)}
                    className={`px-3 py-2 flex items-start gap-2.5 cursor-pointer transition select-none ${
                      isSelected ? 'bg-violet-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-violet-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-900">
                          {poleId}
                        </span>
                        {pole.external_ref && (
                          <span className="font-mono text-[10px] font-semibold text-slate-500">
                            ({pole.external_ref})
                          </span>
                        )}
                        {!hasGps ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            Chưa có GPS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {pole.location.lat?.toFixed(5)}, {pole.location.lng?.toFixed(5)}
                          </span>
                        )}
                      </div>
                      {pole.note && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {pole.note}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Danh sách chip các cột đã chọn */}
      {selectedPoleIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {selectedPoleIds.map((pid) => (
            <span
              key={pid}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-600 text-white font-mono text-[11px] font-bold"
            >
              <span>{pid}</span>
              <button
                type="button"
                onClick={() => handleTogglePole(pid)}
                className="hover:text-violet-200 cursor-pointer"
                aria-label={`Bỏ chọn cột ${pid}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default GpsPoleSelector

