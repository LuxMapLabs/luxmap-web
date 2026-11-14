import React, { useEffect, useState } from 'react'
import { Check, Clock, ClipboardList, Download, FileSpreadsheet, Loader2, MessageSquareWarning, ShieldCheck } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { SuperiorCsvExportType } from './SuperiorToolbar'

interface ReportOption {
  type: SuperiorCsvExportType
  title: string
  description: string
  icon: React.ReactNode
  /** Báo cáo này đổi theo khoảng thời gian đang chọn ở header */
  byPeriod: boolean
}

const REPORTS: ReportOption[] = [
  {
    type: 'fixture-status',
    title: 'Hiện trạng chiếu sáng',
    description: 'Số cột và bóng đạt chuẩn, sáng yếu, mất sáng, chưa khảo sát',
    icon: <FileSpreadsheet className="h-4 w-4 text-teal-600" />,
    byPeriod: false,
  },
  {
    type: 'repair-timeliness',
    title: 'Tiến độ và SLA sửa chữa',
    description: 'Tỷ lệ sửa đúng hạn, trễ hạn, lệnh đang quá hạn',
    icon: <Clock className="h-4 w-4 text-blue-600" />,
    byPeriod: true,
  },
  {
    type: 'warranty',
    title: 'Bảo hành thiết bị',
    description: 'Bóng hết hạn và sắp hết hạn trong 90 ngày tới',
    icon: <ShieldCheck className="h-4 w-4 text-amber-600" />,
    byPeriod: false,
  },
  {
    type: 'citizen-feedback',
    title: 'Phản ánh của người dân',
    description: 'Số phản ánh quét QR đã duyệt, gộp, từ chối',
    icon: <MessageSquareWarning className="h-4 w-4 text-emerald-600" />,
    byPeriod: true,
  },
  {
    type: 'work-orders',
    title: 'Lệnh công tác',
    description: 'Tiến độ hoàn thành theo từng loại nhiệm vụ',
    icon: <ClipboardList className="h-4 w-4 text-indigo-600" />,
    byPeriod: true,
  },
]

interface SuperiorExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (types: SuperiorCsvExportType[]) => void
  segmentLabel: string
  periodLabel: string
}

export const SuperiorExportModal: React.FC<SuperiorExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  segmentLabel,
  periodLabel,
}) => {
  const [selected, setSelected] = useState<SuperiorCsvExportType[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // Mỗi lần mở lại bắt đầu với danh sách trống
  useEffect(() => {
    if (isOpen) setSelected([])
  }, [isOpen])

  const allSelected = selected.length === REPORTS.length

  const toggle = (type: SuperiorCsvExportType) =>
    setSelected((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))

  const handleExport = async () => {
    // Giữ đúng thứ tự hiển thị khi tải
    const ordered = REPORTS.map((r) => r.type).filter((t) => selected.includes(t))
    setIsExporting(true)
    try {
      await onExport(ordered)
      onClose()
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? () => {} : onClose}
      title="Xuất báo cáo CSV"
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selected.length === 0 || isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4A7AA3] px-4 py-2 text-xs font-bold text-white hover:bg-[#3B6385] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isExporting ? 'Đang tải...' : selected.length > 0 ? `Tải ${selected.length} báo cáo` : 'Chọn báo cáo để tải'}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-slate-600">
        Báo cáo lấy theo <strong className="text-slate-900">{segmentLabel}</strong>. Các báo cáo có nhãn "theo kỳ"
        tính trong <strong className="text-slate-900">{periodLabel.toLowerCase()}</strong>.
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-500">
          Đã chọn {selected.length}/{REPORTS.length}
        </span>
        <button
          type="button"
          onClick={() => setSelected(allSelected ? [] : REPORTS.map((r) => r.type))}
          disabled={isExporting}
          className="text-[12px] font-bold text-[#4A7AA3] hover:text-[#3B6385] disabled:opacity-50 cursor-pointer"
        >
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>

      <ul className="mt-2 space-y-2">
        {REPORTS.map((report) => {
          const checked = selected.includes(report.type)
          return (
            <li key={report.type}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                  checked ? 'border-[#8FB8DA] bg-[#F3F8FC]' : 'border-[#DCE8F3] bg-white hover:bg-[#F8FBFD]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isExporting}
                  onChange={() => toggle(report.type)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    checked ? 'border-[#4A7AA3] bg-[#4A7AA3] text-white' : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-900">
                    {report.icon}
                    {report.title}
                    {report.byPeriod && (
                      <span className="rounded-full bg-[#E4EFF8] px-2 py-0.5 text-[11px] font-semibold text-[#3B6385]">
                        theo kỳ
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-slate-500">{report.description}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
