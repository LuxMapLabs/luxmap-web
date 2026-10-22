import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ImportResult } from '../../types/assets/import'
import type { ImportAssetCategory } from './assetAPI'
import type { PoleListItem, CreatePoleRequest, UpdatePoleRequest } from '../../types/assets/poles'
import type { CabinetListItem, CreateCabinetRequest, UpdateCabinetRequest } from '../../types/assets/cabinets'
import type { SegmentListItem, CreateSegmentRequest, UpdateSegmentRequest } from '../../types/assets/segments'
import type { FeederListItem, CreateFeederRequest, UpdateFeederRequest } from '../../types/assets/feeders'
import type { CreateFixtureRequest, RetireFixtureRequest } from '../../types/assets/fixtures'
import type {
  IotNodeItem,
  CreateIotNodeRequest,
  UpdateIotNodeRequest,
  SetRelayRequest,
  IotNodeCredential,
} from '../../types/assets/iot-nodes'

export interface AssetState {
  // Asset Collections from Backend API
  poles: PoleListItem[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  feeders: FeederListItem[]
  iotNodes: IotNodeItem[]
  isLoadingAssets: boolean
  loadAssetsError: string | null

  // Mutation State (Create / Update / Retire)
  isMutating: boolean
  mutationError: string | null

  // Import State
  isImporting: boolean
  importResult: ImportResult | null
  error: string | null

  // Export Modal State
  isExportModalOpen?: boolean
}

const initialState: AssetState = {
  poles: [],
  cabinets: [],
  segments: [],
  feeders: [],
  iotNodes: [],
  isLoadingAssets: false,
  loadAssetsError: null,

  isMutating: false,
  mutationError: null,

  isImporting: false,
  importResult: null,
  error: null,

  isExportModalOpen: false,
}

export interface ImportAssetPayload {
  category: ImportAssetCategory
  file: File
}

export interface FetchAssetsSuccessPayload {
  poles: PoleListItem[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  feeders?: FeederListItem[]
  iotNodes?: IotNodeItem[]
}

export interface CreatePolePayload {
  pole: CreatePoleRequest
  fixture?: CreateFixtureRequest
}

export interface UpdatePolePayload {
  poleId: string
  data: UpdatePoleRequest
}

export interface UpdateCabinetPayload {
  cabinetId: string
  data: UpdateCabinetRequest
}

export interface UpdateFeederPayload {
  feederId: string
  data: UpdateFeederRequest
}

export interface UpdateSegmentPayload {
  segmentId: string
  data: UpdateSegmentRequest
}

export interface RetireFixturePayload {
  fixtureId: string
  data: RetireFixtureRequest
}

export interface UpdateIotNodePayload {
  nodeId: string
  data: UpdateIotNodeRequest
}

export interface SetIotNodeRelayPayload {
  nodeId: string
  relayNo: number
  data: SetRelayRequest
}

export interface IssueIotNodeCredentialPayload {
  nodeId: string
  onSuccess?: (credential: IotNodeCredential) => void
}

const assetSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    // --- Fetch Real Assets from Backend ---
    fetchAssetsRequest: (state) => {
      state.isLoadingAssets = true
      state.loadAssetsError = null
    },
    fetchAssetsSuccess: (state, action: PayloadAction<FetchAssetsSuccessPayload>) => {
      state.isLoadingAssets = false
      state.poles = action.payload.poles
      state.cabinets = action.payload.cabinets
      state.segments = action.payload.segments
      state.feeders = action.payload.feeders || []
      state.iotNodes = action.payload.iotNodes || []
      state.loadAssetsError = null
    },
    fetchAssetsFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingAssets = false
      state.loadAssetsError = action.payload
    },

    // --- Mutation Actions (Redux-Saga First) ---
    createPoleRequest: (state, action: PayloadAction<CreatePolePayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createPolesBulkRequest: (state, action: PayloadAction<CreatePolePayload[]>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    updatePoleRequest: (state, action: PayloadAction<UpdatePolePayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createCabinetRequest: (state, action: PayloadAction<CreateCabinetRequest>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createCabinetsBulkRequest: (state, action: PayloadAction<CreateCabinetRequest[]>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    updateCabinetRequest: (state, action: PayloadAction<UpdateCabinetPayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createFeederRequest: (state, action: PayloadAction<CreateFeederRequest>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createFeedersBulkRequest: (state, action: PayloadAction<CreateFeederRequest[]>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    updateFeederRequest: (state, action: PayloadAction<UpdateFeederPayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    deleteFeederRequest: (state, action: PayloadAction<string>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createSegmentRequest: (state, action: PayloadAction<CreateSegmentRequest>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    updateSegmentRequest: (state, action: PayloadAction<UpdateSegmentPayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createFixtureRequest: (state, action: PayloadAction<CreateFixtureRequest>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    createFixturesBulkRequest: (state, action: PayloadAction<CreateFixtureRequest[]>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    retireFixtureRequest: (state, action: PayloadAction<RetireFixturePayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },

    // --- IoT Nodes Actions ---
    createIotNodeRequest: (state, action: PayloadAction<CreateIotNodeRequest>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    updateIotNodeRequest: (state, action: PayloadAction<UpdateIotNodePayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    deleteIotNodeRequest: (state, action: PayloadAction<string>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    setIotNodeRelayRequest: (state, action: PayloadAction<SetIotNodeRelayPayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },
    issueIotNodeCredentialRequest: (state, action: PayloadAction<IssueIotNodeCredentialPayload>) => {
      void action
      state.isMutating = true
      state.mutationError = null
    },

    mutationSuccess: (state, action: PayloadAction<string | undefined>) => {
      void action
      state.isMutating = false
      state.mutationError = null
    },
    mutationFailure: (state, action: PayloadAction<string>) => {
      state.isMutating = false
      state.mutationError = action.payload
    },

    // --- Import Actions ---
    importAssetRequest: (state, action: PayloadAction<ImportAssetPayload>) => {
      void action
      state.isImporting = true
      state.importResult = null
      state.error = null
    },
    importAssetSuccess: (state, action: PayloadAction<ImportResult>) => {
      state.isImporting = false
      state.importResult = action.payload
      state.error = null
    },
    importAssetFailure: (state, action: PayloadAction<string>) => {
      state.isImporting = false
      state.error = action.payload
    },
    resetImportState: (state) => {
      state.isImporting = false
      state.importResult = null
      state.error = null
    },

    // --- Export Modal Actions ---
    openExportModal: (state) => {
      state.isExportModalOpen = true
    },
    closeExportModal: (state) => {
      state.isExportModalOpen = false
    },
  },
})

export const {
  fetchAssetsRequest,
  fetchAssetsSuccess,
  fetchAssetsFailure,
  createPoleRequest,
  createPolesBulkRequest,
  updatePoleRequest,
  createCabinetRequest,
  createCabinetsBulkRequest,
  updateCabinetRequest,
  createFeederRequest,
  createFeedersBulkRequest,
  updateFeederRequest,
  deleteFeederRequest,
  createSegmentRequest,
  updateSegmentRequest,
  createFixtureRequest,
  createFixturesBulkRequest,
  retireFixtureRequest,
  createIotNodeRequest,
  updateIotNodeRequest,
  deleteIotNodeRequest,
  setIotNodeRelayRequest,
  issueIotNodeCredentialRequest,
  mutationSuccess,
  mutationFailure,
  importAssetRequest,
  importAssetSuccess,
  importAssetFailure,
  resetImportState,
  openExportModal,
  closeExportModal,
} = assetSlice.actions

export type { ImportAssetCategory }
export default assetSlice.reducer
