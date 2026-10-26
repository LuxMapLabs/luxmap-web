import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  UserAccountItem,
  UserAccountItemPagedResult,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  InvitationResponse,
} from '../../types/admin/users'
import type { UserQueryParams } from './userAPI'

export interface AdminUserState {
  users: UserAccountItem[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // Action states (create, update, lock, unlock, invite)
  isSubmitting: boolean
  invitingUserId: string | null
  actionError: string | null
  actionSuccessMessage: string | null

  // Selected user for edit/detail
  selectedUser: UserAccountItem | null

  // UI filters
  filters: {
    role: string
    status: string
    search: string
  }
}

const initialState: AdminUserState = {
  users: [],
  total: 0,
  page: 1,
  pageSize: 10,
  isLoading: false,
  error: null,

  isSubmitting: false,
  invitingUserId: null,
  actionError: null,
  actionSuccessMessage: null,

  selectedUser: null,

  filters: {
    role: '',
    status: '',
    search: '',
  },
}

export interface UpdateUserPayload {
  id: string
  data: UpdateUserRequest
}

const adminUserSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    // --- Fetch Users ---
    fetchUsersRequest: (state, _action: PayloadAction<UserQueryParams | undefined>) => {
      state.isLoading = true
      state.error = null
    },
    fetchUsersSuccess: (state, action: PayloadAction<UserAccountItemPagedResult>) => {
      state.isLoading = false
      state.users = action.payload.items || []
      state.total = action.payload.total || 0
      state.page = action.payload.page || 1
      state.pageSize = action.payload.page_size || 10
      state.error = null
    },
    fetchUsersFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // --- Create User ---
    createUserRequest: (state, _action: PayloadAction<CreateUserRequest>) => {
      state.isSubmitting = true
      state.actionError = null
      state.actionSuccessMessage = null
    },
    createUserSuccess: (state, action: PayloadAction<CreateUserResponse>) => {
      state.isSubmitting = false
      if (action.payload.user) {
        state.users.unshift(action.payload.user)
        state.total += 1
      }
      state.actionSuccessMessage = 'Tạo tài khoản người dùng thành công'
    },
    createUserFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- Update User ---
    updateUserRequest: (state, _action: PayloadAction<UpdateUserPayload>) => {
      state.isSubmitting = true
      state.actionError = null
      state.actionSuccessMessage = null
    },
    updateUserSuccess: (state, action: PayloadAction<UserAccountItem>) => {
      state.isSubmitting = false
      const updated = action.payload
      const index = state.users.findIndex((u) => u.user_id === updated.user_id)
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...updated }
      }
      if (state.selectedUser && state.selectedUser.user_id === updated.user_id) {
        state.selectedUser = { ...state.selectedUser, ...updated }
      }
      state.actionSuccessMessage = 'Cập nhật tài khoản thành công'
    },
    updateUserFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- Lock User ---
    lockUserRequest: (state, _action: PayloadAction<string>) => {
      state.isSubmitting = true
      state.actionError = null
    },
    lockUserSuccess: (state, action: PayloadAction<UserAccountItem>) => {
      state.isSubmitting = false
      const updated = action.payload
      const targetId = updated?.user_id
      if (targetId) {
        const index = state.users.findIndex((u) => u.user_id === targetId)
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...updated, status: 'locked' }
        }
      }
      state.actionSuccessMessage = 'Đã khóa tài khoản thành công'
    },
    lockUserFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- Unlock User ---
    unlockUserRequest: (state, _action: PayloadAction<string>) => {
      state.isSubmitting = true
      state.actionError = null
    },
    unlockUserSuccess: (state, action: PayloadAction<UserAccountItem>) => {
      state.isSubmitting = false
      const updated = action.payload
      const targetId = updated?.user_id
      if (targetId) {
        const index = state.users.findIndex((u) => u.user_id === targetId)
        if (index !== -1) {
          state.users[index] = {
            ...state.users[index],
            ...updated,
            status: updated?.password_set_at ? 'active' : 'invited',
          }
        }
      }
      state.actionSuccessMessage = 'Đã mở khóa tài khoản thành công'
    },
    unlockUserFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- Invite User ---
    inviteUserRequest: (state, action: PayloadAction<string>) => {
      state.isSubmitting = true
      state.invitingUserId = action.payload
      state.actionError = null
    },
    inviteUserSuccess: (state, _action: PayloadAction<InvitationResponse>) => {
      state.isSubmitting = false
      state.invitingUserId = null
      state.actionSuccessMessage = 'Đã gửi lại lời mời kích hoạt thành công'
    },
    inviteUserFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.invitingUserId = null
      state.actionError = action.payload
    },

    // --- UI State Helpers ---
    setSelectedUser: (state, action: PayloadAction<UserAccountItem | null>) => {
      state.selectedUser = action.payload
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<{ role: string; status: string; search: string }>>
    ) => {
      state.filters = { ...state.filters, ...action.payload }
      state.page = 1
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload
    },
    clearActionStatus: (state) => {
      state.actionError = null
      state.actionSuccessMessage = null
    },
  },
})

export const {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  createUserRequest,
  createUserSuccess,
  createUserFailure,
  updateUserRequest,
  updateUserSuccess,
  updateUserFailure,
  lockUserRequest,
  lockUserSuccess,
  lockUserFailure,
  unlockUserRequest,
  unlockUserSuccess,
  unlockUserFailure,
  inviteUserRequest,
  inviteUserSuccess,
  inviteUserFailure,
  setSelectedUser,
  setFilters,
  setPage,
  clearActionStatus,
} = adminUserSlice.actions

export default adminUserSlice.reducer
