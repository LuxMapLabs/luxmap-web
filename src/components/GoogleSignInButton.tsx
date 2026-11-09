import { useEffect, useRef } from 'react'

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

interface GsiCredentialResponse {
  credential?: string
}

interface GsiButtonOptions {
  type: 'standard'
  theme: 'outline' | 'filled_blue' | 'filled_black'
  size: 'large' | 'medium' | 'small'
  text: 'signin_with'
  shape: 'rectangular'
  logo_alignment: 'left'
  width: number
  locale: string
}

interface GsiIdApi {
  initialize: (config: {
    client_id: string
    callback: (response: GsiCredentialResponse) => void
  }) => void
  renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiIdApi } }
  }
}

let scriptPromise: Promise<void> | null = null

const loadGsiScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Không tải được Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface GoogleSignInButtonProps {
  /** Nhận Google ID token sau khi người dùng chọn tài khoản */
  onCredential: (idToken: string) => void
  /** Gọi khi không tải được script Google (mạng, bị chặn) */
  onLoadError?: () => void
  width?: number
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  onLoadError,
  width = 320,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onLoadError)
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

  useEffect(() => {
    callbackRef.current = onCredential
    errorRef.current = onLoadError
  }, [onCredential, onLoadError])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential)
          },
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
          locale: 'vi',
        })
      })
      .catch(() => {
        if (!cancelled) errorRef.current?.()
      })

    return () => {
      cancelled = true
    }
  }, [clientId, width])

  // Chưa cấu hình Client ID thì ẩn hẳn tính năng
  if (!clientId) return null

  return <div ref={containerRef} className="flex justify-center" data-testid="google-signin-button" />
}

export default GoogleSignInButton
