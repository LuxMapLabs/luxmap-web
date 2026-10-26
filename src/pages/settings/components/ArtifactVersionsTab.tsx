import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  RefreshCw,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
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
  const [searchQuery, setSearchQuery] = useState('')

  // Trích xuất động danh sách thành phần thực tế từ dữ liệu trả về của Backend, tuyệt đối không dùng mảng mock
  const availableComponents = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.component) set.add(it.component)
    })
    return Array.from(set).sort()
  }, [items])

  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase().trim()
    return items.filter(
      (item) =>
        item.version?.toLowerCase().includes(q) ||
        item.component?.toLowerCase().includes(q) ||
        item.artifact_hash?.toLowerCase().includes(q) ||
        item.created_by?.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

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
      <div className="bg-white rounded-3xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Component Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Phân loại:</span>
            <select
              value={componentFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="">Tất cả thành phần</option>
              {availableComponents.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden lg:inline">
            Tổng cộng <strong className="text-slate-800 font-bold">{total}</strong> bản ghi
          </span>
        </div>

        {/* Center: Search Input (Lấp đầy khoảng trống trung tâm) */}
        <div className="flex-1 max-w-md mx-auto w-full md:w-auto">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo phiên bản (1.0.0), mã băm SHA-256..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
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
            <span>Đăng ký Phiên bản</span>
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
        items={displayedItems}
        isLoading={isLoading}
        onViewUsage={handleViewUsage}
        onOpenRegister={handleOpenRegister}
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
