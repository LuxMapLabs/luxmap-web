import { useCallback, useEffect, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import assetAPI from '../../../../../feature/assets/assetAPI'
import type { IotCommandRequest, IotCommandStatus } from '../../../../../types/iot/nodes'

type Phase =
  'loading' | 'idle' | 'sending' | 'pending' | 'success' | 'superseded' | 'timeout' | 'error'
interface CommandState {
  phase: Phase
  status?: IotCommandStatus
  message?: string
}

function errorMessage(error: unknown): string {
  const response = (error as AxiosError<{ error?: { message?: string } }>)?.response
  if (response?.data?.error?.message) return response.data.error.message
  switch (response?.status) {
    case 403:
      return 'Bạn không có quyền điều khiển đèn'
    case 404:
      return 'Không tìm thấy thiết bị hoặc nguồn IoT chưa được cấu hình'
    case 400:
      return 'Lệnh điều khiển không hợp lệ'
    case 503:
      return 'Không kết nối được IoT Bridge'
    default:
      return 'Không thể đọc hoặc gửi lệnh điều khiển đèn'
  }
}

export function useIotLampCommand(nodeId: string) {
  const [state, setState] = useState<CommandState>({ phase: 'loading' })
  const generation = useRef(0)
  const busy = useRef(false)
  const controller = useRef<AbortController>()
  const pollTimer = useRef<ReturnType<typeof setTimeout>>()
  const deadlineTimer = useRef<ReturnType<typeof setTimeout>>()

  const stop = useCallback(() => {
    generation.current += 1
    controller.current?.abort()
    clearTimeout(pollTimer.current)
    clearTimeout(deadlineTimer.current)
    busy.current = false
  }, [])

  useEffect(() => {
    stop()
    const current = generation.current
    controller.current = new AbortController()
    setState({ phase: 'loading' })
    assetAPI.getIotNodeCommand(nodeId, controller.current.signal).then(
      (status) => {
        if (current === generation.current) setState({ phase: 'idle', status })
      },
      (error) => {
        if (current === generation.current)
          setState({ phase: 'error', message: errorMessage(error) })
      }
    )
    return stop
  }, [nodeId, stop])

  const send = async (request: IotCommandRequest) => {
    if (busy.current) return
    stop()
    busy.current = true
    const current = generation.current
    const abort = new AbortController()
    controller.current = abort
    setState({ phase: 'sending' })
    try {
      const accepted = await assetAPI.sendIotNodeCommand(nodeId, request, abort.signal)
      if (current !== generation.current) return
      if (!accepted.command_id) throw new Error('Missing command ID')
      setState({ phase: 'pending', status: accepted })
      const expiry = accepted.expires_at ? Date.parse(accepted.expires_at) : NaN
      const deadline = Number.isFinite(expiry) ? expiry : Date.now() + 60_000
      const finish = (phase: Phase, status = accepted, message?: string) => {
        stop()
        setState({ phase, status, message })
      }
      deadlineTimer.current = setTimeout(
        () => finish('timeout'),
        Math.max(0, deadline - Date.now())
      )
      const poll = async () => {
        try {
          const status = await assetAPI.getIotNodeCommand(nodeId, abort.signal)
          if (current !== generation.current) return
          if (Date.now() >= deadline) return finish('timeout')
          if (status.command_id !== accepted.command_id) return finish('superseded', status)
          if (status.command_acknowledged === true) return finish('success', status)
          pollTimer.current = setTimeout(poll, 2000)
        } catch (error) {
          if (current === generation.current) finish('error', accepted, errorMessage(error))
        }
      }
      pollTimer.current = setTimeout(poll, 2000)
    } catch (error) {
      if (current !== generation.current) return
      stop()
      setState({ phase: 'error', message: errorMessage(error) })
    }
  }

  return { ...state, send, isBusy: state.phase === 'sending' || state.phase === 'pending' }
}
