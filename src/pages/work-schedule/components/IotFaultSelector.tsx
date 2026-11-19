import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Cpu,
  AlertTriangle,
  CheckSquare,
  Square,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { fetchFaultsList } from '../../../feature/dashboard/dashboardAPI'
import type { FaultItem } from '../../../types/faults/faults'
import { FAULT_TYPE_LABELS_VN } from '../../../utils/citizen-report/citizenReviewFormat'
import { iotAnomalyLabel } from '../../../constants/iot'

interface IotFaultSelectorProps {
  cabinetId: string
  taskKind: 'inspection' | 'repair'
  selectedFaultIds: string[]
  onChange: (faultIds: string[]) => void
}

const ALL_IOT_DATA_SOURCES = 'field,public_imagery,simulated,calibration_rig'

const extractCabinetFromNote = (fault: FaultItem): string | null => {
  if (fault.cabinet_id) return fault.cabinet_id
  const text = `${fault.note || ''} ${fault.review_note || ''}`
  const match = text.match(/ở tủ\s+(CAB-[\w-]+)/i)
  return match ? match[1] : null
}

export const IotFaultSelector: React.FC<IotFaultSelectorProps> = ({
  cabinetId,
  taskKind,
  selectedFaultIds,
  onChange,
}) => {
  const [faults, setFaults] = useState<FaultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadIotFaults = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusParam = taskKind === 'inspection' ? 'detected' : 'confirmed,in_progress'
      const items = await fetchFaultsList({
        status: statusParam,
        data_source: ALL_IOT_DATA_SOURCES,
        sort: '-detected_at',
        page_size: 100,
      })
      const iotOpen = (items || []).filter((f) => {
        // Chỉ lấy sự cố thiết bị IoT ở tủ/mạch (không gắn cột, không gắn tuyến)
        const isCabinetNodeIot =
          !f.pole_id &&
          !f.segment_id &&
          (f.source_channel === 'iot' || Boolean(f.origin_node_id) || Boolean(f.cabinet_id))
        const notAssigned = !f.work_order_id
        const statusOk =
          taskKind === 'inspection'
            ? f.fault_status === 'detected'
            : f.fault_status === 'confirmed' || f.fault_status === 'in_progress'
        return isCabinetNodeIot && notAssigned && statusOk && Boolean(f.fault_id)
      })
      setFaults(iotOpen)
    } catch {
      setError('Không thể tải danh sách sự cố IoT từ máy chủ.')
    } finally {
      setIsLoading(false)
    }
  }, [taskKind])

  useEffect(() => {
    loadIotFaults()
  }, [loadIotFaults])

  const filteredFaults = useMemo(() => {
    if (!cabinetId || cabinetId === '__ALL__') return faults
    return faults.filter((f) => extractCabinetFromNote(f) === cabinetId)
  }, [faults, cabinetId])

  const handleToggle = (faultId: string) => {
    if (selectedFaultIds.includes(faultId)) {
      onChange(selectedFaultIds.filter((id) => id !== faultId))
    } else {
      onChange([...selectedFaultIds, faultId])
    }
  }

  const allVisibleIds = useMemo(
    () => filteredFaults.map((f) => f.fault_id).filter((id): id is string => Boolean(id)),
    [filteredFaults]
  )

  const isAllSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedFaultIds.includes(id))

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange(selectedFaultIds.filter((id) => !allVisibleIds.includes(id)))
    } else {
      const merged = Array.from(new Set([...selectedFaultIds, ...allVisibleIds]))
      onChange(merged)
    }
  }

  return (
    <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 flex flex-col gap-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>
            Sự cố IoT chờ {taskKind === 'inspection' ? 'Kiểm tra' : 'Sửa chữa'} ({filteredFaults.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allVisibleIds.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          )}
          <button
            type="button"
            onClick={loadIotFaults}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-white transition cursor-pointer disabled:opacity-50"
            title="Tải lại danh sách sự cố IoT"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Đang tải danh sách sự cố IoT...</span>
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={loadIotFaults}
            className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 font-bold text-[11px] hover:bg-rose-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : filteredFaults.length === 0 ? (
        <div className="py-5 px-3 rounded-xl bg-white/80 border border-indigo-100 text-center text-slate-500 space-y-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
          <p className="font-semibold text-slate-700">
            Không có sự cố IoT nào đang chờ {taskKind === 'inspection' ? 'kiểm tra' : 'sửa chữa'}
            {cabinetId && cabinetId !== '__ALL__' ? ` tại tủ ${cabinetId}` : ''}.
          </p>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {filteredFaults.map((f) => {
            const id = f.fault_id || ''
            const checked = selectedFaultIds.includes(id)
            const cab = extractCabinetFromNote(f)
            const typeLabel =
              (f.fault_type && FAULT_TYPE_LABELS_VN[f.fault_type]) || f.fault_type || '-'

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleToggle(id)}
                className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                  checked
                    ? 'bg-indigo-100/70 border-indigo-400 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span className="mt-0.5 text-indigo-600 shrink-0">
                  {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                      {typeLabel}
                    </span>
                    {f.iot_anomaly_code && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {iotAnomalyLabel(f.iot_anomaly_code)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono text-indigo-800">
                    <span>Tủ: {cab || '-'}</span>
                    <span>Mạch: {f.feeder_id || '-'}</span>
                    <span>Node: {f.origin_node_id || '-'}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
