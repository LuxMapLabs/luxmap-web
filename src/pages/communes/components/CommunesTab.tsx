import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Plus,
  Search,
  X,
  MapPin,
  Compass,
  Maximize2,
  Globe,
  Calendar,
  Edit2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import type {
  CommuneItem,
  CreateCommuneRequest,
  UpdateCommuneRequest,
} from '../../../types/admin/communes'
import {
  fetchCommunesRequest,
  createCommuneRequest,
  updateCommuneRequest,
  setCommuneFilters,
  setCommunePage,
} from '../../../feature/communes/communeSlice'
import { CommuneBboxMap } from './CommuneBboxMap'
import { CommuneFormModal } from './CommuneFormModal'
import { CommuneDetailModal } from './CommuneDetailModal'

export const CommunesTab: React.FC = () => {
  const dispatch = useDispatch()
  const {
    communes,
    total,
    page,
    pageSize,
    isLoading,
    isSubmitting,
    filters,
  } = useSelector((state: RootState) => state.adminCommunes)

  // Local state modals & Selected commune for live map preview
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCommune, setEditingCommune] = useState<CommuneItem | null>(null)
  const [viewingCommune, setViewingCommune] = useState<CommuneItem | null>(null)

  // Tải danh sách địa bàn khi mount (duy trì số trang lưu nếu có)
  useEffect(() => {
    try {
      const savedPage = localStorage.getItem('luxmap_communes_page')
      const targetPage = savedPage ? parseInt(savedPage, 10) : page
      if (!isNaN(targetPage) && targetPage > 0 && targetPage !== page) {
        dispatch(setCommunePage(targetPage))
        dispatch(fetchCommunesRequest({ page: targetPage, page_size: pageSize }))
        return
      }
    } catch {}
    dispatch(fetchCommunesRequest({ page, page_size: pageSize }))
  }, [dispatch, pageSize])

  const handleFilterChange = (
    filterPayload: Partial<{ search: string; hasBbox: 'all' | 'has_bbox' | 'no_bbox' }>
  ) => {
    try {
      localStorage.setItem('luxmap_communes_page', '1')
    } catch {}
    dispatch(setCommuneFilters(filterPayload))
  }

  const handlePageChange = (newPage: number) => {
    try {
      localStorage.setItem('luxmap_communes_page', String(newPage))
    } catch {}
    dispatch(setCommunePage(newPage))
  }

  // Thống kê động từ danh sách dữ liệu thực tế
  const totalCount = total || communes.length
  const hasBboxCount = useMemo(
    () => communes.filter((c) => Boolean(c.bbox)).length,
    [communes]
  )
  const noBboxCount = Math.max(0, totalCount - hasBboxCount)

  // Lọc theo search và trạng thái BBox trên Client
  const filteredCommunes = useMemo(() => {
    let list = communes

    if (filters.hasBbox === 'has_bbox') {
      list = list.filter((c) => Boolean(c.bbox))
    } else if (filters.hasBbox === 'no_bbox') {
      list = list.filter((c) => !c.bbox)
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.commune_id || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [communes, filters.search, filters.hasBbox])

  // Địa bàn đang được chọn hiển thị bản đồ trực tiếp
  const activeCommune = useMemo(() => {
    if (selectedCommuneId) {
      const found = filteredCommunes.find((c) => c.commune_id === selectedCommuneId)
      if (found) return found
    }
    return filteredCommunes[0] || null
  }, [filteredCommunes, selectedCommuneId])

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleCreateSubmit = (payload: { name: string; bbox?: any }) => {
    dispatch(createCommuneRequest(payload as CreateCommuneRequest))
    setIsFormModalOpen(false)
  }

  const handleEditSubmit = (payload: { name: string; bbox?: any }) => {
    if (!editingCommune?.commune_id) return
    dispatch(
      updateCommuneRequest({
        id: editingCommune.commune_id,
        data: payload as UpdateCommuneRequest,
      })
    )
    setIsFormModalOpen(false)
    setEditingCommune(null)
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-3.5">
      {/* 1. Workspace Toolbar: Search, Filter Pills & Add Button */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            placeholder="Tìm theo tên địa bàn, mã xã/thị trấn (VD: COM-001)..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleFilterChange({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition"
              title="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          {/* Quick Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleFilterChange({ hasBbox: 'all' })}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filters.hasBbox === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange({ hasBbox: 'has_bbox' })}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filters.hasBbox === 'has_bbox'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Có BBox ({hasBboxCount})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange({ hasBbox: 'no_bbox' })}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filters.hasBbox === 'no_bbox'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Chưa có ({noBboxCount})
            </button>
          </div>

          {/* Add Commune Button */}
          <button
            type="button"
            onClick={() => {
              setEditingCommune(null)
              setIsFormModalOpen(true)
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm địa bàn</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Spatial Split Console (DUY NHẤT 1 CHẾ ĐỘ ĐỘT PHÁ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* CỘT TRÁI: DANH SÁCH ĐỊA BÀN TƯƠNG TÁC (40% BỀ NGANG) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between min-h-[580px] lg:h-[calc(100vh-215px)]">
          {/* Header Danh mục */}
          <div className="pb-2.5 mb-1 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Danh mục địa bàn ({filteredCommunes.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Nhấp để xem bản đồ
            </span>
          </div>

          {/* Danh sách cuộn */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
            {isLoading ? (
              <div className="space-y-2.5 py-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 animate-pulse space-y-2.5"
                  >
                    <div className="flex justify-between">
                      <div className="h-4 w-16 bg-slate-200 rounded" />
                      <div className="h-4 w-20 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredCommunes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600">Không tìm thấy địa bàn phù hợp</p>
                <p className="text-[11px] text-slate-400">
                  Thử thay đổi từ khóa tìm kiếm hoặc thiết lập lại bộ lọc trạng thái BBox.
                </p>
              </div>
            ) : (
              filteredCommunes.map((item) => {
                const isSelected = item.commune_id === activeCommune?.commune_id
                const hasBbox = Boolean(item.bbox)
                const bbox = item.bbox

                return (
                  <div
                    key={item.commune_id}
                    onClick={() => setSelectedCommuneId(item.commune_id || '')}
                    className={`group p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/25'
                        : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                    }`}
                  >
                    {/* Header item */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100/90 text-slate-700 border border-slate-200/80">
                        {item.commune_id}
                      </span>

                      {hasBbox ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>Đã có BBox</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Chưa có BBox</span>
                        </span>
                      )}
                    </div>

                    {/* Tên & Ngày cập nhật */}
                    <div>
                      <h4
                        className={`text-xs sm:text-sm font-bold tracking-tight transition-colors line-clamp-1 ${
                          isSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {item.name || 'Chưa đặt tên'}
                      </h4>
                      <p className="text-[10.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Cập nhật: {formatDate(item.updated_at || item.created_at)}</span>
                      </p>
                    </div>

                    {/* Tọa độ tóm tắt */}
                    <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/70 text-[10.5px] font-mono text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">BBox:</span>
                        {hasBbox && bbox && typeof bbox.min_lng === 'number' ? (
                          <span className="font-medium text-emerald-800">
                            [{bbox.min_lng.toFixed(2)}, {bbox.min_lat?.toFixed(2)}] → [{bbox.max_lng?.toFixed(2)}, {bbox.max_lat?.toFixed(2)}]
                          </span>
                        ) : (
                          <span className="text-amber-700">Chưa thiết lập</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/50 pt-0.5">
                        <span className="text-slate-400 font-sans">Tâm:</span>
                        <span className="text-slate-700 font-medium">
                          {item.center?.lat && item.center?.lng
                            ? `${item.center.lat.toFixed(4)}, ${item.center.lng.toFixed(4)}`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Quick action buttons với hit-target chuẩn >= 36px */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingCommune(item)
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                        title="Xem chi tiết đầy đủ"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCommune(item)
                          setIsFormModalOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                        title="Chỉnh sửa và vẽ lại khung BBox"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sửa BBox</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Phân trang cột trái tinh gọn chống vỡ layout */}
          <div className="pt-2.5 pb-1 px-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 shrink-0 select-none">
            <div className="text-[11.5px] text-slate-500 font-medium truncate">
              {filteredCommunes.length === 0 ? (
                <span>0 địa bàn</span>
              ) : (
                <span>
                  {(page - 1) * pageSize + 1} - {Math.min((page - 1) * pageSize + filteredCommunes.length, totalCount)} / <strong className="text-slate-800 font-semibold">{totalCount}</strong> địa bàn
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="min-w-[28px] text-center font-mono text-[11px] font-bold text-slate-700 py-0.5 px-2 bg-slate-100/90 rounded-md border border-slate-200/60">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
                title="Trang tiếp theo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: LIVE BBOX VIEWER MAP (60% BỀ NGANG) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[580px] lg:h-[calc(100vh-215px)] relative">
          {activeCommune ? (
            <>
              {/* Header điều khiển bản đồ phân tầng 2 lớp chuyên nghiệp */}
              <div className="p-3 sm:p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-col gap-2 shrink-0 z-10">
                {/* Tầng 1: Định danh địa bàn & Cụm nút hành động */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                        {activeCommune.name || 'Chưa đặt tên'}
                      </h3>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 shrink-0">
                        {activeCommune.commune_id}
                      </span>
                      {activeCommune.bbox ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>Đã có BBox</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                          <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Chưa có BBox</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions trên bản đồ */}
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => setViewingCommune(activeCommune)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommune(activeCommune)
                        setIsFormModalOpen(true)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Sửa BBox</span>
                    </button>
                  </div>
                </div>

                {/* Tầng 2: Thông số GIS phụ thoáng đãng, chống dồn ép */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
                  {activeCommune.bbox && (
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-sans">BBox:</span>
                      <strong className="font-medium text-slate-700">
                        [{activeCommune.bbox.min_lng?.toFixed(2)}, {activeCommune.bbox.min_lat?.toFixed(2)}] → [{activeCommune.bbox.max_lng?.toFixed(2)}, {activeCommune.bbox.max_lat?.toFixed(2)}]
                      </strong>
                    </span>
                  )}
                  {activeCommune.center?.lat && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-sans">Tâm:</span>
                      <strong className="font-medium text-slate-700">
                        {activeCommune.center.lat.toFixed(4)}, {activeCommune.center.lng?.toFixed(4)}
                      </strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-slate-400 font-sans ml-auto">
                    <Calendar className="w-3 h-3" />
                    <span>Cập nhật: {formatDate(activeCommune.updated_at || activeCommune.created_at)}</span>
                  </span>
                </div>
              </div>

              {/* Khung bản đồ vệ tinh MapLibre trực tiếp */}
              <div className="w-full flex-1 relative bg-slate-900">
                <CommuneBboxMap
                  key={activeCommune.commune_id || 'none'}
                  bbox={activeCommune.bbox}
                  communeName={activeCommune.name || ''}
                  readOnly={true}
                  height="100%"
                  initialCenter={
                    activeCommune.center?.lat && activeCommune.center?.lng
                      ? [activeCommune.center.lng, activeCommune.center.lat]
                      : undefined
                  }
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400 space-y-2">
              <Compass className="w-12 h-12 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Chưa chọn địa bàn</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Vui lòng chọn một địa bàn ở danh mục bên trái hoặc bấm nút "Thêm địa bàn" để bắt đầu thiết lập khung toạ độ bản đồ.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modals */}
      <CommuneFormModal
        isOpen={isFormModalOpen}
        isSubmitting={isSubmitting}
        commune={editingCommune}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingCommune(null)
        }}
        onSubmit={editingCommune ? handleEditSubmit : handleCreateSubmit}
      />

      <CommuneDetailModal
        isOpen={Boolean(viewingCommune)}
        commune={viewingCommune}
        onClose={() => setViewingCommune(null)}
        onEdit={(commune) => {
          setViewingCommune(null)
          setEditingCommune(commune)
          setIsFormModalOpen(true)
        }}
      />
    </div>
  )
}

export default CommunesTab
