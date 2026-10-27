import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  ArtifactVersionItem,
  ArtifactVersionItemPagedResult,
  ArtifactVersionUsage,
  RegisterArtifactVersionRequest,
} from '../../types/admin/artifact-versions'
import type { ArtifactVersionQueryParams } from './artifactVersionAPI'

export interface AdminArtifactVersionState {
  items: ArtifactVersionItem[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null
  lastRefreshedAt: string | null

  // Đăng ký firmware mới
  isRegistering: boolean
  registerError: string | null
  registerSuccess: boolean

  // Chi tiết kiểm toán kết quả (Usage)
  selectedUsage: ArtifactVersionUsage | null
  isLoadingUsage: boolean
  usageError: string | null

  // Bộ lọc
  componentFilter: string
}

const initialState: AdminArtifactVersionState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  isLoading: false,
  error: null,
  lastRefreshedAt: null,

  isRegistering: false,
  registerError: null,
  registerSuccess: false,

  selectedUsage: null,
  isLoadingUsage: false,
  usageError: null,

  componentFilter: '',
}

const artifactVersionSlice = createSlice({
  name: 'adminArtifactVersions',
  initialState,
  reducers: {
    // 1. Fetch danh sách
    fetchArtifactVersionsRequest: (
      state,
      _action: PayloadAction<ArtifactVersionQueryParams | undefined>
    ) => {
      state.isLoading = true
      state.error = null
    },
    fetchArtifactVersionsSuccess: (
      state,
      action: PayloadAction<ArtifactVersionItemPagedResult>
    ) => {
      state.isLoading = false
      state.items = action.payload.items || []
      state.total = action.payload.total || 0
      state.page = action.payload.page || 1
      state.pageSize = action.payload.page_size || 10
      state.error = null
      state.lastRefreshedAt = new Date().toISOString()
    },
    fetchArtifactVersionsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 2. Đăng ký Firmware mới
    registerArtifactVersionRequest: (
      state,
      _action: PayloadAction<RegisterArtifactVersionRequest>
    ) => {
      state.isRegistering = true
      state.registerError = null
      state.registerSuccess = false
    },
    registerArtifactVersionSuccess: (
      state,
      action: PayloadAction<ArtifactVersionItem>
    ) => {
      state.isRegistering = false
      state.registerSuccess = true
      state.registerError = null
      state.items.unshift(action.payload)
      state.total += 1
    },
    registerArtifactVersionFailure: (state, action: PayloadAction<string>) => {
      state.isRegistering = false
      state.registerError = action.payload
      state.registerSuccess = false
    },
    resetRegisterState: (state) => {
      state.isRegistering = false
      state.registerError = null
      state.registerSuccess = false
    },

    // 3. Tra cứu kết quả sử dụng (Usage)
    fetchArtifactVersionUsageRequest: (state, _action: PayloadAction<number>) => {
      state.isLoadingUsage = true
      state.usageError = null
      state.selectedUsage = null
    },
    fetchArtifactVersionUsageSuccess: (
      state,
      action: PayloadAction<ArtifactVersionUsage>
    ) => {
      state.isLoadingUsage = false
      state.selectedUsage = action.payload
      state.usageError = null
    },
    fetchArtifactVersionUsageFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingUsage = false
      state.usageError = action.payload
    },
    clearSelectedUsage: (state) => {
      state.selectedUsage = null
      state.isLoadingUsage = false
      state.usageError = null
    },

    // 4. Lọc
    setComponentFilter: (state, action: PayloadAction<string>) => {
      state.componentFilter = action.payload
      state.page = 1
    },
  },
})

export const {
  fetchArtifactVersionsRequest,
  fetchArtifactVersionsSuccess,
  fetchArtifactVersionsFailure,
  registerArtifactVersionRequest,
  registerArtifactVersionSuccess,
  registerArtifactVersionFailure,
  resetRegisterState,
  fetchArtifactVersionUsageRequest,
  fetchArtifactVersionUsageSuccess,
  fetchArtifactVersionUsageFailure,
  clearSelectedUsage,
  setComponentFilter,
} = artifactVersionSlice.actions

export default artifactVersionSlice.reducer
