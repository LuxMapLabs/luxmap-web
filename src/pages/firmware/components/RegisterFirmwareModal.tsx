import React, { useState, useEffect, useMemo } from 'react'
import { X, Cpu, SunMedium, Hash, FileCode, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import type { RegisterArtifactVersionRequest } from '../../../types/admin/artifact-versions'

const FIRMWARE_COMPONENTS = [
  {
    value: 'node_firmware' as const,
    label: 'node_firmware',
    subLabel: 'Tủ điều khiển IoT',
    icon: Cpu,
    activeClasses:
      'border-indigo-500 bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 text-indigo-950 ring-2 ring-indigo-500/20 shadow-indigo-500/10 shadow-sm',
    iconActiveClasses: 'bg-indigo-600 text-white shadow-xs',
    iconInactiveClasses: 'bg-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50',
    dotActiveClasses: 'bg-indigo-600 ring-4 ring-indigo-100 shadow-2xs',
  },
  {
    value: 'lux_module_firmware' as const,
    label: 'lux_module_firmware',
    subLabel: 'Cảm biến quang trắc xe đo',
    icon: SunMedium,
    activeClasses:
      'border-amber-500 bg-gradient-to-br from-amber-50/90 to-amber-100/40 text-amber-950 ring-2 ring-amber-500/20 shadow-amber-500/10 shadow-sm',
    iconActiveClasses: 'bg-amber-500 text-white shadow-xs',
    iconInactiveClasses: 'bg-slate-100 text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-50',
    dotActiveClasses: 'bg-amber-500 ring-4 ring-amber-100 shadow-2xs',
  },
]

interface RegisterFirmwareModalProps {
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: RegisterArtifactVersionRequest) => void
}

