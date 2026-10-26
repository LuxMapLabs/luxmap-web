import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Save,
  AlertTriangle,
  Lightbulb,
  Clock,
  User,
  Loader2,
  FileText,
  Minus,
  Plus,
  Radio,
  SlidersHorizontal,
  Layers,
} from 'lucide-react'
import { ArtifactVersionsTab } from './components/ArtifactVersionsTab'
import type { RootState } from '../../redux/rootReducer'
import type { SettingItem } from '../../types/admin/settings'
import {
  fetchSettingsRequest,
  updateSettingRequest,
} from '../../feature/settings/settingsSlice'

/**
 * Format ngày giờ chính xác: DD/MM/YYYY HH:mm
 */
const formatFullDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Chưa có dữ liệu'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Chưa có'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * =========================================================================
 * CARD 1: CẤU HÌNH NGƯỠNG ĐÈN MỜ (PRECISION PERCENTAGE SLIDER)
 * Thiết kế chuẩn LuxMap Light Mode - Typography đồng bộ hệ thống
 * =========================================================================
 */
interface DimCardProps {
  setting: SettingItem
  isUpdating: boolean
  onSave: (key: string, value: number, note: string) => void
}

const DimCard: React.FC<DimCardProps> = ({ setting, isUpdating, onSave }) => {
  const min = setting.min ?? 0.5
  const max = setting.max ?? 0.95

  const [value, setValue] = useState<number>(setting.value ?? 0.8)
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (setting.value !== undefined && setting.value !== null) {
      setValue(setting.value)
    }
    setError(null)
  }, [setting.value])

  const isChanged = (setting.value !== undefined && value !== setting.value) || note.trim().length > 0

  // Tính % tọa độ chính xác tuyệt đối trên thanh ray
  const progressPercent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const handleNumericChange = (raw: number) => {
    if (isNaN(raw)) {
      setError('Vui lòng nhập định dạng số hợp lệ')
      return
    }
    if (raw < min || raw > max) {
      setError(`Giá trị hợp lệ: ${min} – ${max}`)
    } else {
      setError(null)
    }
    setValue(raw)
  }

  const handleStep = (delta: number) => {
    const rawNext = value + delta
    const rounded = parseFloat(rawNext.toFixed(2))
    const next = Math.min(max, Math.max(min, rounded))
    setValue(next)
    setError(null)
  }

  const handleSave = () => {
    if (error || isNaN(value)) return
    onSave('dim_threshold_ratio', value, note.trim())
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between overflow-hidden relative h-full">
      {/* Vạch màu nhận diện phân hệ (Amber / Golden Glow Top Accent) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

      <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* 1. Header Card */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs shrink-0 ring-3 ring-amber-50/60">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Ngưỡng phát hiện đèn mờ
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-300 shadow-2xs">
                    dim_threshold_ratio
                  </span>
                  <span className="text-[11px] text-slate-400">• Đơn vị: ratio</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {isChanged ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Chưa lưu thay đổi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đang áp dụng
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Tỷ lệ công suất hoặc quang thông thực tế so với định mức danh định của đèn chiếu sáng trên tuyến.
          </p>

          {/* 2. Khối điều khiển Tham số (Control Island) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50/30 via-slate-50/80 to-slate-50/50 border border-amber-100/80 space-y-3 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Ngưỡng tỷ lệ áp dụng
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                    {Math.round(value * 100)}%
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    hệ số {value.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Stepper điều khiển chính xác đồng bộ */}
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleStep(-0.01)}
                  disabled={isUpdating || value <= min}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                  title="Giảm 0.01 (1%)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  step={0.01}
                  min={min}
                  max={max}
                  value={value.toFixed(2)}
                  onChange={(e) => handleNumericChange(parseFloat(e.target.value.replace(',', '.')))}
                  disabled={isUpdating}
                  className="w-16 py-1.5 text-xs font-bold font-mono text-center outline-none bg-transparent text-slate-900 border-x border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleStep(0.01)}
                  disabled={isUpdating || value >= max}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                  title="Tăng 0.01 (1%)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thanh Slider tương tác cao cấp */}
            <div className="space-y-1.5 pt-1">
              <div className="relative h-2 w-full bg-slate-200/90 rounded-full flex items-center">
                {/* Active Track Gradient */}
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={0.01}
                  value={value}
                  onChange={(e) => handleNumericChange(parseFloat(e.target.value))}
                  disabled={isUpdating}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                {/* Custom Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-white border-2 border-amber-500 shadow-xs pointer-events-none z-10 ring-2 ring-amber-100"
                  style={{ left: `calc(${progressPercent}% - 9px)` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono font-medium pt-0.5">
                <span>{min} (50%)</span>
                <span>{max} (95%)</span>
              </div>
            </div>

            {/* Phím mốc chọn nhanh phổ biến (Preset Quick Pills) */}
            <div className="pt-2 border-t border-amber-100/60">
              <span className="text-[10.5px] font-semibold text-slate-400 block mb-1.5">
                Mốc chọn nhanh phổ biến:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '50% (Sâu)', val: 0.5 },
                  { label: '60%', val: 0.6 },
                  { label: '70%', val: 0.7 },
                  { label: '80% (Chuẩn)', val: 0.8 },
                  { label: '85%', val: 0.85 },
                  { label: '90%', val: 0.9 },
                  { label: '95% (Max)', val: 0.95 },
                ].map((preset) => {
                  const isSelected = Math.abs(value - preset.val) < 0.005
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleNumericChange(preset.val)}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-semibold transition cursor-pointer border shadow-2xs ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400/20'
                          : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* 3. Khối Tác động Kỹ thuật (Impact Alert Box) */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border-l-4 border-amber-500 text-xs text-amber-950 leading-relaxed mb-4">
            <span className="font-bold text-amber-900">Quy tắc cảnh báo: </span>
            Bóng đèn có công suất hoặc quang thông thực tế tụt dưới{' '}
            <strong className="font-bold underline">{Math.round(value * 100)}%</strong> định mức sẽ tự động được hệ thống đánh dấu là đèn mờ (dim) và gắn cờ cảnh báo sự cố.
          </div>
        </div>

        {/* 4. Ô Ghi chú lý do thay đổi */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isUpdating}
            placeholder="Nhập lý do điều chỉnh tham số (Tùy chọn)..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 5. Chân Card (Footer Actions) */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>{formatFullDateTime(setting.updated_at)}</span>
          {setting.updated_by && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                <User className="w-3 h-3 text-slate-500" />
                {setting.updated_by}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isUpdating || !isChanged || !!error}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            !isChanged || !!error
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              : 'text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer'
          }`}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Lưu cấu hình
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * =========================================================================
 * CARD 2: CẤU HÌNH TIMEOUT IOT (STEPPER & PRECISION TIMELINE SLIDER)
 * Thiết kế chuẩn LuxMap Light Mode - Typography đồng bộ hệ thống
 * =========================================================================
 */
interface IotCardProps {
  setting: SettingItem
  isUpdating: boolean
  onSave: (key: string, value: number, note: string) => void
}

const IotCard: React.FC<IotCardProps> = ({ setting, isUpdating, onSave }) => {
  const min = setting.min ?? 5
  const max = setting.max ?? 1440

  const [value, setValue] = useState<number>(setting.value ?? 60)
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (setting.value !== undefined && setting.value !== null) {
      setValue(setting.value)
    }
    setError(null)
  }, [setting.value])

  const isChanged = (setting.value !== undefined && value !== setting.value) || note.trim().length > 0

  // Tính % tọa độ chính xác trên thanh ray slider
  const progressPercent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const handleNumericChange = (raw: number) => {
    if (isNaN(raw)) {
      setError('Vui lòng nhập định dạng số hợp lệ')
      return
    }
    if (raw < min || raw > max) {
      setError(`Thời gian hợp lệ: ${min} – ${max} phút`)
    } else {
      setError(null)
    }
    setValue(raw)
  }

  const handleStep = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta))
    setValue(next)
    setError(null)
  }

  const handleSave = () => {
    if (error || isNaN(value)) return
    onSave('iot_offline_after_minutes', value, note.trim())
  }

  const hoursDisplay = (value / 60).toFixed(1)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between overflow-hidden relative h-full">
      {/* Vạch màu nhận diện phân hệ (Electric Sapphire / Cyan Glow Top Accent) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* 1. Header Card */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs shrink-0 ring-3 ring-blue-50/60">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Thời gian chờ mất kết nối IoT
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-300 shadow-2xs">
                    iot_offline_after_minutes
                  </span>
                  <span className="text-[11px] text-slate-400">• Đơn vị: phút</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {isChanged ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Chưa lưu thay đổi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đang áp dụng
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Khoảng thời gian chờ tín hiệu nhịp tim (heartbeat) định kỳ từ trạm thu phát IoT tủ điều khiển.
          </p>

          {/* 2. Khối điều khiển Tham số (Control Island) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50/30 via-slate-50/80 to-slate-50/50 border border-blue-100/80 space-y-3 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Thời gian chờ ngoại tuyến
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                    {value} phút
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    ≈ {hoursDisplay} giờ
                  </span>
                </div>
              </div>

              {/* Stepper điều khiển chính xác */}
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleStep(-5)}
                  disabled={isUpdating || value <= min}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                  title="Giảm 5 phút"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  step={5}
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => handleNumericChange(parseInt(e.target.value, 10))}
                  disabled={isUpdating}
                  className="w-16 py-1.5 text-xs font-bold font-mono text-center outline-none bg-transparent text-slate-900 border-x border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleStep(5)}
                  disabled={isUpdating || value >= max}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                  title="Tăng 5 phút"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thanh Slider tương tác cao cấp đồng bộ */}
            <div className="space-y-1.5 pt-1">
              <div className="relative h-2 w-full bg-slate-200/90 rounded-full flex items-center">
                {/* Active Track Gradient */}
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={5}
                  value={value}
                  onChange={(e) => handleNumericChange(parseInt(e.target.value, 10))}
                  disabled={isUpdating}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                {/* Custom Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-white border-2 border-blue-600 shadow-xs pointer-events-none z-10 ring-2 ring-blue-100"
                  style={{ left: `calc(${progressPercent}% - 9px)` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono font-medium pt-0.5">
                <span>{min} phút (Tối thiểu)</span>
                <span>{max} phút (24 giờ)</span>
              </div>
            </div>

            {/* Phím mốc chọn nhanh phổ biến (Preset Quick Pills) */}
            <div className="pt-2 border-t border-blue-100/60">
              <span className="text-[10.5px] font-semibold text-slate-400 block mb-1.5">
                Mốc chọn nhanh phổ biến:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '15p', val: 15 },
                  { label: '30p', val: 30 },
                  { label: '1h (60p)', val: 60 },
                  { label: '2h', val: 120 },
                  { label: '6h', val: 360 },
                  { label: '12h', val: 720 },
                  { label: '24h', val: 1440 },
                ].map((preset) => {
                  const isSelected = value === preset.val
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleNumericChange(preset.val)}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-semibold transition cursor-pointer border shadow-2xs ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                          : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* 3. Khối Tác động Kỹ thuật (Impact Alert Box) */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border-l-4 border-blue-500 text-xs text-blue-950 leading-relaxed mb-4">
            <span className="font-bold text-blue-900">Quy tắc giám sát: </span>
            Trạm hoặc thiết bị không gửi tín hiệu phản hồi quá{' '}
            <strong className="font-bold underline">{value} phút ({hoursDisplay} giờ)</strong> sẽ tự động chuyển sang trạng thái Ngoại tuyến (Offline) và kích hoạt theo dõi.
          </div>
        </div>

        {/* 4. Ô Ghi chú lý do thay đổi */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isUpdating}
            placeholder="Nhập lý do điều chỉnh tham số (Tùy chọn)..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 5. Chân Card (Footer Actions) */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>{formatFullDateTime(setting.updated_at)}</span>
          {setting.updated_by && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                <User className="w-3 h-3 text-slate-500" />
                {setting.updated_by}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isUpdating || !isChanged || !!error}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            !isChanged || !!error
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              : 'text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer'
          }`}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Lưu cấu hình
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * =========================================================================
 * TRANG CHÍNH: CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS)
 * Trải rộng khớp màn hình - Typography đồng bộ hệ thống LuxMap
 * =========================================================================
 */
