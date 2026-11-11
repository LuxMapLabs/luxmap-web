import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AvatarState {
  /** avatar_url (đã kèm ?v=) -> object URL của ảnh đã tải */
  images: Record<string, string>
  /** avatar_url đang tải hoặc đã tải lỗi, tránh gọi lặp */
  pending: Record<string, true>
  failed: Record<string, true>
  isSubmitting: boolean
}

const initialState: AvatarState = {
  images: {},
  pending: {},
  failed: {},
  isSubmitting: false,
}

const avatarSlice = createSlice({
  name: 'avatar',
  initialState,
  reducers: {
    fetchAvatarRequest: (state, action: PayloadAction<string>) => {
      const url = action.payload
      if (state.images[url] || state.pending[url] || state.failed[url]) return
      state.pending[url] = true
    },
    fetchAvatarSuccess: (state, action: PayloadAction<{ url: string; objectUrl: string }>) => {
      delete state.pending[action.payload.url]
      state.images[action.payload.url] = action.payload.objectUrl
    },
    fetchAvatarFailure: (state, action: PayloadAction<string>) => {
      delete state.pending[action.payload]
      state.failed[action.payload] = true
    },

    uploadAvatarRequest: (state, _action: PayloadAction<File>) => {
      state.isSubmitting = true
    },
    removeAvatarRequest: (state) => {
      state.isSubmitting = true
    },
    avatarSubmitDone: (state) => {
      state.isSubmitting = false
    },
  },
})

export const {
  fetchAvatarRequest,
  fetchAvatarSuccess,
  fetchAvatarFailure,
  uploadAvatarRequest,
  removeAvatarRequest,
  avatarSubmitDone,
} = avatarSlice.actions

export default avatarSlice.reducer
