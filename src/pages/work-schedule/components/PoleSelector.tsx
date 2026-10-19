import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  CheckSquare,
  Square,
  Zap,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { getPolesBySegment, extractSegmentId, PoleItem } from '../../../utils/work-schedule/poleUtils'
import { faultAPI } from '../../../feature/faults/faultAPI'
import type { FaultItem } from '../../../types/faults/faults'

interface PoleSelectorProps {
  segmentStr: string
  selectedPoleIds: string[]
  onChange: (poleIds: string[], faultIds?: string[]) => void
  taskKindName?: string // 'Kiểm tra' hoặc 'Sửa chữa'
  allowEmpty?: boolean
}

export const PoleSelector: React.FC<PoleSelectorProps> = ({
  segmentStr,
  selectedPoleIds,
  onChange,
  taskKindName = 'Kiểm tra',
  allowEmpty = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState<number>(4)
  const [faults, setFaults] = useState<FaultItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const segmentId = useMemo(() => extractSegmentId(segmentStr), [segmentStr])

  // Tải danh sách sự cố trên tuyến từ Backend để lọc ra các cột đèn đang có fault
  useEffect(() => {
    let isCancelled = false
    const fetchSegmentFaults = async () => {
      setIsLoading(true)
      try {
        const res = await faultAPI.getFaults({
          segment_id: segmentId,
          status: 'detected,confirmed,in_progress',
          page_size: 100,
        })
        if (!isCancelled) {
          setFaults(res.items || [])
        }
      } catch (err) {
        console.warn('Không thể tải sự cố cho cột đèn:', err)
        if (!isCancelled) setFaults([])
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    fetchSegmentFaults()
    return () => {
      isCancelled = true
    }
  }, [segmentId])

  // Reset về hiển thị 4 bóng đèn khi đổi tuyến đường hoặc thay đổi từ khóa tìm kiếm
  useEffect(() => {
    setVisibleCount(4)
  }, [segmentStr, searchTerm])

  // Ánh xạ giữa mã cột và mã sự cố (poleId -> faultId)
  const poleFaultMap = useMemo(() => {
    const map: Record<string, string> = {}
    faults.forEach((f) => {
      if (f.pole_id && f.fault_id && !map[f.pole_id]) {
        map[f.pole_id] = f.fault_id
      }
    })
    return map
  }, [faults])

  // Lấy danh sách các cột đèn ĐANG CÓ SỰ CỐ trên tuyến
  const poles: PoleItem[] = useMemo(() => {
    const allSegmentPoles = getPolesBySegment(segmentStr)
    const faultPoleIds = Object.keys(poleFaultMap)

    if (faultPoleIds.length === 0) {
      return []
    }

    return faultPoleIds.map((pid) => {
      const match = allSegmentPoles.find((p) => p.poleId === pid)
      if (match) return match
      return {
        poleId: pid,
        segmentId,
        fixtureType: 'led_road_lamp',
        lampWatt: 100,
        atlas: `Cột đèn ${pid} (${segmentStr.split(' (')[0]})`,
        status: 'dim',
      }
    })
  }, [segmentStr, segmentId, poleFaultMap])

  // Lọc theo từ khóa tìm kiếm
  const filteredPoles = useMemo(() => {
    if (!searchTerm.trim()) return poles
    const q = searchTerm.toLowerCase().trim()
    return poles.filter(
      (p) =>
        p.poleId.toLowerCase().includes(q) ||
        p.atlas.toLowerCase().includes(q) ||
        String(p.lampWatt).includes(q)
    )
  }, [poles, searchTerm])

  // Lấy danh sách cột đèn được hiển thị theo phân trang visibleCount
  const displayedPoles = useMemo(() => {
    return filteredPoles.slice(0, visibleCount)
  }, [filteredPoles, visibleCount])

  // Helper kích hoạt onChange với cả poleIds và faultIds tương ứng
  const emitChange = (newPoleIds: string[]) => {
    const correspondingFaultIds = newPoleIds
      .map((pid) => poleFaultMap[pid])
      .filter((fid): fid is string => Boolean(fid))
    onChange(newPoleIds, correspondingFaultIds)
  }

  // Xử lý chọn / bỏ chọn một cột
  const handleTogglePole = (poleId: string) => {
    if (selectedPoleIds.includes(poleId)) {
      emitChange(selectedPoleIds.filter((id) => id !== poleId))
    } else {
      emitChange([...selectedPoleIds, poleId])
    }
  }

  // Chọn tất cả cột đang hiển thị
  const handleSelectAll = () => {
    const allFilteredIds = filteredPoles.map((p) => p.poleId)
    const newSelected = Array.from(new Set([...selectedPoleIds, ...allFilteredIds]))
    emitChange(newSelected)
  }

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    emitChange([])
  }

  const isAllSelected =
    filteredPoles.length > 0 && filteredPoles.every((p) => selectedPoleIds.includes(p.poleId))

  return (
    <div className="flex flex-col gap-2 p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-2xl animate-in fade-in duration-200">
      {/* Header khu vực chọn cột */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-blue-600" />
          <label className="text-xs font-black text-slate-900">
            {allowEmpty ? `Cột đèn trọng tâm cần ${taskKindName} (Tùy chọn):` : `Chỉ định cột đèn cần ${taskKindName} (*):`}
          </label>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full ml-1">
            {allowEmpty && selectedPoleIds.length === 0
              ? 'Kiểm tra toàn tuyến'
              : `Đã chọn ${selectedPoleIds.length} / ${poles.length} cột có sự cố`}
          </span>
        </div>

        {/* Nút thao tác nhanh Chọn tất cả / Bỏ chọn */}
        {filteredPoles.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-extrabold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100/70 border border-blue-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
            >
              {isAllSelected ? (
                <>
                  <Square className="w-3 h-3 text-slate-500" />
                  <span>Bỏ chọn</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3 text-blue-600" />
                  <span>Chọn tất cả ({filteredPoles.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Trạng thái đang tải */}
      {isLoading && (
        <div className="py-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Đang kiểm tra dữ liệu sự cố trên tuyến {segmentId}...</span>
        </div>
      )}

      {/* Tuyến đường không có cột nào bị lỗi */}
      {!isLoading && poles.length === 0 && (
        <div className="py-4 px-3 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex flex-col items-center gap-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-slate-800">Tất cả cột đèn trên tuyến hoạt động bình thường</span>
          <span className="text-[11px] text-slate-400">Không ghi nhận sự cố nào cần kiểm tra trên tuyến này.</span>
        </div>
      )}

      {/* Thanh tìm kiếm nhanh mã cột / vị trí */}
      {!isLoading && poles.length > 4 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Tìm mã cột (VD: POLE-001...) hoặc địa chỉ mốc...`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-[10px] text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 px-1 rounded cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>
      )}

      {/* Danh sách lưới cột đèn: Chỉ hiển thị các cột có sự cố */}
      {!isLoading && poles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-0.5">
          {displayedPoles.map((pole) => {
            const isSelected = selectedPoleIds.includes(pole.poleId)

            return (
              <div
                key={pole.poleId}
                onClick={() => handleTogglePole(pole.poleId)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-150 flex items-start gap-2 select-none ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 ring-1 ring-blue-500 shadow-2xs font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {/* Checkbox Icon */}
                <div className="mt-0.5 shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                </div>

                {/* Thông tin cột */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-black text-xs text-slate-900">
                      {pole.poleId}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {pole.lampWatt}W LED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{pole.atlas}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredPoles.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-slate-400 italic">
              Không tìm thấy cột đèn nào khớp với từ khóa "{searchTerm}".
            </div>
          )}
        </div>
      )}

      {/* Nút Xem thêm 4 cột / Thu gọn nhỏ gọn */}
      {!isLoading && filteredPoles.length > 4 && (
        <div className="flex items-center justify-between px-1 pt-1 border-t border-blue-200/60">
          <span className="text-[11px] font-medium text-slate-500">
            Hiển thị <strong>{Math.min(visibleCount, filteredPoles.length)}</strong> / {filteredPoles.length} cột đèn có sự cố
          </span>

          <div className="flex items-center gap-1.5">
            {visibleCount > 4 && (
              <button
                type="button"
                onClick={() => setVisibleCount(4)}
                className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Thu gọn lại 4 cột ban đầu"
              >
                <ChevronUp className="w-3 h-3 text-slate-500" />
                <span>Thu gọn</span>
              </button>
            )}

            {visibleCount < filteredPoles.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 4)}
                className="px-2.5 py-1 text-[11px] font-extrabold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              >
                <span>Xem thêm 4 cột</span>
                <ChevronDown className="w-3 h-3 text-blue-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hiển thị số lượng cột đã chọn */}
      {selectedPoleIds.length > 0 && (
        <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">
            Đã chỉ định: <strong>{selectedPoleIds.join(', ')}</strong>
          </span>
        </div>
      )}
    </div>
  )
}

export default PoleSelector
