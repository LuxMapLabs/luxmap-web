import { useState } from 'react'
import type { IotCommandRequest } from '../../../../../types/iot/nodes'
import { useIotLampCommand } from './useIotLampCommand'

const actions: { label: string; request: IotCommandRequest }[] = [
  { label: 'Bật', request: { mode: 'MANUAL', command: 'ON' } },
  { label: 'Tắt', request: { mode: 'MANUAL', command: 'OFF' } },
  { label: 'Tự động', request: { mode: 'AUTO' } },
]

export function IotLampControl({ nodeId }: { nodeId: string }) {
  const { phase, status, message, send, isBusy } = useIotLampCommand(nodeId)
  const [selected, setSelected] = useState<(typeof actions)[number] | null>(null)
  return (
    <section className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
      <h4 className="font-bold text-slate-800 dark:text-slate-100">Điều khiển đèn</h4>
      {status && (
        <p>
          Lệnh hiện tại: {status.mode || '—'} / {status.command || '—'} —{' '}
          {status.command_acknowledged === true && ['idle', 'success', 'superseded'].includes(phase)
            ? 'Thiết bị đã xác nhận'
            : 'Chưa được thiết bị xác nhận'}
        </p>
      )}
      <p role="status" aria-live="polite">
        {phase === 'loading' && 'Đang tải trạng thái lệnh…'}
        {phase === 'sending' && 'Đang gửi lệnh…'}
        {phase === 'pending' && 'Đang chờ thiết bị xác nhận…'}
        {phase === 'success' && 'Thiết bị đã xác nhận lệnh'}
        {phase === 'superseded' && 'Lệnh đã bị lệnh khác thay thế'}
        {phase === 'timeout' &&
          'Chưa nhận xác nhận từ thiết bị. Lệnh vẫn có thể đến thiết bị; không tự động gửi lại.'}
        {phase === 'error' && message}
      </p>
      <div className="flex gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={isBusy}
            onClick={() => setSelected(action)}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>
      {selected && !isBusy && (
        <div className="p-3 rounded-xl border border-amber-300 space-y-2">
          <p>
            Xác nhận “{selected.label}”? Lệnh điều khiển toàn bộ mạch xuất tuyến (feeder) đấu vào
            rơ-le, không chỉ một đèn.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                void send(selected.request)
                setSelected(null)
              }}
              className="font-bold text-blue-600 cursor-pointer"
            >
              Xác nhận gửi lệnh
            </button>
            <button type="button" onClick={() => setSelected(null)} className="cursor-pointer">
              Hủy
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
