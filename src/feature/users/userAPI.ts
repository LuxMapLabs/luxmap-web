import apiClient from '../../config/apiClient'
import type {
  UserAccountItemPagedResult,
  UserAccountItem,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  InvitationResponse,
} from '../../types/admin/users'

export interface UserQueryParams {
  page?: number
  page_size?: number
  role?: string
  status?: string
}

export const userAPI = {
  /**
   * Lấy danh sách tài khoản người dùng
   * GET /api/v1/admin/users
   */
  getUsers: async (params?: UserQueryParams): Promise<UserAccountItemPagedResult> => {
    const response = await apiClient.get<UserAccountItemPagedResult>('/admin/users', { params })
    return response.data
  },

  /**
   * Xem chi tiết tài khoản người dùng
   * GET /api/v1/admin/users/{id}
   */
  getUserDetail: async (id: string): Promise<UserAccountItem> => {
    const response = await apiClient.get<UserAccountItem>(`/admin/users/${id}`)
    return response.data
  },

  /**
   * Khởi tạo tài khoản mới
   * POST /api/v1/admin/users
   */
  createUser: async (payload: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await apiClient.post<CreateUserResponse>('/admin/users', payload)
    return response.data
  },

  /**
   * Cập nhật thông tin tài khoản
   * PATCH /api/v1/admin/users/{id}
   */
  updateUser: async (id: string, payload: UpdateUserRequest): Promise<UserAccountItem> => {
    const response = await apiClient.patch<UserAccountItem>(`/admin/users/${id}`, payload)
    return response.data
  },

  /**
   * Khóa tài khoản
   * POST /api/v1/admin/users/{id}/lock
   */
  lockUser: async (id: string): Promise<UserAccountItem> => {
    const response = await apiClient.post<UserAccountItem>(`/admin/users/${id}/lock`)
    return response.data
  },

  /**
   * Mở khóa tài khoản
   * POST /api/v1/admin/users/{id}/unlock
   */
  unlockUser: async (id: string): Promise<UserAccountItem> => {
    const response = await apiClient.post<UserAccountItem>(`/admin/users/${id}/unlock`)
    return response.data
  },

  /**
   * Gửi lại lời mời kích hoạt / đặt mật khẩu
   * POST /api/v1/admin/users/{id}/invite
   */
  inviteUser: async (id: string): Promise<InvitationResponse> => {
    const response = await apiClient.post<InvitationResponse>(`/admin/users/${id}/invite`)
    return response.data
  },
}

export const adminUserAPI = userAPI
