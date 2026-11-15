import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'
import { reportsAPI } from '../../feature/reports/reportsAPI'
import {
  fetchReportsRequest,
  openReportRequest,
  closeReport,
} from '../../feature/reports/reportsSlice'
import type { SuperiorReportItem } from '../../types/reports/report'
import { ReportFilterBar } from './components/ReportFilterBar'
import { ReportTable } from './components/ReportTable'
import { ReportDetailModal } from './components/ReportDetailModal'
import { TablePagination } from '../assets/components/common/TablePagination'
import { exportReportToPdf } from '../../utils/reports/reportPdfGenerator'

export const SuperiorReportsPage: React.FC = () => {
  const dispatch = useDispatch()
  // Trạng thái ngày/tháng được chọn (mặc định tháng hiện tại, tháng tính từ 0)
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear())

  // Tên xã lấy từ hồ sơ tài khoản đang đăng nhập
  const userCommunes = useSelector((state: RootState) => state.auth.user?.communes)
  const communeNames = useMemo(() => {
    const map: Record<string, string> = {}
    userCommunes?.forEach((c) => {
      if (c.commune_id && c.name) map[c.commune_id] = c.name
    })
    return map
  }, [userCommunes])

  // Bộ lọc
  const [filterPhase, setFilterPhase] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Dữ liệu & Loading: tải qua Saga, lưu ở store reports
  const { reports, loading: isLoading, loadFailed, selectedReport } = useSelector(
    (state: RootState) => state.reports
  )

  // Phân trang phía trình duyệt trên danh sách đã lọc
  const PAGE_SIZE = 10
  const [page, setPage] = useState<number>(1)

  // Chọn nhiều dòng để tải PDF một lượt
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkExporting, setIsBulkExporting] = useState<boolean>(false)

  // Yêu cầu Saga tải danh sách báo cáo của tháng đang chọn
  const loadReports = () => {
    dispatch(fetchReportsRequest({ month: currentMonth, year: currentYear, searchQuery, communeNames }))
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, communeNames])

  // Lọc tìm kiếm theo thời gian thực phía client
  const filteredReports = useMemo(() => {
    return reportsAPI.filterReports(reports, {
      taskKind: filterPhase,
      searchQuery: searchQuery,
      month: currentMonth,
      year: currentYear,
    })
  }, [reports, filterPhase, searchQuery, currentMonth, currentYear])

  // Thao tác xem chi tiết: mở modal ngay, Saga tải thêm ảnh evidence / ghi chú
  const handleViewReport = (report: SuperiorReportItem) => {
    dispatch(openReportRequest(report))
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

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE))
  const pageReports = useMemo(
    () => filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredReports, page]
  )

  // Đổi bộ lọc hoặc tìm kiếm thì về trang đầu; danh sách ngắn lại thì không để trang vượt quá số trang
  useEffect(() => {
    setPage(1)
  }, [filterPhase, searchQuery, currentMonth, currentYear])
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  // Bỏ các dòng đã chọn không còn nằm trong danh sách đang lọc
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredReports.some((r) => r.workOrderId === id)))
  }, [filteredReports])

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Chọn tất cả áp dụng cho các dòng đang hiển thị ở trang hiện tại
  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const pageIds = pageReports.map((r) => r.workOrderId)
      const allOnPage = pageIds.every((id) => prev.includes(id))
      return allOnPage ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds]))
    })

  const handleExportSelected = async () => {
    const targets = filteredReports.filter((r) => selectedIds.includes(r.workOrderId))
    if (targets.length === 0) return
    setIsBulkExporting(true)
    const toastId = toast.loading(`Đang tạo biên bản PDF 1/${targets.length}...`)
    const failed: string[] = []
    for (let i = 0; i < targets.length; i++) {
      toast.loading(`Đang tạo biên bản PDF ${i + 1}/${targets.length}...`, { id: toastId })
      try {
        await exportReportToPdf(targets[i])
      } catch (err) {
        console.error('Lỗi xuất PDF:', err)
        failed.push(targets[i].workOrderId)
      }
    }
    setIsBulkExporting(false)
    if (failed.length === 0) {
      toast.success(`Đã tải ${targets.length} biên bản PDF`, { id: toastId })
      setSelectedIds([])
    } else {
      toast.warning(`Đã tải ${targets.length - failed.length}/${targets.length} biên bản, lỗi: ${failed.join(', ')}`, { id: toastId })
    }
  }

  const handleResetToday = () => {
    const today = new Date()
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setFilterPhase('all')
    setSearchQuery('')
    toast.info('Đã trở về thời gian hiện tại')
  }

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col gap-4 pt-4 pb-2 [&>*]:shrink-0">
      {/* 2. THANH BỘ LỌC ĐỒNG BỘ 100% VỚI WORK-SCHEDULE */}
      <ReportFilterBar
        currentMonth={currentMonth}
        currentYear={currentYear}
        filterPhase={filterPhase}
        searchQuery={searchQuery}
        onSelectMonthYear={(m, y) => {
          setCurrentMonth(m)
          setCurrentYear(y)
        }}
        onResetToday={handleResetToday}
        onFilterPhaseChange={(phase) => setFilterPhase(phase)}
        onSearchChange={(q) => setSearchQuery(q)}
        onRefresh={loadReports}
        isLoading={isLoading}
      />

      {/* 3. BẢNG DANH SÁCH BÁO CÁO NGHIỆM THU */}
      {loadFailed ? (
        <div className="rounded-[20px] border border-rose-200 bg-white p-12 text-center">
          <h4 className="text-sm font-bold text-slate-800">Không tải được danh sách báo cáo</h4>
          <p className="mt-1 text-xs text-slate-500">Kiểm tra kết nối tới máy chủ rồi thử lại.</p>
          <button
            type="button"
            onClick={loadReports}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : (
      <ReportTable
        reports={pageReports}
        totalCount={filteredReports.length}
        isLoading={isLoading}
        onViewReport={handleViewReport}
        onExportPdf={handleExportPdf}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onExportSelected={handleExportSelected}
        isBulkExporting={isBulkExporting}
      />
      )}

      {!isLoading && filteredReports.length > 0 && (
        <TablePagination
          currentListLength={filteredReports.length}
          currentPage={page}
          pageSize={PAGE_SIZE}
          totalPages={totalPages}
          unitLabel="báo cáo nghiệm thu"
          onPageChange={setPage}
        />
      )}

      {/* 4. MODAL XEM VĂN BẢN NGHIỆM THU A4 VÀ XUẤT PDF */}
      <ReportDetailModal
        isOpen={selectedReport !== null}
        report={selectedReport}
        onClose={() => dispatch(closeReport())}
      />
    </div>
  )
}

export default SuperiorReportsPage
