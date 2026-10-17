import React, { useState, useEffect, useMemo } from 'react'
import { Inbox, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { reportsAPI } from '../../feature/reports/reportsAPI'
import type { SuperiorReportItem } from '../../types/reports/report'
import { ReportFilterBar } from './components/ReportFilterBar'
import { ReportTable } from './components/ReportTable'
import { ReportDetailModal } from './components/ReportDetailModal'
import { exportReportToPdf } from '../../utils/reports/reportPdfGenerator'

export const SuperiorReportsPage: React.FC = () => {
  // Trạng thái ngày/tháng được chọn (mặc định tháng hiện tại: Tháng 10 năm 2026)
  const [currentMonth, setCurrentMonth] = useState<number>(9) // 0-indexed (9 là Tháng 10)
  const [currentYear, setCurrentYear] = useState<number>(2026)

  // Bộ lọc
  const [filterPhase, setFilterPhase] = useState<string>('all')
  const [filterCommune, setFilterCommune] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Dữ liệu & Loading
  const [reports, setReports] = useState<SuperiorReportItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Modal chi tiết
  const [selectedReport, setSelectedReport] = useState<SuperiorReportItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Tải danh sách báo cáo
  const loadReports = async () => {
    setIsLoading(true)
    try {
      const data = await reportsAPI.getVerifiedReports({
        taskKind: filterPhase,
        communeId: filterCommune,
        searchQuery: searchQuery,
        month: currentMonth,
        year: currentYear,
      })
      setReports(data)
    } catch {
      toast.error('Không thể đồng bộ danh sách báo cáo từ máy chủ')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [filterPhase, filterCommune, currentMonth, currentYear])

  // Lọc tìm kiếm theo thời gian thực phía client
  const filteredReports = useMemo(() => {
    return reportsAPI.filterLocalMockReports(reports, {
      taskKind: filterPhase,
      communeId: filterCommune,
      searchQuery: searchQuery,
      month: currentMonth,
      year: currentYear,
    })
  }, [reports, filterPhase, filterCommune, searchQuery, currentMonth, currentYear])

  // Thao tác xem chi tiết
  const handleViewReport = async (report: SuperiorReportItem) => {
    setSelectedReport(report)
    setIsModalOpen(true)
    // Tải thêm thông tin chi tiết (ảnh evidence, v.v. nếu có từ máy chủ)
    try {
      const fullDetail = await reportsAPI.getReportDetail(report.workOrderId)
      setSelectedReport(fullDetail)
    } catch {
      // Giữ nguyên thông tin tóm tắt nếu gặp lỗi
    }
  }

  // Thao tác xuất PDF nhanh
  const handleExportPdf = async (report: SuperiorReportItem) => {
    const toastId = toast.loading(`Đang khởi tạo biên bản PDF cho lệnh ${report.workOrderId}...`)
    try {
      await exportReportToPdf(report)
      toast.success(`🎉 Đã xuất thành công biên bản PDF cho lệnh ${report.workOrderId}`, { id: toastId })
    } catch (err) {
      console.error('Lỗi xuất PDF:', err)
      toast.error('Không thể xuất file PDF, vui lòng thử lại', { id: toastId })
    }
  }

  const handleResetToday = () => {
    const today = new Date()
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setFilterPhase('all')
    setFilterCommune('all')
    setSearchQuery('')
    toast.info('Đã trở về thời gian hiện tại')
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      {/* 1. DUY NHẤT 1 THẺ CHỈ SỐ: BÁO CÁO ĐÃ TIẾP NHẬN TỪ QUẢN LÝ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />
        
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-sm shadow-blue-500/10 shrink-0">
            <Inbox className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Báo cáo đã tiếp nhận từ Quản lý
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {isLoading ? '...' : filteredReports.length}
              </span>
              <span className="text-xs sm:text-sm text-slate-500">
                lệnh công tác đã được Quản lý thẩm duyệt nghiệm thu đạt chuẩn
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={isLoading}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Đồng bộ</span>
        </button>
      </div>

      {/* 2. THANH BỘ LỌC ĐỒNG BỘ 100% VỚI WORK-SCHEDULE */}
      <ReportFilterBar
        currentMonth={currentMonth}
        currentYear={currentYear}
        filterPhase={filterPhase}
        filterCommune={filterCommune}
        searchQuery={searchQuery}
        onSelectMonthYear={(m, y) => {
          setCurrentMonth(m)
          setCurrentYear(y)
        }}
        onResetToday={handleResetToday}
        onFilterPhaseChange={(phase) => setFilterPhase(phase)}
        onFilterCommuneChange={(commune) => setFilterCommune(commune)}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* 3. BẢNG DANH SÁCH BÁO CÁO NGHIỆM THU */}
      <ReportTable
        reports={filteredReports}
        isLoading={isLoading}
        onViewReport={handleViewReport}
        onExportPdf={handleExportPdf}
      />

      {/* 4. MODAL XEM VĂN BẢN NGHIỆM THU A4 VÀ XUẤT PDF */}
      <ReportDetailModal
        isOpen={isModalOpen}
        report={selectedReport}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

export default SuperiorReportsPage
