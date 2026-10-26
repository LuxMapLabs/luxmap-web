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
        {/* Thanh công cụ góc phải: Mốc giờ đồng bộ & Nút Làm mới (Khử 100% chữ thừa & nhãn cứng) */}
        <div className="flex items-center justify-end gap-3 py-0.5">
          {lastRefreshedAt && (
            <span className="text-[11px] font-mono text-slate-400">
              Đồng bộ lúc: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{formatFullDateTime(lastRefreshedAt)}</strong>
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            title="Làm mới số liệu hệ thống"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
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

        {/* 3. Tầng 1: Hạ Tầng Lưu Trữ Máy Chủ & Phân Vùng MinIO S3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6">
            <StorageDistributionCard storage={status?.storage} />
          </div>
          <div className="lg:col-span-6">
            <StorageBucketsCard storage={status?.storage} />
          </div>
        </div>

        {/* 4. Tầng 2: Nhân Sự Tác Nghiệp & Độ Phủ Bản Đồ GIS (100% Real Backend Data) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6">
            <RbacOverviewCard users={users} />
          </div>
          <div className="lg:col-span-6">
            <GisCoverageCard communes={communes} />
          </div>
        </div>

        {/* 5. Tầng 3: Bảng Quản Trị Chi Tiết 4 Tiến Trình Chạy Ngầm (100% Real Backend Data) */}
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
