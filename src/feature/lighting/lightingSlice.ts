import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { LightingPreview } from '../../types/lighting/preview'
import type {
  CreateLightingRequest,
  LightingRequestResult,
  LightingCommandItemPagedResult,
} from '../../types/lighting/commands'
import type { FeederControlMode } from '../../types/common/enums'
import type { PreviewLightingParams, GetLightingCommandsParams } from './lightingAPI'

export interface HistoryModalOpenPayload {
  feederId?: string | null
  cabinetId?: string | null
  title?: string | null
}

export interface LightingState {
  // Preview State
  previewTarget: {
    kind: 'feeder' | 'segment'
    id: string
    requestedMode: FeederControlMode
  } | null
  previewData: LightingPreview | null
  isPreviewLoading: boolean
  previewError: string | null

  // Command Execution State
  isCommandSubmitting: boolean
  lastCommandResult: LightingRequestResult | null
  commandError: string | null

  // Active Control Modes (optimistic + persistent for feeders)
  // Key: feeder_id, Value: 'on' | 'off' | 'auto'
  activeFeederModes: Record<string, FeederControlMode>

  // Command History State
  history: LightingCommandItemPagedResult | null
  isHistoryLoading: boolean
  historyError: string | null
  isHistoryModalOpen: boolean
  historyFilterFeederId: string | null
  historyFilterCabinetId: string | null
  historyModalTitle: string | null
}

const initialState: LightingState = {
  previewTarget: null,
  previewData: null,
  isPreviewLoading: false,
  previewError: null,

  isCommandSubmitting: false,
  lastCommandResult: null,
  commandError: null,

  activeFeederModes: {},

  history: null,
  isHistoryLoading: false,
  historyError: null,
  isHistoryModalOpen: false,
  historyFilterFeederId: null,
  historyFilterCabinetId: null,
  historyModalTitle: null,
}

const lightingSlice = createSlice({
  name: 'lighting',
  initialState,
  reducers: {
    // --- 1. Preview Lighting ---
    previewLightingRequest: (
      state,
      action: PayloadAction<{
        params: PreviewLightingParams
        target: { kind: 'feeder' | 'segment'; id: string; requestedMode: FeederControlMode }
      }>
    ) => {
      state.isPreviewLoading = true
      state.previewError = null
      state.previewTarget = action.payload.target
      state.previewData = null
    },
    previewLightingSuccess: (state, action: PayloadAction<LightingPreview>) => {
      state.isPreviewLoading = false
      state.previewData = action.payload
      state.previewError = null
    },
    previewLightingFailure: (state, action: PayloadAction<string>) => {
      state.isPreviewLoading = false
      state.previewError = action.payload
    },
    clearPreview: (state) => {
      state.previewTarget = null
      state.previewData = null
      state.isPreviewLoading = false
      state.previewError = null
    },

    // --- 2. Execute Lighting Command ---
    createLightingCommandRequest: (state, _action: PayloadAction<CreateLightingRequest>) => {
      state.isCommandSubmitting = true
      state.commandError = null
      // Không gán cắm cứng state - tuân thủ 100% dữ liệu thực từ Backend API
    },
    createLightingCommandSuccess: (state, action: PayloadAction<LightingRequestResult>) => {
      state.isCommandSubmitting = false
      state.lastCommandResult = action.payload
      state.commandError = null
      // Đóng modal preview sau khi submit thành công
      state.previewTarget = null
      state.previewData = null
      // Không gán cắm cứng state - tuân thủ 100% dữ liệu thực từ Backend API
    },
    createLightingCommandFailure: (state, action: PayloadAction<string>) => {
      state.isCommandSubmitting = false
      state.commandError = action.payload
    },

    // --- 3. Get Command History ---
    getLightingCommandsRequest: (state, _action: PayloadAction<GetLightingCommandsParams | undefined>) => {
      state.isHistoryLoading = true
      state.historyError = null
    },
    getLightingCommandsSuccess: (state, action: PayloadAction<LightingCommandItemPagedResult>) => {
      state.isHistoryLoading = false
      state.history = action.payload
      state.historyError = null
    },
    getLightingCommandsFailure: (state, action: PayloadAction<string>) => {
      state.isHistoryLoading = false
      state.historyError = action.payload
    },

    // --- 4. History Modal Control ---
    openHistoryModal: (state, action: PayloadAction<HistoryModalOpenPayload | undefined>) => {
      state.isHistoryModalOpen = true
      state.historyFilterFeederId = action?.payload?.feederId || null
      state.historyFilterCabinetId = action?.payload?.cabinetId || null
      state.historyModalTitle = action?.payload?.title || null
    },
    closeHistoryModal: (state) => {
      state.isHistoryModalOpen = false
      state.historyFilterFeederId = null
      state.historyFilterCabinetId = null
      state.historyModalTitle = null
    },
    setHistoryFilterFeederId: (state, action: PayloadAction<string | null>) => {
      state.historyFilterFeederId = action.payload
    },
  },
})

export const {
  previewLightingRequest,
  previewLightingSuccess,
  previewLightingFailure,
  clearPreview,
  createLightingCommandRequest,
  createLightingCommandSuccess,
  createLightingCommandFailure,
  getLightingCommandsRequest,
  getLightingCommandsSuccess,
  getLightingCommandsFailure,
  openHistoryModal,
  closeHistoryModal,
  setHistoryFilterFeederId,
} = lightingSlice.actions

export default lightingSlice.reducer
