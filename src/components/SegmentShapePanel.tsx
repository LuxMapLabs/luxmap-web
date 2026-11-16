import React from 'react'
import { AlertTriangle, MapPinned, PenLine, Route, Undo2 } from 'lucide-react'

/** Hình tuyến sẽ được lưu: theo con đường, nháp nối các cột, hoặc chưa có. */
export type SegmentShapeKind = 'road' | 'draft' | 'none'

interface SegmentShapePanelProps {
  kind: SegmentShapeKind
  /** Chiều dài của hình sẽ lưu; null khi chưa có hình. */
  lengthM: number | null
  picking: boolean
  pointCount: number
  error: string | null
  onStart: () => void
  onUndo: () => void
  onFinish: () => void
  onCancel: () => void
  /** Cột chưa thuộc tuyến nằm sát hình: thêm cả một lần. */
  suggestedCount: number
  onAddSuggested: () => void
  /** Cảnh báo không chặn: hình dài hơn nhiều so với chuỗi cột. */
  warning?: string | null
  /** Vẽ tay: bấm từng điểm dọc đường trên ảnh vệ tinh, nối thẳng (đường không có trên bản đồ nền). */
  freehand?: boolean
  onFreehandChange?: (freehand: boolean) => void
}

const meters = (m: number) => `${m.toLocaleString('vi-VN')} m`

const button =
  'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

/**
 * Lấy hình tuyến trong form tuyến. Quản lý không vẽ: bấm điểm đầu, điểm cuối trên con đường, máy bám theo đường.
 * Đường không có trên bản đồ nền thì chỉ chọn cột, máy tự nối thành hình nháp.
 */
export const SegmentShapePanel: React.FC<SegmentShapePanelProps> = ({
  kind,
  lengthM,
  picking,
  pointCount,
  error,
  onStart,
  onUndo,
  onFinish,
  onCancel,
  suggestedCount,
  onAddSuggested,
  warning = null,
  freehand = false,
  onFreehandChange,
}) => (
  <div className="space-y-2" aria-label="Hình tuyến">
    <div className="flex items-center justify-between">
      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
        <Route className="w-3.5 h-3.5 text-blue-500" />
        Hình tuyến
      </span>
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {kind === 'road' && 'Theo con đường'}
        {kind === 'draft' && 'Nháp: nối các cột'}
        {kind === 'none' && 'Chưa có hình'}
        {lengthM !== null && ` · ${meters(lengthM)}`}
      </span>
    </div>

    {picking ? (
      <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 space-y-2">
        {onFreehandChange && (
          <div className="flex gap-1.5" role="group" aria-label="Cách lấy hình">
            <button
              type="button"
              aria-pressed={!freehand}
              onClick={() => onFreehandChange(false)}
              className={`${button} flex items-center gap-1 ${
                freehand
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  : 'bg-orange-500 border-orange-500 text-white'
              }`}
            >
              <MapPinned className="w-3 h-3" />
              Theo đường bản đồ
            </button>
            <button
              type="button"
              aria-pressed={freehand}
              onClick={() => onFreehandChange(true)}
              className={`${button} flex items-center gap-1 ${
                freehand
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <PenLine className="w-3 h-3" />
              Vẽ tay
            </button>
          </div>
        )}
        <p>
          {freehand
            ? 'Vẽ tay: bấm từng điểm dọc con đường trên ảnh vệ tinh, máy nối thẳng các điểm. Đường cong thì bấm dày hơn; xong rồi vẫn kéo chấm trắng để chỉnh được.'
            : pointCount === 0
              ? 'Bấm điểm đầu ngay trên nét vàng (đường có trên bản đồ nền) ở bản đồ bên phải.'
              : 'Bấm tiếp dọc nét vàng tới điểm cuối; máy tự đi theo đường. Đi sai nhánh ở ngã ba thì bấm thêm một điểm trên nhánh đúng.'}
        </p>
        {error && (
          <p role="alert" className="flex gap-1.5 text-rose-700 dark:text-rose-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={pointCount === 0}
            className={`${button} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1`}
          >
            <Undo2 className="w-3 h-3" />
            Bỏ điểm cuối
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={pointCount < 2}
            className={`${button} bg-orange-500 border-orange-500 text-white`}
          >
            Xong
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${button} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200`}
          >
            Huỷ lấy hình
          </button>
        </div>
        <p className="text-[10px] text-orange-800/80 dark:text-orange-300/80">
          Nét đường lấy từ © OpenStreetMap, qua © MapTiler.
        </p>
      </div>
    ) : (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
        <button
          type="button"
          onClick={onStart}
          className={`${button} bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1`}
        >
          <MapPinned className="w-3.5 h-3.5" />
          {kind === 'road'
            ? 'Vẽ lại hình tuyến trên bản đồ'
            : 'Vẽ hình tuyến trên bản đồ'}
        </button>
        {kind === 'draft' && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Kéo chấm mờ giữa hai cột để uốn hình: hình thôi chạy theo cột và thành hình kéo thả (cột
            vẫn phải nằm trong 25 m quanh hình).
          </p>
        )}
        {kind === 'road' && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Kéo chấm trắng trên bản đồ để uốn, kéo chấm mờ để thêm chỗ uốn, nhấp đúp chấm trắng để
            xoá chỗ uốn.
          </p>
        )}
        {kind !== 'road' && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Đường không có trên bản đồ nền: chỉ cần chọn các cột của tuyến trên bản đồ (ít nhất 2
            cột có GPS), máy tự nối thành hình nháp. Tuyến chưa có hình vẫn lưu được.
          </p>
        )}
      </div>
    )}

    {warning && !picking && (
      <p
        role="status"
        className="flex gap-1.5 p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {warning}
      </p>
    )}

    {suggestedCount > 0 && (
      <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/20 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2">
        <span>
          <strong>{suggestedCount} cột</strong> chưa thuộc tuyến nào nằm trong 25 m quanh đường
          (viền cam trên bản đồ).
        </span>
        <button
          type="button"
          onClick={onAddSuggested}
          className={`${button} shrink-0 bg-orange-500 border-orange-500 text-white`}
        >
          Thêm cả {suggestedCount} cột
        </button>
      </div>
    )}
  </div>
)

export default SegmentShapePanel
