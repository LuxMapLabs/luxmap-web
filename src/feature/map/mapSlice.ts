import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CabinetPropertiesFeature, CabinetTopologyEdgePropertiesFeature } from '../../types/map/cabinets'
import type { PolePropertiesFeature, PoleMapDetail } from '../../types/map/poles'
import type { SegmentPropertiesFeature } from '../../types/map/segments'

export interface MapState {
  poles: PolePropertiesFeature[]
  cabinets: CabinetPropertiesFeature[]
  segments: SegmentPropertiesFeature[]
  isLoadingMap: boolean
  mapError: string | null

  // Cabinet Topology
  selectedCabinetId: string | null
  cabinetTopologyEdges: CabinetTopologyEdgePropertiesFeature[]
  isLoadingTopology: boolean
  topologyError: string | null

  // Pole Detail
  selectedPoleId: string | null
  poleDetail: PoleMapDetail | null
  isLoadingPoleDetail: boolean
  poleDetailError: string | null
}

const initialState: MapState = {
  poles: [],
  cabinets: [],
  segments: [],
  isLoadingMap: false,
  mapError: null,

  selectedCabinetId: null,
  cabinetTopologyEdges: [],
  isLoadingTopology: false,
  topologyError: null,

  selectedPoleId: null,
  poleDetail: null,
  isLoadingPoleDetail: false,
  poleDetailError: null,
}

export interface FetchMapLayersSuccessPayload {
  poles: PolePropertiesFeature[]
  cabinets: CabinetPropertiesFeature[]
  segments: SegmentPropertiesFeature[]
}

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    // 1. Fetch Map Layers (Poles, Cabinets, Segments)
    fetchMapLayersRequest: (state, _action: PayloadAction<{ bbox?: string } | undefined>) => {
      state.isLoadingMap = true
      state.mapError = null
    },
    fetchMapLayersSuccess: (state, action: PayloadAction<FetchMapLayersSuccessPayload>) => {
      state.isLoadingMap = false
      state.poles = action.payload.poles
      state.cabinets = action.payload.cabinets
      state.segments = action.payload.segments
      state.mapError = null
    },
    fetchMapLayersFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingMap = false
      state.mapError = action.payload
    },

    // 2. Fetch Cabinet Topology
    fetchCabinetTopologyRequest: (state, action: PayloadAction<string>) => {
      state.selectedCabinetId = action.payload
      state.isLoadingTopology = true
      state.topologyError = null
    },
    fetchCabinetTopologySuccess: (
      state,
      action: PayloadAction<{ cabinetId: string; edges: CabinetTopologyEdgePropertiesFeature[] }>
    ) => {
      state.isLoadingTopology = false
      state.selectedCabinetId = action.payload.cabinetId
      state.cabinetTopologyEdges = action.payload.edges
      state.topologyError = null
    },
    fetchCabinetTopologyFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingTopology = false
      state.topologyError = action.payload
      state.cabinetTopologyEdges = []
    },
    clearCabinetTopology: (state) => {
      state.selectedCabinetId = null
      state.cabinetTopologyEdges = []
      state.isLoadingTopology = false
      state.topologyError = null
    },

    // 3. Fetch Pole Detail
    fetchPoleDetailRequest: (state, action: PayloadAction<string>) => {
      state.selectedPoleId = action.payload
      state.isLoadingPoleDetail = true
      state.poleDetailError = null
    },
    fetchPoleDetailSuccess: (state, action: PayloadAction<PoleMapDetail>) => {
      state.isLoadingPoleDetail = false
      state.poleDetail = action.payload
      state.poleDetailError = null
    },
    fetchPoleDetailFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingPoleDetail = false
      state.poleDetailError = action.payload
    },
    clearPoleDetail: (state) => {
      state.selectedPoleId = null
      state.poleDetail = null
      state.isLoadingPoleDetail = false
      state.poleDetailError = null
    },
  },
})

export const {
  fetchMapLayersRequest,
  fetchMapLayersSuccess,
  fetchMapLayersFailure,
  fetchCabinetTopologyRequest,
  fetchCabinetTopologySuccess,
  fetchCabinetTopologyFailure,
  clearCabinetTopology,
  fetchPoleDetailRequest,
  fetchPoleDetailSuccess,
  fetchPoleDetailFailure,
  clearPoleDetail,
} = mapSlice.actions

export default mapSlice.reducer
