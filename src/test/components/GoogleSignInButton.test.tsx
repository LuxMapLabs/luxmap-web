import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GoogleSignInButton } from '../../components/GoogleSignInButton'

describe('GoogleSignInButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('ẩn nút khi chưa cấu hình VITE_GOOGLE_CLIENT_ID', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    render(<GoogleSignInButton onCredential={() => {}} />)

    expect(screen.queryByTestId('google-signin-button')).toBeNull()
  })

  it('hiện vùng chứa nút khi đã cấu hình Client ID', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
    render(<GoogleSignInButton onCredential={() => {}} />)

    expect(screen.getByTestId('google-signin-button')).toBeTruthy()
  })
})