export const RegisterFirmwareModal: React.FC<RegisterFirmwareModalProps> = ({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}) => {
  const [component, setComponent] = useState<'node_firmware' | 'lux_module_firmware'>('node_firmware')
  const [version, setVersion] = useState('')
  const [artifactHash, setArtifactHash] = useState('')
  const [metadataJson, setMetadataJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const MAX_METADATA_BYTES = 4096 // 4KB

  // Tính toán chính xác dung lượng Byte theo UTF-8
  const metadataByteSize = useMemo(() => {
    if (!metadataJson) return 0
    return new TextEncoder().encode(metadataJson).length
  }, [metadataJson])

  const isOverByteLimit = metadataByteSize > MAX_METADATA_BYTES
  const usagePercent = Math.min(100, Math.round((metadataByteSize / MAX_METADATA_BYTES) * 100))

  const formatByteSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  // Tự động xóa sạch dữ liệu cũ và reset form mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setComponent('node_firmware')
      setVersion('')
      setArtifactHash('')
      setMetadataJson('')
      setLocalError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const trimmedVersion = version.trim()
    if (!trimmedVersion) {
      setLocalError('Phiên bản không được để trống!')
      return
    }

    const trimmedHash = artifactHash.trim().toLowerCase()
    if (trimmedHash) {
      const sha256Regex = /^[a-f0-9]{64}$/
      if (!sha256Regex.test(trimmedHash)) {
        setLocalError('Mã băm SHA-256 phải gồm đúng 64 ký tự hex chữ thường (a-f, 0-9)!')
        return
      }
    }

    if (isOverByteLimit) {
      setLocalError(
        `Dung lượng Metadata (${formatByteSize(metadataByteSize)}) vượt quá giới hạn cho phép là ${MAX_METADATA_BYTES} bytes (4KB)!`
      )
      return
    }

    let parsedMetadata: Record<string, any> | undefined = undefined
    if (metadataJson.trim()) {
      try {
        const parsed = JSON.parse(metadataJson.trim())
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          setLocalError('Metadata ghi chú phải là một JSON Object hợp lệ dạng {"key": "value"}!')
          return
        }
        parsedMetadata = parsed
      } catch (err: any) {
        setLocalError(`Lỗi cú pháp JSON Metadata: ${err.message}`)
        return
      }
    }

    onSubmit({
      component,
      version: trimmedVersion,
      artifact_hash: trimmedHash || null,
      metadata: parsedMetadata,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Đăng Ký Phiên Bản Firmware
              </h2>
              <p className="text-xs text-slate-500">
                Đăng ký trước mã băm SHA-256 và metadata cho Firmware thiết bị
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Server Error / Local Error */}
          {(error || localError) && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error || localError}</div>
            </div>
          )}

          {/* 1. Loại thành phần */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Thành phần Firmware (Component) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {FIRMWARE_COMPONENTS.map((opt) => {
                const isSelected = component === opt.value
                const IconComp = opt.icon
                return (
                  <label
                    key={opt.value}
                    className={`group relative p-3 rounded-2xl border text-xs cursor-pointer transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-between gap-2.5 select-none ${
                      isSelected
                        ? opt.activeClasses
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:-translate-y-0.5 text-slate-700 shadow-2xs'
                    }`}
                  >
                    <input
                      type="radio"
                      name="component"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setComponent(opt.value)}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                          isSelected ? opt.iconActiveClasses : opt.iconInactiveClasses
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-xs truncate">
                          {opt.label}
                        </div>
                        <div
                          className={`text-[10px] font-medium truncate transition-colors ${
                            isSelected ? 'opacity-85 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {opt.subLabel}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200 ${
                        isSelected
                          ? opt.dotActiveClasses
                          : 'bg-slate-300 group-hover:bg-slate-400'
                      }`}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* 2. Phiên bản */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Mã phiên bản (Version String) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ví dụ: v1.0.4, 2.1.0-prod, 2026.10-rc1"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-xs font-mono font-semibold text-slate-800 outline-none transition"
            />
            <span className="text-[10px] text-slate-400 block">
              Tối đa 100 ký tự theo quy định Backend, không chứa ký tự điều khiển.
            </span>
          </div>

          {/* 3. SHA-256 Hash */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Mã băm SHA-256 của file nhị phân (Tùy chọn)</span>
            </label>
            <input
              type="text"
              value={artifactHash}
              onChange={(e) => setArtifactHash(e.target.value)}
              placeholder="Ví dụ: a1b2c3d4e5f6... (64 ký tự hex)"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-xs font-mono text-slate-800 outline-none transition"
            />
            <span className="text-[10px] text-slate-400 block">
              Dùng để xác thực tính toàn vẹn khi thiết bị gửi mã băm đối chiếu.
            </span>
          </div>

          {/* 4. Metadata JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                <span>Metadata bổ sung (JSON Object)</span>
              </label>

              {/* Dynamic Capacity Indicator */}
              <div
                className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all duration-200 flex items-center gap-1 ${
                  isOverByteLimit
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold animate-pulse shadow-2xs'
                    : usagePercent > 80
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
                }`}
                title={`Dung lượng thực tế: ${metadataByteSize} / ${MAX_METADATA_BYTES} bytes`}
              >
                {isOverByteLimit ? (
                  <span>⚠️ Vượt quá {formatByteSize(metadataByteSize - MAX_METADATA_BYTES)} ({formatByteSize(metadataByteSize)} / 4 KB)</span>
                ) : (
                  <span>{formatByteSize(metadataByteSize)} / 4 KB ({usagePercent}%)</span>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              placeholder={'{\n  "board": "ESP32-WROOM-32D",\n  "release_note": "Sửa lỗi kết nối MQTT khi mất sóng 4G"\n}'}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-mono text-slate-800 outline-none transition resize-y min-h-[110px] max-h-[260px] leading-relaxed custom-scrollbar ${
                isOverByteLimit
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-rose-50/20'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
              }`}
            />

            {/* Capacity Progress Bar */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverByteLimit
                    ? 'bg-rose-500 w-full'
                    : usagePercent > 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${isOverByteLimit ? 100 : usagePercent}%` }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đăng ký Firmware</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
