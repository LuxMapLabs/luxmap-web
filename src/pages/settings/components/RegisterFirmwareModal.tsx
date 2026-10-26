import React, { useState } from 'react'
import { X, Cpu, Hash, FileCode, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import type { RegisterArtifactVersionRequest } from '../../../types/admin/artifact-versions'

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
  const [component, setComponent] = useState<'node_firmware' | 'lux_module_firmware'>(
    'node_firmware'
  )
  const [version, setVersion] = useState('')
  const [artifactHash, setArtifactHash] = useState('')
  const [metadataJson, setMetadataJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const trimmedVersion = version.trim()
    if (!trimmedVersion) {
      setLocalError('Phiên bản firmware không được để trống!')
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
                Đăng Ký Firmware Mới
              </h2>
              <p className="text-xs text-slate-500">
                Khai báo trước phiên bản firmware cho thiết bị IoT hoặc xe trắc đạc
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

          {/* 1. Thành phần Firmware */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Loại thành phần Firmware <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer transition flex items-center gap-2 ${
                  component === 'node_firmware'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="component"
                  value="node_firmware"
                  checked={component === 'node_firmware'}
                  onChange={() => setComponent('node_firmware')}
                  className="hidden"
                />
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <div>
                  <strong className="block font-bold">Node Firmware</strong>
                  <span className="text-[10px] text-slate-400">Tủ điện IoT hiện trường</span>
                </div>
              </label>

              <label
                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer transition flex items-center gap-2 ${
                  component === 'lux_module_firmware'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="component"
                  value="lux_module_firmware"
                  checked={component === 'lux_module_firmware'}
                  onChange={() => setComponent('lux_module_firmware')}
                  className="hidden"
                />
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <div>
                  <strong className="block font-bold">Lux Sensor</strong>
                  <span className="text-[10px] text-slate-400">Cảm biến BH1750 xe đo</span>
                </div>
              </label>
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
              Tối đa 64 ký tự, viết theo quy chuẩn SemVer hoặc chuỗi định danh phiên bản.
            </span>
          </div>

          {/* 3. SHA-256 Hash */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Mã băm SHA-256 của file nhị phân (.bin / .hex)</span>
              <span className="text-[10px] text-slate-400 font-normal">(Tùy chọn)</span>
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
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Metadata bổ sung (JSON Object)</span>
              <span className="text-[10px] text-slate-400 font-normal">(Tối đa 4KB)</span>
            </label>
            <textarea
              rows={3}
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              placeholder={'{\n  "board": "ESP32-WROOM-32D",\n  "release_note": "Sửa lỗi kết nối MQTT khi mất sóng 4G"\n}'}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-xs font-mono text-slate-800 outline-none transition"
            />
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
