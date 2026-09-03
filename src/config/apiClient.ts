import axios, { AxiosRequestConfig, AxiosError } from 'axios'

const RAW_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5141/api/v1').trim().replace(/\/+$/, '')
export const API_BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`

// -------------------------------------------------------------
// In-Memory Token Storage (Không lưu Refresh Token trong sessionStorage)
// -------------------------------------------------------------
let inMemoryRefreshToken: string | null = null

export const setRefreshToken = (token: string | null) => {
  inMemoryRefreshToken = token
}

export const getRefreshToken = (): string | null => {
  return inMemoryRefreshToken
}

export const clearTokens = () => {
  sessionStorage.removeItem('accessToken')
  inMemoryRefreshToken = null
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Đính kèm Access Token từ sessionStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// -------------------------------------------------------------
// Queue cơ chế Refresh Token để tránh Race Condition (Token Rotation)
// -------------------------------------------------------------
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

// Response Interceptor: Tự động Refresh Token khi gặp lỗi 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Kiểm tra các endpoint không cần refresh token (login, register, refresh-token)
    const url = originalRequest?.url || ''
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh-token')

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Nếu đang có request khác thực hiện refresh token, xếp hàng request này lại
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const currentRefreshToken = getRefreshToken()
      if (!currentRefreshToken) {
        // Không có refresh token trong RAM, xóa sạch và chuyển về trang login
        clearTokens()
        isRefreshing = false
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        // Gọi API cấp lại token (backend nhận { refreshToken: string })
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: currentRefreshToken,
        })

        const authData = response.data?.data
        if (!authData?.accessToken) {
          throw new Error('Dữ liệu phản hồi cấp lại token không hợp lệ')
        }

        const { accessToken, refreshToken: newRefreshToken } = authData

        // Lưu Access Token mới vào sessionStorage
        sessionStorage.setItem('accessToken', accessToken)
        // Lưu Refresh Token mới vào biến In-Memory (Token Rotation)
        setRefreshToken(newRefreshToken || currentRefreshToken)

        processQueue(null, accessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
