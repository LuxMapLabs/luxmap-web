import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  RotateCcw,
  Calendar,
  Route,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { fetchSegmentsList } from '../../../feature/dashboard/dashboardAPI'
import { assetAPI } from '../../../feature/assets/assetAPI'
import type { SurveyRecurringItem } from '../../../types/work-schedule/recurring'
import type { SegmentListItem } from '../../../types/assets/segments'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'

interface RecurringSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  communeId?: string
  assignees?: WorkOrderAssignee[]
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ Hai' },
  { value: 2, label: 'Thứ Ba' },
  { value: 3, label: 'Thứ Tư' },
  { value: 4, label: 'Thứ Năm' },
  { value: 5, label: 'Thứ Sáu' },
  { value: 6, label: 'Thứ Bảy' },
  { value: 7, label: 'Chủ Nhật' },
]

export const RecurringSurveyModal: React.FC<RecurringSurveyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  communeId,
  assignees = [],
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [schedules, setSchedules] = useState<SurveyRecurringItem[]>([])
  const [segments, setSegments] = useState<SegmentListItem[]>([])
  const [engineers, setEngineers] = useState<WorkOrderAssignee[]>(assignees)

  // Form State tạo mới - Hỗ trợ chọn nhiều ngày trong tuần
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([5]) // Mặc định Thứ Sáu
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [note, setNote] = useState<string>('Khảo sát camera AI ban đêm theo chu kỳ định kỳ tuần.')

  // State xác nhận xóa cấu hình (thay thế window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<SurveyRecurringItem | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Đồng bộ kỹ sư từ props khi có thay đổi
  useEffect(() => {
    if (assignees && assignees.length > 0) {
      setEngineers(assignees)
    }
  }, [assignees])

  // Tải danh sách lịch định kỳ, tuyến đường và kỹ sư
  const loadData = async () => {
    setLoading(true)
    try {
      const targetCommune = communeId && communeId !== '*' ? communeId : undefined

      const [schedResult, segsResult, engsResult] = await Promise.allSettled([
        workScheduleAPI.getRecurringSurveySchedules(targetCommune),
        fetchSegmentsList(targetCommune),
        targetCommune ? workScheduleAPI.getAssignees(targetCommune) : Promise.resolve({ items: [] }),
      ])

      if (schedResult.status === 'fulfilled') {
        setSchedules(schedResult.value.items || [])
      }

      let loadedSegments: SegmentListItem[] = []
      if (segsResult.status === 'fulfilled' && segsResult.value && segsResult.value.length > 0) {
        loadedSegments = segsResult.value
      } else {
        // Fallback sang assetAPI.getSegments nếu fetchSegmentsList chưa có kết quả
        try {
          const segsRes = await assetAPI.getSegments({ page_size: 100 })
          loadedSegments = segsRes?.items || []
        } catch (e) {
          console.warn('[RecurringSurveyModal] Fallback assetAPI.getSegments failed:', e)
        }
      }
      setSegments(loadedSegments)

      if (loadedSegments.length > 0 && !selectedSegmentId) {
        setSelectedSegmentId(loadedSegments[0].segment_id || '')
      }

      if (engsResult.status === 'fulfilled' && (engsResult.value as any)?.items?.length > 0) {
        setEngineers((engsResult.value as any).items)
      } else if (assignees && assignees.length > 0) {
        setEngineers(assignees)
      }
    } catch (err) {
      console.error('[RecurringSurveyModal] Load failed:', err)
      toast.error('Không thể tải danh sách khảo sát định kỳ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, communeId])

  // Khi người dùng chọn tuyến, tự động nạp kỹ sư của xã tương ứng với tuyến đó
  useEffect(() => {
    if (!selectedSegmentId || segments.length === 0) return
    const currentSeg = segments.find((s) => s.segment_id === selectedSegmentId)
    if (currentSeg?.commune_id && currentSeg.commune_id !== '*') {
      workScheduleAPI
        .getAssignees(currentSeg.commune_id)
        .then((res) => {
          if (res?.items && res.items.length > 0) {
            setEngineers(res.items)
          }
        })
        .catch(() => {
          // Bỏ qua lỗi và giữ danh sách kỹ sư hiện tại
        })
    }
  }, [selectedSegmentId, segments])

  // Tính toán thời gian áp dụng thực tế theo Quy tắc Mốc 17:00 Thứ Năm
  const previewEffectiveInfo = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Chủ Nhật, 1 = T2, 4 = T5
    const currentHour = now.getHours()

    // Kiểm tra xem hiện tại đã qua mốc 17:00 Thứ Năm của tuần này chưa
    const isPastThursdayCutoff =
      currentDay > 4 || (currentDay === 4 && currentHour >= 17) || currentDay === 0

    // Tính thứ Hai của tuần kế tiếp (hoặc tuần kế tiếp + 1)
    const weeksToAdd = isPastThursdayCutoff ? 2 : 1
    const nextWeekDate = new Date()
    // Tìm thứ 2 tuần tới
    const daysUntilNextMonday = ((8 - currentDay) % 7 || 7) + (weeksToAdd - 1) * 7
    nextWeekDate.setDate(now.getDate() + daysUntilNextMonday)

    // Tính ngày chạy đầu tiên cho từng thứ đã chọn
    const occurrences = selectedDaysOfWeek.map((dayNum) => {
      const targetDate = new Date(nextWeekDate)
      targetDate.setDate(nextWeekDate.getDate() + (dayNum - 1))
      const label = DAYS_OF_WEEK.find((d) => d.value === dayNum)?.label || `Thứ ${dayNum}`
      const dateStr = targetDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      return `${label} (${dateStr})`
    })

    return {
      isPastThursdayCutoff,
      occurrencesText: occurrences.join(', ') || 'Chưa chọn thứ',
      cutoffDesc: isPastThursdayCutoff
        ? 'Hiện đã qua mốc 17:00 Thứ Năm, các ca khảo sát sẽ bắt đầu áp dụng sau 2 tuần để chuẩn bị nhân sự.'
        : 'Thiết lập trước mốc 17:00 Thứ Năm, các ca khảo sát sẽ bắt đầu áp dụng ngay từ tuần tới.',
    }
  }, [selectedDaysOfWeek])

  // Xử lý tạo mới cấu hình lịch định kỳ (hỗ trợ tạo đa ngày)
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSegmentId) {
      toast.error('Vui lòng chọn tuyến đường khảo sát.')
      return
    }
    if (selectedDaysOfWeek.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thứ trong tuần.')
      return
    }

    const currentSeg = segments.find((s) => s.segment_id === selectedSegmentId)
    // Ưu tiên chuẩn xác mã xã của chính tuyến đường được chọn để tránh lỗi CROSS_COMMUNE_REFERENCE
    const targetCommuneId =
      currentSeg?.commune_id ||
      (communeId && communeId !== '*' ? communeId : undefined)

    if (!targetCommuneId) {
      toast.error('Không xác định được địa bàn xã của tuyến đường được chọn. Vui lòng thử chọn lại tuyến.')
      return
    }

    setSubmitting(true)
    let successCount = 0
    const conflictDays: string[] = []
    const errors: string[] = []

    for (const day of selectedDaysOfWeek) {
      const dayLabel = DAYS_OF_WEEK.find((d) => d.value === day)?.label || `Thứ ${day}`
      try {
        await workScheduleAPI.createRecurringSurveySchedule({
          commune_id: targetCommuneId,
          segment_id: selectedSegmentId,
          day_of_week: Number(day),
          assigned_to: selectedAssignee ? selectedAssignee : undefined,
          note: note.trim() || undefined,
        })
        successCount++
      } catch (err: any) {
        const errData = err?.response?.data
        const errObj = errData?.error
        const errorCode = errObj?.code || errData?.code || ''
        const errorMsg =
          errObj?.message ||
          errData?.message ||
          errData?.detail ||
          errData?.title ||
          err?.message ||
          'Không thể tạo'

        // Nhận diện lỗi trùng lịch lặp 409 SURVEY_SCHEDULE_EXISTS
        const isConflict =
          errorCode === 'SURVEY_SCHEDULE_EXISTS' ||
          (err?.response?.status === 409 && (!errorCode || errorCode === 'SURVEY_SCHEDULE_EXISTS'))

        if (isConflict) {
          conflictDays.push(dayLabel)
        } else {
          let userFriendlyMsg = errorMsg
          if (errorCode === 'ROLE_FORBIDDEN' || err?.response?.status === 403) {
            userFriendlyMsg = 'Tài khoản không có quyền tạo/quản lý lịch làm việc (Chỉ Quản lý - Manager mới có quyền này).'
          } else if (errorCode === 'COMMUNE_FORBIDDEN') {
            userFriendlyMsg = 'Địa bàn xã nằm ngoài phạm vi quản lý của tài khoản.'
          } else if (errorCode === 'CROSS_COMMUNE_REFERENCE') {
            userFriendlyMsg = 'Tuyến đường không thuộc địa bàn xã chỉ định.'
          } else if (errorCode === 'ASSET_NOT_FOUND' || err?.response?.status === 404) {
            userFriendlyMsg = 'Không tìm thấy dữ liệu tuyến đường trên hệ thống.'
          } else if (errorCode === 'ASSIGNEE_NOT_ELIGIBLE') {
            userFriendlyMsg = 'Kỹ sư được chọn không phụ trách tuyến này hoặc không đủ điều kiện.'
          }

          const detailStr =
            errObj?.details && Object.keys(errObj.details).length > 0
              ? ` (${Object.entries(errObj.details).map(([k, v]) => `${k}: ${v}`).join(', ')})`
              : ''
          errors.push(`${dayLabel}: ${userFriendlyMsg}${detailStr}${errorCode ? ` [${errorCode}]` : ''}`)
        }
      }
    }

    setSubmitting(false)

    if (successCount > 0) {
      toast.success(
        `Đã tạo thành công ${successCount} lịch định kỳ cho ${currentSeg?.segment_name || selectedSegmentId}!`
      )
      // Reset form sau khi tạo thành công để tránh bấm nhầm gây lỗi trùng lặp
      setSelectedSegmentId(segments.length > 0 ? segments[0].segment_id || '' : '')
      setSelectedDaysOfWeek([5])
      setSelectedAssignee('')
      setNote('Khảo sát camera AI ban đêm theo chu kỳ định kỳ tuần.')

      setActiveTab('list')
      loadData()
      onSuccess()
    }

    if (conflictDays.length > 0) {
      toast.warning(`Tuyến này đã có lịch lặp vào ${conflictDays.join(', ')} từ trước (bỏ qua trùng).`)
    }

    if (errors.length > 0 && successCount === 0) {
      toast.error(errors.join('\n'))
    }
  }

  // Bật/Tắt trạng thái hoạt động của lịch định kỳ
  const handleToggleActive = async (item: SurveyRecurringItem) => {
    try {
      const newStatus = !item.is_active
      await workScheduleAPI.patchRecurringSurveySchedule(item.schedule_id, {
        is_active: newStatus,
      })

      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === item.schedule_id ? { ...s, is_active: newStatus } : s
        )
      )
      toast.success(
        newStatus
          ? `Đã kích hoạt lại lịch định kỳ cho ${item.segment_name || item.segment_id}`
          : `Đã tạm dừng lịch định kỳ cho ${item.segment_name || item.segment_id}`
      )
      onSuccess()
    } catch (err: any) {
      console.error('[RecurringSurveyModal] Toggle active failed:', err)
      const errObj = err?.response?.data?.error
      const msg =
        errObj?.message ||
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? 'Tài khoản không có quyền sửa lịch (Chỉ Quản lý - Manager mới có quyền).'
          : 'Không thể cập nhật trạng thái lịch định kỳ.')
      toast.error(msg)
    }
  }

  // Xác nhận xóa cấu hình lịch định kỳ
  const confirmDeleteSchedule = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await workScheduleAPI.deleteRecurringSurveySchedule(deleteTarget.schedule_id)
      setSchedules((prev) => prev.filter((s) => s.schedule_id !== deleteTarget.schedule_id))
      toast.success(
        `Đã xóa cấu hình lịch khảo sát định kỳ cho ${
          deleteTarget.segment_name || deleteTarget.segment_id
        }!`
      )
      setDeleteTarget(null)
      onSuccess()
    } catch (err: any) {
      console.error('[RecurringSurveyModal] Delete failed:', err)
      const errObj = err?.response?.data?.error
      const msg =
        errObj?.message ||
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? 'Tài khoản không có quyền xóa lịch (Chỉ Quản lý - Manager mới có quyền).'
          : 'Không thể xóa cấu hình lịch định kỳ.')
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50/70 to-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
              <RotateCcw className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Lịch Khảo Sát Định Kỳ Tuần
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Recurring Survey
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập chu kỳ quét camera AI / đo đêm tự động theo tuần (Mốc chốt 17:00 Thứ Năm).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS SWITCHER */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200/70 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Danh sách cấu hình</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {schedules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cấu hình mới</span>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Đang tải danh sách lịch định kỳ...</span>
            </div>
          ) : activeTab === 'list' ? (
            schedules.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Chưa có lịch khảo sát định kỳ nào</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Hãy tạo cấu hình định kỳ để hệ thống tự động sinh các ca khảo sát camera AI hàng tuần cho các tuyến đường.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo lịch định kỳ đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((item) => {
                  const dayObj = DAYS_OF_WEEK.find((d) => d.value === item.day_of_week)
                  const dayName = dayObj ? dayObj.label : `Thứ ${item.day_of_week}`

                  return (
                    <div
                      key={item.schedule_id}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-ops flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        item.is_active ? 'border-slate-200/90' : 'border-slate-200/60 opacity-60 bg-slate-50/80'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                            {item.schedule_id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {item.segment_name || item.segment_id}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                            Hàng tuần vào {dayName}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Phụ trách: <strong className="text-slate-800 font-semibold">{item.assigned_to_name || item.assigned_to || 'Tự động phân bổ'}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Lần chạy đầu: <strong className="text-blue-700 font-mono font-bold">{item.first_occurrence_date}</strong>
                          </span>
                        </div>

                        {item.note && (
                          <p className="text-[11.5px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {item.note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Nút Bật / Tắt */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title={item.is_active ? 'Bấm để tạm dừng lịch này' : 'Bấm để kích hoạt lại lịch này'}
                        >
                          {item.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>Đang bật</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-500" />
                              <span>Tạm dừng</span>
                            </>
                          )}
                        </button>

                        {/* Nút Xóa */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition flex items-center justify-center cursor-pointer"
                          title="Xóa cấu hình lịch này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* FORM TẠO MỚI */
            <form onSubmit={handleCreateSchedule} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-ops space-y-4">
                {/* Chọn Tuyến đường */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Route className="w-4 h-4 text-blue-600" />
                    Tuyến đường khảo sát: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSegmentId}
                    onChange={(e) => setSelectedSegmentId(e.target.value)}
                    required
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">-- Chọn tuyến đường --</option>
                    {segments.map((seg) => (
                      <option key={seg.segment_id} value={seg.segment_id || ''}>
                        {seg.segment_name || seg.segment_id} ({seg.pole_count || 0} cột)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chọn Thứ trong tuần (Hỗ trợ đa chọn Multi-select) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Thứ trong tuần (Chu kỳ lặp): <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                      Có thể chọn nhiều thứ (đã chọn {selectedDaysOfWeek.length} ngày)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = selectedDaysOfWeek.includes(d.value)
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            setSelectedDaysOfWeek((prev) => {
                              if (prev.includes(d.value)) {
                                if (prev.length === 1) {
                                  toast.info('Cần chọn ít nhất một ngày trong tuần cho chu kỳ lặp.')
                                  return prev
                                }
                                return prev.filter((v) => v !== d.value)
                              }
                              return [...prev, d.value].sort((a, b) => a - b)
                            })
                          }}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/30'
                              : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Chọn Kỹ sư phụ trách */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    Kỹ sư phụ trách (Tùy chọn):
                  </label>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">-- Để trống (Tự động chọn kỹ sư ít việc nhất) --</option>
                    {engineers.map((eng) => (
                      <option key={eng.user_id || ''} value={eng.user_id || ''}>
                        {eng.full_name || eng.user_id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Nếu để trống, hệ thống sẽ tự động chỉ định kỹ sư có ít ca nhất trong tuần chạy khảo sát.
                  </p>
                </div>

                {/* Ghi chú */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Ghi chú / Yêu cầu thiết bị:</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập ghi chú cho ca khảo sát..."
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl p-3 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* KHUNG THÔNG BÁO THỜI ĐIỂM HIỆU LỰC (QUY TẮC MỐC 17:00 THỨ NĂM) */}
                <div className="p-3.5 bg-linear-to-r from-blue-50 to-teal-50 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-blue-950 flex flex-wrap items-center gap-1.5">
                      <span>Lần chạy đầu tiên:</span>
                      <strong className="text-blue-700 font-mono text-[12.5px]">
                        {previewEffectiveInfo.occurrencesText}
                      </strong>
                    </div>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      {previewEffectiveInfo.cutoffDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Quay lại danh sách
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedSegmentId || selectedDaysOfWeek.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu ({selectedDaysOfWeek.length} lịch)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu {selectedDaysOfWeek.length > 1 ? `${selectedDaysOfWeek.length} ` : ''}lịch định kỳ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* POPUP XÁC NHẬN XÓA TÙY BIẾN HIỆN ĐẠI (THAY THẾ WINDOW.CONFIRM) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Xác Nhận Xóa Lịch Định Kỳ
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {deleteTarget.schedule_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 space-y-1">
                  <p className="font-bold">Cảnh báo thao tác:</p>
                  <p className="text-[11.5px] leading-relaxed text-rose-800">
                    Bạn có chắc chắn muốn xóa lịch khảo sát định kỳ của tuyến{' '}
                    <strong className="font-semibold text-rose-950">
                      {deleteTarget.segment_name || deleteTarget.segment_id}
                    </strong>{' '}
                    vào{' '}
                    <strong className="font-semibold text-rose-950">
                      {DAYS_OF_WEEK.find((d) => d.value === deleteTarget.day_of_week)?.label ||
                        `Thứ ${deleteTarget.day_of_week}`}
                    </strong>
                    ?
                  </p>
                  <p className="text-[11px] text-rose-700/90 pt-1">
                    Hệ thống sẽ ngừng tự động sinh phiếu khảo sát hàng tuần cho tuyến này. Các phiếu khảo sát đã được sinh trước đây vẫn được lưu trữ an toàn.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSchedule}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
