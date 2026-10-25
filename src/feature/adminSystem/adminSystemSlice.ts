import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SystemStatusResponse } from '../../types/admin/system'

export interface AdminSystemState {
  status: SystemStatusResponse | null
  isLoading: boolean
  error: string | null
  lastRefreshedAt: string | null
}

const initialState: AdminSystemState = {
  status: null,
  isLoading: false,
  error: null,
  lastRefreshedAt: null,
}

const adminSystemSlice = createSlice({
  name: 'adminSystem',
  initialState,
  reducers: {
    fetchSystemStatusRequest: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchSystemStatusSuccess: (state, action: PayloadAction<SystemStatusResponse>) => {
      state.isLoading = false
      state.status = action.payload
      state.error = null
      state.lastRefreshedAt = new Date().toISOString()
    },
    fetchSystemStatusFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
  },
})

export const {
  fetchSystemStatusRequest,
  fetchSystemStatusSuccess,
  fetchSystemStatusFailure,
} = adminSystemSlice.actions

export default adminSystemSlice.reducer
