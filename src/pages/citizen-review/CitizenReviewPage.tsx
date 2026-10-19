import React, { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  fetchReportsRequest,
  fetchPendingCountRequest,
  fetchReportDetailRequest,
  clearReportDetail,
  setStatusFilter,
  setCommuneFilter,
  setPoleFilter,
  setPage,
  acceptReportRequest,
  mergeReportRequest,
  rejectReportRequest,
} from '../../feature/citizen-reports/citizenReportsSlice'
import { fetchAssetsRequest } from '../../feature/assets/assetSlice'
import { CitizenReviewFilters } from './components/CitizenReviewFilters'
import { CitizenReviewTable } from './components/CitizenReviewTable'
import { CitizenReviewDetailModal } from './components/CitizenReviewDetailModal'
import type { CitizenReportStatus } from '../../types/common/enums'
import type {
  AcceptCitizenReportRequest,
  MergeCitizenReportRequest,
  RejectCitizenReportRequest,
} from '../../types/citizen-reports/citizen-reports'

export const CitizenReviewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    items,
    page,
    pageSize,
    isFetchingList,
    statusFilter,
    communeFilter,
    poleFilter,
    selectedReportId,
    selectedDetail,
    isFetchingDetail,
    isSubmittingDecision,
    pendingCount,
  } = useSelector((state: RootState) => state.citizenReports)

  const { poles } = useSelector((state: RootState) => state.assets)

  // Danh sách xã/phường có sẵn trích xuất từ poles
  const availableCommunes = useMemo(() => {
    const set = new Set<string>()
    poles.forEach((p) => {
      if (p.commune_id) set.add(p.commune_id)
    })
    return Array.from(set).sort()
  }, [poles])

  // 1. Khi mount: fetch danh sách assets để có xã/phường và fetch toàn bộ hàng đợi phản ánh
  useEffect(() => {
    dispatch(fetchAssetsRequest())
    dispatch(fetchReportsRequest())
    dispatch(fetchPendingCountRequest())
  }, [dispatch])

  // 2. Đồng bộ query params từ URL (?status=...&pole_id=...)
  useEffect(() => {
    const urlPole = searchParams.get('pole_id')
    const urlStatus = searchParams.get('status')

    if (urlPole && urlPole !== poleFilter) {
      dispatch(setPoleFilter(urlPole))
    }
    if (urlStatus) {
      const statuses = urlStatus.split(',').filter(Boolean) as CitizenReportStatus[]
      if (statuses.length > 0 && statuses.join(',') !== statusFilter.join(',')) {
        dispatch(setStatusFilter(statuses))
      }
    }
  }, [searchParams, dispatch, poleFilter, statusFilter])

  // 3. Lọc Client-side mượt mà không cần gọi lại API
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Lọc theo trạng thái
      if (statusFilter.length > 0 && item.status && !statusFilter.includes(item.status)) {
        return false
      }
      // 2. Lọc theo xã / địa bàn quản lý
      if (communeFilter.length > 0 && item.commune_id && !communeFilter.includes(item.commune_id)) {
        return false
      }
      // 3. Lọc theo mã cột (hỗ trợ tìm kiếm cả external_ref thực địa lẫn pole_id)
      if (poleFilter && poleFilter.trim()) {
        const query = poleFilter.trim().toLowerCase()
        const matchedPole = poles.find((p) => p.pole_id === item.pole_id)
        const extRef = matchedPole?.external_ref?.toLowerCase() || ''
        const poleId = item.pole_id?.toLowerCase() || ''
        if (!extRef.includes(query) && !poleId.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [items, statusFilter, communeFilter, poleFilter, poles])

  // 4. Phân trang Client-side
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  // Handlers
  const handleStatusChange = (statuses: CitizenReportStatus[]) => {
    dispatch(setStatusFilter(statuses))
    dispatch(setPage(1))
    if (statuses.length > 0) {
      searchParams.set('status', statuses.join(','))
    } else {
      searchParams.delete('status')
    }
    setSearchParams(searchParams, { replace: true })
  }

  const handleCommuneChange = (communes: string[]) => {
    dispatch(setCommuneFilter(communes))
    dispatch(setPage(1))
  }

  const handlePoleChange = (poleId: string | null) => {
    dispatch(setPoleFilter(poleId))
    dispatch(setPage(1))
    if (poleId) {
      searchParams.set('pole_id', poleId)
    } else {
      searchParams.delete('pole_id')
    }
    setSearchParams(searchParams, { replace: true })
  }

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage))
  }

  const handleSelectReport = (reportId: string) => {
    dispatch(fetchReportDetailRequest(reportId))
  }

  const handleCloseModal = () => {
    dispatch(clearReportDetail())
  }

  const handleAccept = (data: AcceptCitizenReportRequest) => {
    if (!selectedReportId) return
    dispatch(acceptReportRequest({ reportId: selectedReportId, data }))
  }

  const handleMerge = (data: MergeCitizenReportRequest) => {
    if (!selectedReportId) return
    dispatch(mergeReportRequest({ reportId: selectedReportId, data }))
  }

  const handleReject = (data: RejectCitizenReportRequest) => {
    if (!selectedReportId) return
    dispatch(rejectReportRequest({ reportId: selectedReportId, data }))
  }

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Bộ lọc tác nghiệp Toolbar dạng Dropdown trên 1 hàng */}
      <CitizenReviewFilters
        statusFilter={statusFilter}
        communeFilter={communeFilter}
        poleFilter={poleFilter}
        availableCommunes={availableCommunes}
        pendingCount={pendingCount}
        onStatusChange={handleStatusChange}
        onCommuneChange={handleCommuneChange}
        onPoleChange={handlePoleChange}
      />

      {/* Bảng danh sách hàng đợi với dữ liệu đã lọc client-side */}
      <CitizenReviewTable
        items={paginatedItems}
        poles={poles}
        total={filteredItems.length}
        page={page}
        pageSize={pageSize}
        isLoading={isFetchingList}
        onPageChange={handlePageChange}
        onSelectReport={handleSelectReport}
      />

      {/* Popup Modal Thẩm định chi tiết Split-View căn giữa */}
      <CitizenReviewDetailModal
        isOpen={Boolean(selectedReportId)}
        detail={selectedDetail}
        poles={poles}
        isLoading={isFetchingDetail}
        isSubmittingDecision={isSubmittingDecision}
        onClose={handleCloseModal}
        onAccept={handleAccept}
        onMerge={handleMerge}
        onReject={handleReject}
      />
    </div>
  )
}

export default CitizenReviewPage
