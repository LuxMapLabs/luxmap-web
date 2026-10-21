import React, { useState, useEffect, useMemo } from 'react'
import {
  Wrench,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { faultAPI } from '../../../feature/faults/faultAPI'
import type { FaultItem } from '../../../types/faults/faults'
import { extractSegmentId } from '../../../utils/work-schedule/poleUtils'

interface FaultSelectorProps {
  segmentStr: string
  selectedFaultIds: string[]
  onChange: (faultIds: string[]) => void
}

const FAULT_TYPE_LABELS: Record<string, string> = {
  lamp_out: 'Cháy bóng đèn (Mất sáng)',
  lamp_dim: 'Đèn chập chờn / Giảm sáng',
  segment_outage: 'Mất điện toàn tuyến',
  node_offline: 'Mất kết nối bộ điều khiển',
  runtime_decline: 'Suy giảm hiệu suất chiếu sáng',
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
}

export const FaultSelector: React.FC<FaultSelectorProps> = ({
  segmentStr,
  selectedFaultIds,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [faults, setFaults] = useState<FaultItem[]>([])

  const segmentId = useMemo(() => extractSegmentId(segmentStr), [segmentStr])

  // Tải danh sách sự cố đã xác nhận thuộc tuyến từ Backend API
  const fetchFaults = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await faultAPI.getFaults({
        segment_id: segmentId,
        status: 'confirmed,in_progress',
        page_size: 50,
      })
      // Chỉ lấy các sự cố chưa nằm trong bất kỳ lệnh công tác nào (!f.work_order_id)
      const availableFaults = (res.items || []).filter(
        (f) => !f.work_order_id && (f.fault_status === 'confirmed' || f.fault_status === 'in_progress')
      )
      setFaults(availableFaults)
    } catch (err: any) {
      console.warn('Không thể tải sự cố theo tuyến:', err)
      setError('Không thể tải danh sách sự cố từ máy chủ.')
      setFaults([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFaults()
    onChange([]) // Reset lựa chọn khi đổi tuyến
  }, [segmentId])

  const filteredFaults = useMemo(() => {
    if (!searchTerm.trim()) return faults
    const q = searchTerm.toLowerCase().trim()
    return faults.filter((f) => {
      const idMatch = f.fault_id?.toLowerCase().includes(q)
      const poleMatch = f.pole_id?.toLowerCase().includes(q)
      const typeMatch = f.fault_type?.toLowerCase().includes(q)
      const noteMatch = f.note?.toLowerCase().includes(q)
      return idMatch || poleMatch || typeMatch || noteMatch
    })
  }, [faults, searchTerm])

  const handleToggleFault = (faultId: string) => {
    if (selectedFaultIds.includes(faultId)) {
      onChange(selectedFaultIds.filter((id) => id !== faultId))
    } else {
      onChange([...selectedFaultIds, faultId])
    }
  }

  const handleSelectAll = () => {
    const allIds = filteredFaults
      .map((f) => f.fault_id)
      .filter((id): id is string => Boolean(id))
    onChange(Array.from(new Set([...selectedFaultIds, ...allIds])))
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const isAllSelected =
    filteredFaults.length > 0 &&
    filteredFaults.every((f) => f.fault_id && selectedFaultIds.includes(f.fault_id))

  return (
    <div className="flex flex-col gap-2 p-3.5 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl animate-in fade-in duration-200">
      {/* Header khu vực chọn sự cố */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-emerald-600" />
          <label className="text-xs font-black text-slate-900">
            Chỉ định sự cố cần Sửa chữa (*):
          </label>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full ml-1">
            Đã chọn {selectedFaultIds.length} / {faults.length} sự cố
          </span>
        </div>

        {faults.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
            >
              {isAllSelected ? (
                <>
                  <Square className="w-3 h-3 text-emerald-600" /> Bỏ chọn
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3 text-emerald-600" /> Chọn tất cả
                </>
              )}
            </button>
            <button
              type="button"
              onClick={fetchFaults}
              title="Tải lại danh sách sự cố"
              className="p-1 text-slate-500 hover:text-emerald-700 bg-white border border-emerald-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Trạng thái Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-6 gap-2 text-xs font-semibold text-emerald-700 bg-white rounded-xl border border-emerald-100">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Đang tải danh sách sự cố trên tuyến {segmentId}...
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {!isLoading && error && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchFaults}
            className="text-[11px] font-bold text-amber-900 underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái Tuyến không còn sự cố chưa giao việc */}
      {!isLoading && !error && faults.length === 0 && (
        <div className="py-4 px-3 text-center rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-extrabold text-emerald-950 text-xs">
            Toàn bộ sự cố trên tuyến này đều đã được lên lịch xử lý.
          </span>
          <span className="text-[11px] text-emerald-700">
            Hiện không còn sự cố nào tồn đọng cần giao việc.
          </span>
        </div>
      )}

      {/* Ô tìm kiếm khi có nhiều sự cố */}
      {!isLoading && faults.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã sự cố, mã cột POLE-..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      )}

      {/* Danh sách thẻ sự cố */}
      {!isLoading && faults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
          {filteredFaults.map((f) => {
            const fid = f.fault_id || ''
            const isSelected = selectedFaultIds.includes(fid)
            const sevColor = SEVERITY_COLORS[f.severity || 'medium'] || SEVERITY_COLORS.medium
            const typeLabel = FAULT_TYPE_LABELS[f.fault_type || ''] || f.fault_type || 'Sự cố đèn'

            return (
              <div
                key={fid}
                onClick={() => handleToggleFault(fid)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                  isSelected
                    ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {f.pole_id ? `Cột ${f.pole_id}` : fid}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}
                    >
                      {f.severity || 'medium'}
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-emerald-800 mt-0.5 truncate">
                    {typeLabel}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="font-mono">{fid}</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1 rounded">
                      {f.fault_status === 'in_progress' ? 'Đang xử lý' : 'Đã xác nhận'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FaultSelector
