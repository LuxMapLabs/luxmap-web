import React from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Zap,
  Radio,
  Sliders,
  Clock,
  HelpCircle,
} from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import {
  clearPreview,
  createLightingCommandRequest,
} from '../../../feature/lighting/lightingSlice'
import type { FeederControlMode } from '../../../types/common/enums'

export const LightingPreviewModal: React.FC = () => {
  const dispatch = useDispatch()
  const { previewTarget, previewData, isPreviewLoading, isCommandSubmitting, previewError } =
    useSelector((state: RootState) => state.lighting)

  if (!previewTarget) return null

  const handleClose = () => {
    dispatch(clearPreview())
  }

  const hasExecutableTargets = Boolean(previewData && previewData.targets && previewData.targets.length > 0)
  const isAllExcluded = Boolean(
    previewData &&
      (!previewData.targets || previewData.targets.length === 0) &&
      previewData.excluded &&
      previewData.excluded.length > 0
  )

  const handleConfirm = () => {
    if (!previewTarget || !hasExecutableTargets) return
    const clientOpId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    dispatch(
      createLightingCommandRequest({
        feeder_id: previewTarget.kind === 'feeder' ? previewTarget.id : undefined,
        segment_id: previewTarget.kind === 'segment' ? previewTarget.id : undefined,
        mode: previewTarget.requestedMode,
        client_op_id: clientOpId,
      })
    )
  }

  const modeBadge = (mode: FeederControlMode) => {
    switch (mode) {
      case 'on':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>BẬT NGUỒN (On)</span>
          </span>
        )
      case 'off':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>NGẮT NGUỒN (Off)</span>
          </span>
        )
      case 'auto':
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>TỰ ĐỘNG THEO LỊCH (Auto)</span>
          </span>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Xác Nhận Lệnh Điều Khiển Chiếu Sáng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xem trước phạm vi ảnh hưởng trước khi phát lệnh IoT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {/* Target & Requested Mode */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Mục tiêu tác động:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                {previewTarget.kind === 'feeder' ? `Mạch điện: ${previewTarget.id}` : `Tuyến đường: ${previewTarget.id}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Chế độ yêu cầu:</span>
              {modeBadge(previewTarget.requestedMode)}
            </div>
          </div>

          {/* Loading State */}
          {isPreviewLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Đang tính toán sơ đồ topo và kiểm tra các rơ-le...</p>
            </div>
          )}

          {/* Error State */}
          {previewError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Preview Results */}
          {!isPreviewLoading && previewData && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                    Rơ-le tác động
                  </span>
                  <strong className="text-emerald-900 dark:text-emerald-200 font-mono text-sm">
                    {previewData.targets.length} nốt
                  </strong>
                </div>

                <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-semibold">
                    Tuyến ảnh hưởng
                  </span>
                  <strong className="text-blue-900 dark:text-blue-200 font-mono text-sm">
                    {previewData.affected_segment_ids.length} tuyến
                  </strong>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    previewData.uncontrollable_pole_count > 0
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}
                  title={
                    previewData.uncontrollable_pole_count > 0
                      ? 'Số cột đèn không nhận được lệnh do chưa gán lộ mạch hoặc mạch chưa đấu nối rơ-le IoT'
                      : 'Toàn bộ cột đèn trong phạm vi đều được điều khiển'
                  }
                >
                  <span
                    className={`text-[10px] block font-semibold ${
                      previewData.uncontrollable_pole_count > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Cột không điều khiển được
                  </span>
                  <strong
                    className={`font-mono text-sm ${
                      previewData.uncontrollable_pole_count > 0
                        ? 'text-amber-900 dark:text-amber-200'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {previewData.uncontrollable_pole_count} cột
                  </strong>
                </div>
              </div>

              {/* Targets List */}
              {previewData.targets.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Các rơ-le / thiết bị phần cứng sẽ nhận lệnh ({previewData.targets.length}):</span>
                  </label>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {previewData.targets.map((tgt, i) => (
                      <div
                        key={i}
                        className="p-2 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {tgt.node_id || 'Hộp IoT'} • Rơ-le #{tgt.relay_no}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          Tủ: {tgt.cabinet_id || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exclusions Warning */}
              {previewData.excluded && previewData.excluded.length > 0 && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    isAllExcluded
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        isAllExcluded ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600'
                      }`}
                    />
                    <span>
                      {isAllExcluded
                        ? 'Không thể phát lệnh (100% mục tiêu chưa sẵn sàng):'
                        : `Có ${previewData.excluded.length} mạch bị loại trừ (không gửi lệnh được):`}
                    </span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {previewData.excluded.map((exc, idx) => (
                      <li key={idx}>
                        Mạch {exc.feeder_id || 'vô danh'}: {exc.reason === 'not_wired' ? 'Chưa đấu nối rơ-le' : exc.reason === 'no_credential' ? 'Chưa cấp secret IoT' : exc.reason}
                      </li>
                    ))}
                  </ul>
                  {isAllExcluded && (
                    <p className="text-[10.5px] font-medium pt-1 border-t border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-400">
                      Vui lòng thiết lập đấu nối rơ-le cho mạch điện này trong phần Quản lý Tài sản trước khi điều khiển từ xa.
                    </p>
                  )}
                </div>
              )}

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Lệnh sẽ được gửi trực tiếp qua hạ tầng mạng IoT và lưu vết trên hệ thống để giám sát vận hành.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isCommandSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCommandSubmitting || isPreviewLoading || !hasExecutableTargets}
            title={!hasExecutableTargets ? 'Không có rơ-le nào được đấu nối để nhận lệnh' : undefined}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 ${
              isCommandSubmitting || isPreviewLoading || !hasExecutableTargets
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white cursor-pointer'
            }`}
          >
            {isCommandSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang gửi lệnh IoT...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{!hasExecutableTargets && !isPreviewLoading ? 'Không Có Rơ-le Khả Dụng' : 'Xác Nhận Phát Lệnh'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LightingPreviewModal

