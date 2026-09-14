import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import tokenStorage from '../utils/tokenStorage'

const RAW_URL = (import.meta.env.VITE_API_URL || 'https://localhost:7252/api/v1').trim().replace(/\/+$/, '')
export const API_BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`

export const setRefreshToken = (_token: string | null) => {
  // Cookie HttpOnly được backend quản lý tự động
}

export const getRefreshToken = (): string | null => {
  return null
}

export const clearTokens = () => {
  tokenStorage.clearAll()
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // BẮT BUỘC: Cho phép browser gửi và nhận HttpOnly Cookie (__Secure-luxmap_rt)
  withCredentials: true,
})

// Request Interceptor: Đính kèm Access Token vào Header Authorization
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// -------------------------------------------------------------
// Queue cơ chế Silent Refresh Token để tránh Race Condition
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

// Response Interceptor: Tự động Silent Refresh khi gặp lỗi 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Kiểm tra các endpoint xác thực không retry để tránh lặp vô hạn
    const url = originalRequest?.url || ''
    const isAuthEndpoint =
      url.includes('/auth/web/login') ||
      url.includes('/auth/web/refresh') ||
      url.includes('/auth/web/logout') ||
      url.includes('/auth/login') ||
      url.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
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

      try {
        // Gọi API Web Refresh: không cần body, browser tự gửi cookie __Secure-luxmap_rt
        const response = await axios.post(
          `${API_BASE_URL}/auth/web/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        )

        const newToken =
          response.data?.access_token ||
          response.data?.accessToken ||
          response.data?.data?.access_token ||
          response.data?.data?.accessToken
        if (!newToken) {
          throw new Error('Không nhận được accessToken mới từ phản hồi refresh')
        }

        // Cập nhật token mới vào storage
        tokenStorage.updateAccessToken(newToken)

        processQueue(null, newToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clearAll()
        // Chỉ redirect nếu không ở trang login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
