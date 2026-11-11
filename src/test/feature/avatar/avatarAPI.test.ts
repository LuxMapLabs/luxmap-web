import { describe, it, expect, afterEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import apiClient from '../../../config/apiClient'
import avatarAPI from '../../../feature/avatar/avatarAPI'

describe('avatarAPI.upload', () => {
  const originalAdapter = apiClient.defaults.adapter
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('gửi FormData có field file, không bị axios chuyển thành JSON', async () => {
    let sent: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      sent = config
      return { data: { avatar_url: '/api/v1/auth/me/avatar?v=1' }, status: 200, statusText: 'OK', headers: {}, config }
    }

    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' })
    const res = await avatarAPI.upload(file)

    expect(res.avatar_url).toBe('/api/v1/auth/me/avatar?v=1')
    expect(sent?.url).toBe('/auth/me/avatar')
    expect(sent?.data).toBeInstanceOf(FormData)
    expect((sent?.data as FormData).get('file')).toBeInstanceOf(File)
  })
})
