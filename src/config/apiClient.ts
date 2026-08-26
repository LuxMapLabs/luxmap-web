import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request Interceptor: Attach Access Token
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

// Response Interceptor: Handle Refresh Token
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true

            try {
                const refreshToken = sessionStorage.getItem('refreshToken')
                if (!refreshToken) {
                    throw new Error('No refresh token available')
                }

                const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                })

                const authData = response.data?.data
                if (!authData) {
                    throw new Error('Invalid refresh response data')
                }

                const { accessToken, refreshToken: newRefreshToken } = authData

                sessionStorage.setItem('accessToken', accessToken)
                if (newRefreshToken) {
                    sessionStorage.setItem('refreshToken', newRefreshToken)
                }

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`
                }
                return apiClient(originalRequest)
            } catch (refreshError) {
                sessionStorage.removeItem('accessToken')
                sessionStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export default apiClient
