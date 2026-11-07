import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
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
import { NOTIFICATION_TARGET_PARAMS } from '../../utils/notifications/notificationRoute'
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

  // Tên địa bàn theo commune_id (ưu tiên tên do Backend trả trong danh sách cột đèn)
  const communeNames = useMemo(() => {
    const map: Record<string, string> = {}
    poles.forEach((p) => {
      if (p.commune_id && p.commune_name) map[p.commune_id] = p.commune_name
    })
    return map
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

  // 2b. Đến từ thông báo (?report=<id>): đưa về đúng trang bảng và làm nổi bật dòng đó
  const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null)
  const sawFetchingRef = useRef(false)
  const targetReportId = searchParams.get(NOTIFICATION_TARGET_PARAMS.citizenReport)

  // Có thông báo mới trỏ tới: tải lại danh sách để chắc chắn có phản ánh đó
  useEffect(() => {
    if (!targetReportId) return
    sawFetchingRef.current = false
    dispatch(fetchReportsRequest())
  }, [targetReportId, dispatch])

  useEffect(() => {
    if (isFetchingList) sawFetchingRef.current = true
  }, [isFetchingList])

  useEffect(() => {
    if (!targetReportId || isFetchingList || !sawFetchingRef.current) return

    const clearTargetParam = () => {
      const next = new URLSearchParams(searchParams)
      next.delete(NOTIFICATION_TARGET_PARAMS.citizenReport)
      setSearchParams(next, { replace: true })
    }

    const indexAll = items.findIndex((i) => i.report_id === targetReportId)
    if (indexAll < 0) {
      toast.info('Phản ánh này không còn trong danh sách.')
      clearTargetParam()
      return
    }

    const target = items[indexAll]
    const passesFilter =
      (statusFilter.length === 0 || !target.status || statusFilter.includes(target.status)) &&
      (communeFilter.length === 0 || !target.commune_id || communeFilter.includes(target.commune_id)) &&
      !poleFilter

    let position = indexAll
    if (!passesFilter) {
      // Bỏ bộ lọc đang che mục cần xem
      dispatch(setStatusFilter([]))
      dispatch(setCommuneFilter([]))
      dispatch(setPoleFilter(null))
    } else {
      position = items
        .filter(
          (i) =>
            (statusFilter.length === 0 || !i.status || statusFilter.includes(i.status)) &&
            (communeFilter.length === 0 || !i.commune_id || communeFilter.includes(i.commune_id))
        )
        .findIndex((i) => i.report_id === targetReportId)
    }
    dispatch(setPage(Math.floor(Math.max(position, 0) / pageSize) + 1))

    const next = new URLSearchParams(searchParams)
    next.delete(NOTIFICATION_TARGET_PARAMS.citizenReport)
    if (!passesFilter) {
      next.delete('status')
      next.delete('pole_id')
    }
    setSearchParams(next, { replace: true })

    setHighlightedReportId(targetReportId)
    window.setTimeout(() => {
      document
        .querySelector(`[data-report-id="${CSS.escape(targetReportId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    window.setTimeout(() => setHighlightedReportId(null), 6000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetReportId, isFetchingList, items])

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
    dispatch(clearReportDetail())
  }

  const handleMerge = (data: MergeCitizenReportRequest) => {
    if (!selectedReportId) return
    dispatch(mergeReportRequest({ reportId: selectedReportId, data }))
    dispatch(clearReportDetail())
  }

  const handleReject = (data: RejectCitizenReportRequest) => {
    if (!selectedReportId) return
    dispatch(rejectReportRequest({ reportId: selectedReportId, data }))
    dispatch(clearReportDetail())
  }

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Bộ lọc tác nghiệp Toolbar dạng Dropdown trên 1 hàng */}
      <CitizenReviewFilters
        statusFilter={statusFilter}
        communeFilter={communeFilter}
        poleFilter={poleFilter}
        availableCommunes={availableCommunes}
        communeNames={communeNames}
        pendingCount={pendingCount}
        onStatusChange={handleStatusChange}
        onCommuneChange={handleCommuneChange}
        onPoleChange={handlePoleChange}
      />

      {/* Bảng danh sách hàng đợi với dữ liệu đã lọc client-side */}
      <CitizenReviewTable
        items={paginatedItems}
        poles={poles}
        communeNames={communeNames}
        total={filteredItems.length}
        page={page}
        pageSize={pageSize}
        isLoading={isFetchingList}
        onPageChange={handlePageChange}
        onSelectReport={handleSelectReport}
        highlightedReportId={highlightedReportId}
      />

      {/* Popup Modal Thẩm định chi tiết Split-View căn giữa */}
      <CitizenReviewDetailModal
        isOpen={Boolean(selectedReportId)}
        detail={selectedDetail}
        poles={poles}
        communeNames={communeNames}
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
