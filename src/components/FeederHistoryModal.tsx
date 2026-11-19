import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarRange, X } from 'lucide-react'
import type { ElectricalTimeBasis } from '../feature/iot/iotMonitorSlice'
import type { ElectricalRange } from '../utils/iot/electricalSeries'
import { startOfDay, endOfDay, type DateRange } from '../utils/dateUtils'
import { TabBar } from './TabBar'
import { ElectricalHistoryChart, ElectricalRangeToggle } from './ElectricalHistoryChart'
import { DateRangePicker } from './DateRangePicker'
import { IotDiagnosticHistoryList } from './IotDiagnosticHistoryList'
import { IotCommandHistoryList } from './IotCommandHistoryList'

export type FeederHistoryTab = 'electrical' | 'faults' | 'commands'

export interface FeederHistoryModalProps {
  feederId: string
  feederLabel?: string | null
  nodeId?: string | null
  initialTab?: FeederHistoryTab
  allowReceivedTime?: boolean
  onClose: () => void
}

/**
 * Modal lịch sử theo mạch điện (feeder): Lịch sử thông số, Lịch sử sự cố, và (nếu có node) Lịch sử lệnh.
 */
export const FeederHistoryModal: React.FC<FeederHistoryModalProps> = ({
  feederId,
  feederLabel = null,
  nodeId = null,
  initialTab = 'electrical',
  allowReceivedTime = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FeederHistoryTab>(
    initialTab === 'commands' && !nodeId ? 'electrical' : initialTab
  )
  const [range, setRange] = useState<ElectricalRange>('6h')
  const [timeBasis, setTimeBasis] = useState<ElectricalTimeBasis>('measured_at')
  const [viewMode, setViewMode] = useState<'recent' | 'by_date'>('recent')
  const [dayRange, setDayRange] = useState<DateRange>({ startDate: null, endDate: null })
  const maxPickerDate = useMemo(() => new Date(), [])

  const computedDateRange = useMemo(() => {
    if (!dayRange.startDate || !dayRange.endDate) return null
    const from = startOfDay(dayRange.startDate)
    const endPlusOne = endOfDay(dayRange.endDate).getTime() + 1
    const to = new Date(Math.min(endPlusOne, Date.now()))
    if (from.getTime() >= to.getTime()) return null
    return { from, to }
  }, [dayRange.startDate, dayRange.endDate])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const displayTitle = feederLabel || feederId
  const tabs = [
    { id: 'electrical', label: 'Lịch sử thông số' },
    { id: 'faults', label: 'Lịch sử sự cố' },
    ...(nodeId ? [{ id: 'commands', label: 'Lịch sử lệnh' }] : []),
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Lịch sử mạch ${displayTitle}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[min(46rem,90vh)] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 p-4 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              Lịch sử mạch {displayTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Node <span className="font-mono">{nodeId || '-'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 shrink-0">
          <TabBar
            variant="underline"
            size="sm"
            className="overflow-y-hidden"
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as FeederHistoryTab)}
            tabs={tabs}
          />
        </div>

        {activeTab === 'electrical' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-6 pt-4 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {viewMode === 'by_date'
                  ? `Số đo theo khoảng ngày đã chọn, giờ theo ${
                      timeBasis === 'received_at' ? 'Bridge nhận' : 'đo trên node'
                    }. Không tự cập nhật.`
                  : timeBasis === 'received_at'
                    ? 'Trung bình mỗi 30 giây theo giờ Bridge nhận. Mẫu gửi bù từ thẻ nhớ dồn vào lúc tới, mẫu thiếu giờ RTC chỉ có ở chế độ này. Dùng để xem node mất kết nối và gửi bù lúc nào.'
                    : 'Trung bình mỗi 30 giây theo giờ đo trên node. Số đo node lưu thẻ nhớ khi mất kết nối được gửi bù và xếp đúng lúc đo.'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  role="group"
                  aria-label="Kiểu xem"
                  className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  {(
                    [
                      ['recent', 'Gần nhất'],
                      ['by_date', 'Theo ngày'],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={viewMode === mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        viewMode === mode
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {allowReceivedTime && (
                  <div
                    role="group"
                    aria-label="Trục thời gian"
                    className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                  >
                    {(
                      [
                        ['measured_at', 'Theo giờ đo'],
                        ['received_at', 'Theo giờ nhận'],
                      ] as const
                    ).map(([basis, label]) => (
                      <button
                        key={basis}
                        type="button"
                        aria-pressed={timeBasis === basis}
                        onClick={() => setTimeBasis(basis)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          timeBasis === basis
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {viewMode === 'recent' ? (
                  <ElectricalRangeToggle value={range} onChange={setRange} />
                ) : (
                  <DateRangePicker
                    value={dayRange}
                    onChange={setDayRange}
                    maxDate={maxPickerDate}
                    placeholder="Chọn khoảng ngày"
                    showPresets
                  />
                )}
              </div>
            </div>
            {viewMode === 'recent' ? (
              <ElectricalHistoryChart
                key={`${feederId}-${timeBasis}`}
                feederId={feederId}
                live={Boolean(nodeId)}
                range={range}
                timeBasis={timeBasis}
              />
            ) : !computedDateRange ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center">
                <CalendarRange className="w-9 h-9 text-slate-400 mb-2.5" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Chọn khoảng ngày để xem
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Xem lại số đo của một khoảng ngày cụ thể.
                </p>
              </div>
            ) : (
              <ElectricalHistoryChart
                key={`${feederId}-${timeBasis}-${computedDateRange.from.getTime()}-${computedDateRange.to.getTime()}`}
                feederId={feederId}
                range={range}
                dateRange={{ from: computedDateRange.from, to: computedDateRange.to }}
                live={false}
                timeBasis={timeBasis}
              />
            )}
          </div>
        )}

        {activeTab === 'faults' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <IotDiagnosticHistoryList feederId={feederId} />
          </div>
        )}

        {activeTab === 'commands' && nodeId && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {/* Tạm: BE chưa có API lệnh theo mạch nên gọi theo node của mạch; đổi sang feeder khi BE có. */}
            <IotCommandHistoryList nodeId={nodeId} />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default FeederHistoryModal
