import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { RootState } from '../../redux/rootReducer'
import type { JobStatusItem } from '../../types/admin/system'
import { fetchSystemStatusRequest } from '../../feature/adminSystem/adminSystemSlice'
import { fetchUsersRequest } from '../../feature/users/userSlice'
import { fetchCommunesRequest } from '../../feature/communes/communeSlice'
import { IncidentBanner } from './components/IncidentBanner'
import { StorageDistributionCard } from './components/StorageDistributionCard'
import { StorageBucketsCard } from './components/StorageBucketsCard'
import { BackgroundJobsCard } from './components/BackgroundJobsCard'
import { RbacOverviewCard } from './components/RbacOverviewCard'
import { GisCoverageCard } from './components/GisCoverageCard'
import { SurveyPipelineCard } from './components/SurveyPipelineCard'
import { JobDetailModal } from './components/JobDetailModal'
import { formatFullDateTime } from '../../utils/admin-dashboard/formatters'
import { getIncidentCount } from '../../utils/admin-dashboard/incidents'
import { enterDelay } from '../../utils/admin-dashboard/motion'

export const AdminDashboardPage: React.FC = () => {
  const dispatch = useDispatch()
  const { status, isLoading, error, lastRefreshedAt } = useSelector(
    (state: RootState) => state.adminSystem
  )
  const { users } = useSelector((state: RootState) => state.adminUsers)
  const { communes } = useSelector((state: RootState) => state.adminCommunes)

  const [selectedJob, setSelectedJob] = useState<JobStatusItem | null>(null)

  const handleRefresh = () => {
    dispatch(fetchSystemStatusRequest())
    dispatch(fetchUsersRequest({ page: 1, page_size: 100 }))
    dispatch(fetchCommunesRequest())
  }

  useEffect(() => {
    handleRefresh()
  }, [dispatch])

  const jobs = status?.jobs || []
  const incidentCount = getIncidentCount(jobs, status?.storage)

  // Chỉ hiển thị khối Survey Pipeline nếu thực sự có tiến trình trắc đạc đang chạy hoặc có dữ liệu lỗi
  const survey = status?.survey_processing
  const surveyCounts = survey?.by_status
  const totalSurveyTasks =
    (surveyCounts?.not_started ?? 0) +
    (surveyCounts?.queued ?? 0) +
    (surveyCounts?.processing ?? 0) +
    (surveyCounts?.succeeded ?? 0) +
    (surveyCounts?.failed ?? 0)
  const hasSurveyActivity = totalSurveyTasks > 0 || (survey?.stuck ?? 0) > 0 || (survey?.recent_failures?.length ?? 0) > 0

  // Câu trạng thái: nói thẳng tình hình hệ thống thay vì bắt người xem tự suy ra
  const statusSentence = !status
    ? isLoading
      ? 'Đang đồng bộ số liệu hệ thống...'
      : 'Chưa có số liệu hệ thống.'
    : incidentCount > 0
    ? `Có ${incidentCount} mục cần chú ý.`
    : 'Hệ thống hoạt động bình thường.'

  return (
    <div className="admin-glass-root w-full h-full overflow-y-auto custom-scrollbar text-slate-800 dark:text-slate-200">
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20">
        <div className="glass-slab p-5 md:p-7 space-y-5">
          {/* Tiêu đề trang, câu trạng thái, giờ đồng bộ và nút làm mới */}
          <header className="glass-enter flex flex-wrap items-start justify-between gap-4" style={enterDelay(0)}>
            <div>
              <h2
                className="admin-display text-3xl font-semibold text-slate-900 dark:text-white"
                aria-live="polite"
              >
                {statusSentence}
              </h2>
              {lastRefreshedAt && (
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Đồng bộ lúc {formatFullDateTime(lastRefreshedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Làm mới số liệu hệ thống"
                className="glass-btn glass-btn-solid"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </header>

          {/* Lỗi nạp dữ liệu từ máy chủ (nếu có) */}
          {error && (
            <div
              role="alert"
              className="glass-item flex items-center gap-3 border-danger/30 px-4 py-3 text-xs text-slate-700 dark:text-slate-200"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <strong>Không thể đồng bộ dữ liệu giám sát hệ thống:</strong> {error}
              </div>
              <button type="button" onClick={handleRefresh} className="glass-btn">
                Thử lại
              </button>
            </div>
          )}

          {/* Hàng 1: dung lượng, worker, mục cần chú ý */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr_0.95fr]">
            <div className="glass-enter h-full" style={enterDelay(1)}>
              <StorageDistributionCard storage={status?.storage} />
            </div>
            <div className="glass-enter h-full" style={enterDelay(2)}>
              <BackgroundJobsCard jobs={jobs} onSelectJob={(job) => setSelectedJob(job)} />
            </div>
            <div className="glass-enter h-full" style={enterDelay(3)}>
              <IncidentBanner jobs={jobs} storage={status?.storage} onSelectJob={(job) => setSelectedJob(job)} />
            </div>
          </div>

          {/* Hàng 2: 4 phân vùng MinIO S3 */}
          <StorageBucketsCard storage={status?.storage} />

          {/* Hàng 3: nhân sự và độ phủ bản đồ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass-enter h-full" style={enterDelay(8)}>
              <RbacOverviewCard users={users} />
            </div>
            <div className="glass-enter h-full" style={enterDelay(9)}>
              <GisCoverageCard communes={communes} />
            </div>
          </div>

          {/* Đường ống khảo sát trắc đạc & AI (chỉ hiện khi có tiến trình hoặc có lỗi) */}
          {hasSurveyActivity && (
            <div className="glass-enter" style={enterDelay(10)}>
              <SurveyPipelineCard survey={survey} />
            </div>
          )}
        </div>

        {/* Modal chi tiết tác vụ và nhật ký */}
        <JobDetailModal
          job={selectedJob}
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />
      </div>
    </div>
  )
}

export default AdminDashboardPage
