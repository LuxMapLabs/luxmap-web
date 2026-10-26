import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  RefreshCw,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../../redux/rootReducer'
import type { RegisterArtifactVersionRequest } from '../../../types/admin/artifact-versions'
import {
  fetchArtifactVersionsRequest,
  registerArtifactVersionRequest,
  fetchArtifactVersionUsageRequest,
  clearSelectedUsage,
  resetRegisterState,
  setComponentFilter,
} from '../../../feature/adminArtifactVersions/artifactVersionSlice'
import { ArtifactVersionTable } from './ArtifactVersionTable'
import { RegisterFirmwareModal } from './RegisterFirmwareModal'
import { ArtifactUsageModal } from './ArtifactUsageModal'

const COMPONENT_OPTIONS = [
  { value: '', label: 'Tất cả thành phần' },
  { value: 'node_firmware', label: 'Node Firmware (Tủ IoT)' },
  { value: 'lux_module_firmware', label: 'Lux Sensor (BH1750 xe đo)' },
  { value: 'cv_model', label: 'Mô hình AI (CV YOLO)' },
  { value: 'frame_extractor', label: 'Bóc tách video (Frames)' },
  { value: 'clock_algorithm', label: 'Lịch thiên văn (Clock)' },
  { value: 'association_algorithm', label: 'Ghép nối GIS (Association)' },
  { value: 'classification_algorithm', label: 'Phân loại tài sản (Classification)' },
]

export const ArtifactVersionsTab: React.FC = () => {
  const dispatch = useDispatch()
  const {
    items,
    total,
    page,
    pageSize,
    isLoading,
    error,
    isRegistering,
    registerError,
    registerSuccess,
    selectedUsage,
    isLoadingUsage,
    usageError,
    componentFilter,
  } = useSelector((state: RootState) => state.adminArtifactVersions)

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false)

  const loadData = (targetPage = page, targetFilter = componentFilter) => {
    dispatch(
      fetchArtifactVersionsRequest({
        component: targetFilter || undefined,
        page: targetPage,
        page_size: pageSize,
      })
    )
  }

  useEffect(() => {
    loadData(1, componentFilter)
  }, [dispatch, componentFilter])

  // Theo dõi đăng ký thành công
  useEffect(() => {
    if (registerSuccess) {
      toast.success('Đăng ký phiên bản firmware thành công!')
      setIsRegisterModalOpen(false)
      dispatch(resetRegisterState())
      loadData(1, componentFilter)
    }
  }, [registerSuccess, dispatch, componentFilter])

  const handleFilterChange = (val: string) => {
    dispatch(setComponentFilter(val))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(total / pageSize)) return
    loadData(newPage, componentFilter)
  }

  const handleOpenRegister = () => {
    dispatch(resetRegisterState())
    setIsRegisterModalOpen(true)
  }

  const handleRegisterSubmit = (data: RegisterArtifactVersionRequest) => {
    dispatch(registerArtifactVersionRequest(data))
  }

  const handleViewUsage = (versionId: number) => {
    setIsUsageModalOpen(true)
    dispatch(fetchArtifactVersionUsageRequest(versionId))
  }

  const handleCloseUsage = () => {
    setIsUsageModalOpen(false)
    dispatch(clearSelectedUsage())
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Component Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Phân loại:</span>
            <select
              value={componentFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              {COMPONENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Tổng cộng <strong className="text-slate-800 font-bold">{total}</strong> phiên bản được ghi nhận
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            type="button"
            onClick={() => loadData(page, componentFilter)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenRegister}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng ký Firmware</span>
          </button>
        </div>
      </div>

      {/* 2. Error Notice (nếu có) */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadData(page, componentFilter)}
            className="font-bold underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3. Data Table */}
      <ArtifactVersionTable
        items={items}
        isLoading={isLoading}
        onViewUsage={handleViewUsage}
      />

      {/* 4. Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
          <span>
            Trang <strong className="text-slate-800">{page}</strong> trên{' '}
            <strong className="text-slate-800">{totalPages}</strong> (Hiển thị tối đa {pageSize} bản ghi/trang)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Trang tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <RegisterFirmwareModal
        isOpen={isRegisterModalOpen}
        isSubmitting={isRegistering}
        error={registerError}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmit={handleRegisterSubmit}
      />

      <ArtifactUsageModal
        isOpen={isUsageModalOpen}
        isLoading={isLoadingUsage}
        error={usageError}
        usage={selectedUsage}
        onClose={handleCloseUsage}
      />
    </div>
  )
}
