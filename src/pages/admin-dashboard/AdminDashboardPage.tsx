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
import { BackgroundJobsCard } from './components/BackgroundJobsCard'
import { RbacOverviewCard } from './components/RbacOverviewCard'
import { SurveyPipelineCard } from './components/SurveyPipelineCard'
import { JobDetailModal } from './components/JobDetailModal'
import { formatFullDateTime } from './utils/formatters'

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

  // Tính toán trạng thái tổng quát
  const jobs = status?.jobs || []
  const hasJobErrors = jobs.some((j) => j.state === 'failing' || j.state === 'stalled')
  const isDiskLow = status?.storage?.disk?.low ?? false
  const isSystemOptimal = !hasJobErrors && !isDiskLow && !error

  const lockedUsersCount = users.filter((u) => u.status === 'locked').length

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

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-20">
        {/* 1. Thanh Trạng Thái & Đồng Bộ Tối Giản (Không trùng lặp tiêu đề với Header) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isSystemOptimal
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSystemOptimal ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
                }`}
              />
              {isSystemOptimal ? 'Trạng thái: Vận hành tối ưu' : 'Trạng thái: Có sự kiện cần lưu ý'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshedAt && (
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Đồng bộ lúc: <strong className="text-slate-600 dark:text-slate-300">{formatFullDateTime(lastRefreshedAt)}</strong>
              </span>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
              title="Làm mới toàn bộ số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isLoading ? 'Đang cập nhật...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* 2. Trung Tâm Cảnh Báo Sự Cố Khẩn Cấp (Incident & Alert Banner - Tự động ẩn nếu 0 lỗi) */}
        <IncidentBanner
          jobs={jobs}
          storage={status?.storage}
          lockedUsersCount={lockedUsersCount}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />

        {/* Lỗi nạp dữ liệu từ máy chủ (nếu có) */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <div className="flex-1">
              <strong>Không thể đồng bộ dữ liệu giám sát hệ thống:</strong> {error}
            </div>
            <button
              onClick={handleRefresh}
              className="underline font-bold hover:text-rose-900 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* 3. Tầng 1: Tài Nguyên Lưu Trữ & Phân Quyền RBAC + Địa Bàn GIS (100% Real Backend Data) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7">
            <StorageDistributionCard storage={status?.storage} />
          </div>
          <div className="lg:col-span-5">
            <RbacOverviewCard users={users} communes={communes} />
          </div>
        </div>

        {/* 4. Tầng 2: Bảng Quản Trị Chi Tiết 4 Tiến Trình Chạy Ngầm (100% Real Backend Data) */}
        <div className="w-full">
          <BackgroundJobsCard
            jobs={jobs}
            onSelectJob={(job) => setSelectedJob(job)}
          />
        </div>

        {/* 6. Khối Đường Ống Khảo Sát Trắc Đạc & AI (Chỉ hiện khi có tiến trình đang xử lý) */}
        {hasSurveyActivity && (
          <div className="mt-6">
            <SurveyPipelineCard survey={survey} />
          </div>
        )}

        {/* 7. Modal Chi Tiết Tác Vụ & Audit Log */}
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
