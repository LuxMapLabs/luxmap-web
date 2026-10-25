import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SettingItem, SettingsResponse, UpdateSettingRequest } from '../../types/admin/settings'

export interface SettingsState {
  items: SettingItem[]
  isLoading: boolean
  error: string | null
  isUpdating: boolean
  updatingKey: string | null
  updateError: string | null
}

const initialState: SettingsState = {
  items: [],
  isLoading: false,
  error: null,
  isUpdating: false,
  updatingKey: null,
  updateError: null,
}

export interface UpdateSettingPayload {
  key: string
  data: UpdateSettingRequest
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // --- Lấy danh sách cấu hình ---
    fetchSettingsRequest: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchSettingsSuccess: (state, action: PayloadAction<SettingsResponse>) => {
      state.isLoading = false
      state.items = action.payload.items || []
      state.error = null
    },
    fetchSettingsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // --- Cập nhật một cấu hình ---
    updateSettingRequest: (state, action: PayloadAction<UpdateSettingPayload>) => {
      state.isUpdating = true
      state.updatingKey = action.payload.key
      state.updateError = null
    },
    updateSettingSuccess: (state, action: PayloadAction<SettingItem>) => {
      state.isUpdating = false
      state.updatingKey = null
      state.updateError = null

      if (action.payload?.key) {
        const index = state.items.findIndex((item) => item.key === action.payload.key)
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...action.payload,
          }
        }
      }
    },
    updateSettingFailure: (state, action: PayloadAction<string>) => {
      state.isUpdating = false
      state.updatingKey = null
      state.updateError = action.payload
    },
  },
})

export const {
  fetchSettingsRequest,
  fetchSettingsSuccess,
  fetchSettingsFailure,
  updateSettingRequest,
  updateSettingSuccess,
  updateSettingFailure,
} = settingsSlice.actions

export default settingsSlice.reducer
