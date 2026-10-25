import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  CommuneItem,
  CommuneItemPagedResult,
  CreateCommuneRequest,
  UpdateCommuneRequest,
} from '../../types/admin/communes'
import type { CommuneQueryParams } from './communeAPI'

export interface AdminCommuneState {
  communes: CommuneItem[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // Action states (create, update)
  isSubmitting: boolean
  actionError: string | null
  actionSuccessMessage: string | null

  // Selected commune for detail/edit
  selectedCommune: CommuneItem | null
  isLoadingDetail: boolean

  // UI filters
  filters: {
    search: string
    hasBbox: 'all' | 'has_bbox' | 'no_bbox'
  }
}

const initialState: AdminCommuneState = {
  communes: [],
  total: 0,
  page: 1,
  pageSize: 10,
  isLoading: false,
  error: null,

  isSubmitting: false,
  actionError: null,
  actionSuccessMessage: null,

  selectedCommune: null,
  isLoadingDetail: false,

  filters: {
    search: '',
    hasBbox: 'all',
  },
}

export interface UpdateCommunePayload {
  id: string
  data: UpdateCommuneRequest
}

const adminCommuneSlice = createSlice({
  name: 'adminCommunes',
  initialState,
  reducers: {
    // --- Fetch Communes ---
    fetchCommunesRequest: (state, _action: PayloadAction<CommuneQueryParams | undefined>) => {
      state.isLoading = true
      state.error = null
    },
    fetchCommunesSuccess: (state, action: PayloadAction<CommuneItemPagedResult>) => {
      state.isLoading = false
      state.communes = action.payload.items || []
      state.total = action.payload.total || 0
      state.page = action.payload.page || 1
      state.pageSize = action.payload.page_size || 10
      state.error = null
    },
    fetchCommunesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // --- Fetch Commune Detail ---
    fetchCommuneDetailRequest: (state, _action: PayloadAction<string>) => {
      state.isLoadingDetail = true
      state.error = null
    },
    fetchCommuneDetailSuccess: (state, action: PayloadAction<CommuneItem>) => {
      state.isLoadingDetail = false
      state.selectedCommune = action.payload
    },
    fetchCommuneDetailFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingDetail = false
      state.error = action.payload
    },

    // --- Create Commune ---
    createCommuneRequest: (state, _action: PayloadAction<CreateCommuneRequest>) => {
      state.isSubmitting = true
      state.actionError = null
      state.actionSuccessMessage = null
    },
    createCommuneSuccess: (state, action: PayloadAction<CommuneItem>) => {
      state.isSubmitting = false
      state.communes.unshift(action.payload)
      state.total += 1
      state.actionSuccessMessage = 'Thêm địa bàn mới thành công'
    },
    createCommuneFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- Update Commune ---
    updateCommuneRequest: (state, _action: PayloadAction<UpdateCommunePayload>) => {
      state.isSubmitting = true
      state.actionError = null
      state.actionSuccessMessage = null
    },
    updateCommuneSuccess: (state, action: PayloadAction<CommuneItem>) => {
      state.isSubmitting = false
      const updated = action.payload
      const index = state.communes.findIndex((c) => c.commune_id === updated.commune_id)
      if (index !== -1) {
        state.communes[index] = updated
      }
      if (state.selectedCommune && state.selectedCommune.commune_id === updated.commune_id) {
        state.selectedCommune = updated
      }
      state.actionSuccessMessage = 'Cập nhật địa bàn và khung bản đồ thành công'
    },
    updateCommuneFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // --- UI State Helpers ---
    setSelectedCommune: (state, action: PayloadAction<CommuneItem | null>) => {
      state.selectedCommune = action.payload
    },
    setCommuneFilters: (
      state,
      action: PayloadAction<Partial<{ search: string; hasBbox: 'all' | 'has_bbox' | 'no_bbox' }>>
    ) => {
      state.filters = { ...state.filters, ...action.payload }
      state.page = 1
    },
    setCommunePage: (state, action: PayloadAction<number>) => {
      state.page = action.payload
    },
    clearCommuneActionStatus: (state) => {
      state.actionError = null
      state.actionSuccessMessage = null
    },
  },
})

export const {
  fetchCommunesRequest,
  fetchCommunesSuccess,
  fetchCommunesFailure,
  fetchCommuneDetailRequest,
  fetchCommuneDetailSuccess,
  fetchCommuneDetailFailure,
  createCommuneRequest,
  createCommuneSuccess,
  createCommuneFailure,
  updateCommuneRequest,
  updateCommuneSuccess,
  updateCommuneFailure,
  setSelectedCommune,
  setCommuneFilters,
  setCommunePage,
  clearCommuneActionStatus,
} = adminCommuneSlice.actions

export default adminCommuneSlice.reducer
