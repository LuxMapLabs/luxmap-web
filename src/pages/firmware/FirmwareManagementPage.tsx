import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Plus,
  Filter,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../redux/rootReducer'
import type { RegisterArtifactVersionRequest } from '../../types/admin/artifact-versions'
import {
  fetchArtifactVersionsRequest,
  registerArtifactVersionRequest,
  fetchArtifactVersionUsageRequest,
  clearSelectedUsage,
  resetRegisterState,
  setComponentFilter,
} from '../../feature/adminArtifactVersions/artifactVersionSlice'
import { fetchUsersRequest } from '../../feature/users/userSlice'
import { ArtifactVersionTable } from './components/ArtifactVersionTable'
import { RegisterFirmwareModal } from './components/RegisterFirmwareModal'
import { ArtifactUsageModal } from './components/ArtifactUsageModal'
import { TablePagination } from '../assets/components/common/TablePagination'

export const FirmwareManagementPage: React.FC = () => {
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

  const users = useSelector((state: RootState) => state.adminUsers?.users || [])
  const currentUser = useSelector((state: RootState) => state.auth?.user)

  // Tải danh sách người dùng để map họ tên thật thay vì hiện ID
  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchUsersRequest({ page: 1, page_size: 100 }))
    }
  }, [dispatch, users.length])

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Giữ danh sách thành phần ổn định, không bị co lại hay biến mất khi chọn lọc 1 mục
  const [availableComponents, setAvailableComponents] = useState<string[]>([
    'node_firmware',
    'lux_module_firmware',
  ])

  useEffect(() => {
    if (items.length > 0) {
      setAvailableComponents((prev) => {
        const nextSet = new Set(prev)
        items.forEach((it) => {
          if (it.component) nextSet.add(it.component)
        })
        return Array.from(nextSet).sort()
      })
    }
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
    <div className="h-full w-full bg-slate-50 overflow-y-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 select-none">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        {/* 1. Header Toolbar (Không lặp lại Header - Bắt đầu ngay với các công cụ nghiệp vụ) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search & Filter */}
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* 1. Search Box (Đầu tiên bên trái) */}
            <div className="relative flex-1 min-w-[260px] max-w-md">
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
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Component Filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold shadow-2xs shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={componentFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1"
              >
                <option value="">Tất cả thành phần</option>
                {availableComponents.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Action Button */}
          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
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
          items={displayedItems}
          isLoading={isLoading}
          users={users}
          currentUser={currentUser}
          onViewUsage={handleViewUsage}
          onOpenRegister={handleOpenRegister}
        />

        {/* 4. Pagination */}
        {total > 0 && (
          <TablePagination
            currentListLength={total}
            currentPage={page}
            pageSize={pageSize}
            totalPages={totalPages}
            unitLabel="phiên bản"
            isLoading={isLoading}
            onPageChange={handlePageChange}
          />
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
    </div>
  )
}

export default FirmwareManagementPage