export const SystemSettingsPage: React.FC = () => {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState<'parameters' | 'artifacts'>('parameters')

  const { items, isLoading, isUpdating, error } = useSelector(
    (state: RootState) => state.settings
  )

  useEffect(() => {
    dispatch(fetchSettingsRequest())
  }, [dispatch])

  const handleSaveSetting = (key: string, value: number, note: string) => {
    dispatch(
      updateSettingRequest({
        key,
        data: {
          value,
          note: note || undefined,
        },
      })
    )
  }

  const dimSetting = useMemo(
    () => items.find((item) => item.key === 'dim_threshold_ratio') || {
      key: 'dim_threshold_ratio',
      value: 0.8,
      min: 0.5,
      max: 0.95,
      unit: 'ratio',
    },
    [items]
  )

  const iotSetting = useMemo(
    () => items.find((item) => item.key === 'iot_offline_after_minutes') || {
      key: 'iot_offline_after_minutes',
      value: 60,
      min: 5,
      max: 1440,
      unit: 'phút',
    },
    [items]
  )

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 select-none">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        {/* Navigation Tabs (Sub-Navigation gọn gàng, đồng bộ với Header chính của Layout) */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200/80">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300/70 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('parameters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'parameters'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Tham số vận hành</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('artifacts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'artifacts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sổ đăng ký phiên bản (Artifact Registry)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Tham số vận hành */}
        {activeTab === 'parameters' ? (
          <>
            {/* Thông báo lỗi nếu có */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(fetchSettingsRequest())}
                  className="font-bold hover:underline ml-3 cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* 2 Card cấu hình song song 2 cột - Trải rộng khớp màn hình */}
            {isLoading && items.length === 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-[440px] rounded-2xl bg-white animate-pulse border border-slate-200/80 shadow-xs"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                <DimCard
                  setting={dimSetting}
                  isUpdating={isUpdating}
                  onSave={handleSaveSetting}
                />

                <IotCard
                  setting={iotSetting}
                  isUpdating={isUpdating}
                  onSave={handleSaveSetting}
                />
              </div>
            )}
          </>
        ) : (
          /* Tab 2: Sổ đăng ký phiên bản (Artifact Registry) */
          <ArtifactVersionsTab />
        )}
      </div>
    </div>
  )
}

export default SystemSettingsPage
