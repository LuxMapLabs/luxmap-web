import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '../../redux/rootReducer'
import {
  fetchAssetsRequest,
  createPolesBulkRequest,
  updatePoleRequest,
  deletePoleRequest,
  createCabinetsBulkRequest,
  updateCabinetRequest,
  deleteCabinetRequest,
  createFeederRequest,
  createFeedersBulkRequest,
  updateFeederRequest,
  deleteFeederRequest,
  createSegmentRequest,
  updateSegmentRequest,
  deleteSegmentRequest,
  createFixturesBulkRequest,
  retireFixtureRequest,
  createIotNodeRequest,
  updateIotNodeRequest,
  deleteIotNodeRequest,
  setIotNodeRelayRequest,
  issueIotNodeCredentialRequest,
} from '../../feature/assets/assetSlice'
import type { PoleListItem, CreatePoleRequest, UpdatePoleRequest } from '../../types/assets/poles'
import type { CabinetListItem, CreateCabinetRequest, UpdateCabinetRequest } from '../../types/assets/cabinets'
import type { SegmentListItem, CreateSegmentRequest, UpdateSegmentRequest } from '../../types/assets/segments'
import type { FeederListItem, CreateFeederRequest, UpdateFeederRequest } from '../../types/assets/feeders'
import type { ActiveFixture, CreateFixtureRequest, RetireFixtureRequest } from '../../types/assets/fixtures'
import type {
  IotNodeItem,
  CreateIotNodeRequest,
  UpdateIotNodeRequest,
  IotNodeCredential,
} from '../../types/assets/iot-nodes'

// ManagedFixture represents an active or historical fixture displayed in the fixtures table
export type ManagedFixture = ActiveFixture & {
  pole_id?: string | null
  pole_external_ref?: string | null
  removed_date?: string | null
}

export function useAssetData() {
  const dispatch = useDispatch()
  const {
    poles: backendPoles,
    cabinets: backendCabinets,
    segments: backendSegments,
    feeders: backendFeeders,
    iotNodes: backendIotNodes,
    isLoadingAssets,
    loadAssetsError,
    isMutating,
    mutationError,
  } = useSelector((state: RootState) => state.assets)

  const [poles, setPoles] = useState<PoleListItem[]>([])
  const [cabinets, setCabinets] = useState<CabinetListItem[]>([])
  const [segments, setSegments] = useState<SegmentListItem[]>([])
  const [feeders, setFeeders] = useState<FeederListItem[]>([])
  const [iotNodes, setIotNodes] = useState<IotNodeItem[]>([])
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Fetch real assets from Backend API on mount
  useEffect(() => {
    dispatch(fetchAssetsRequest())
  }, [dispatch])

  // Synchronize local table state when Backend data arrives
  useEffect(() => {
    if (backendPoles) {
      setPoles(backendPoles)
    }
  }, [backendPoles])

  useEffect(() => {
    if (backendCabinets) {
      setCabinets(backendCabinets)
    }
  }, [backendCabinets])

  useEffect(() => {
    if (backendSegments) {
      setSegments(backendSegments)
    }
  }, [backendSegments])

  useEffect(() => {
    if (backendFeeders) {
      setFeeders(backendFeeders)
    }
  }, [backendFeeders])

  useEffect(() => {
    if (backendIotNodes) {
      setIotNodes(backendIotNodes)
    }
  }, [backendIotNodes])

  // Fixtures are derived dynamically from poles carrying an active lamp
  const fixtures: ManagedFixture[] = useMemo(() => {
    return poles
      .filter((p) => p.active_fixture)
      .map((p) => {
        const fixtureId =
          p.active_fixture?.fixture_id ||
          (p.external_ref ? `FIX-${p.external_ref}` : null)
        return {
          ...(p.active_fixture as ActiveFixture),
          fixture_id: fixtureId,
          pole_id: p.pole_id,
          pole_external_ref: p.external_ref,
          removed_date: null,
        }
      })
  }, [poles])

  const showBanner = useCallback((msg: string) => {
    setSuccessBanner(msg)
    toast.success(msg)
    setTimeout(() => setSuccessBanner(null), 4000)
  }, [])

  // --- Pole Handlers (Redux-Saga First) ---
  const handleAddPole = async (data: PoleListItem) => {
    await handleAddPoles([data])
  }

  const handleAddPoles = async (dataList: PoleListItem[]) => {
    if (!dataList || dataList.length === 0) return

    const bulkPayload = dataList.map((item) => {
      const createReq: CreatePoleRequest = {
        external_ref: item.external_ref || item.pole_id || null,
        segment_id: item.segment_id || null,
        feeder_id: item.feeder_id || null,
        commune_id: item.commune_id || null,
        geom_wkt: item.location ? `POINT(${item.location.lng} ${item.location.lat})` : null,
        near_sensitive_poi: !!item.near_sensitive_poi,
        data_source: item.data_source || 'field',
        note: item.note ?? null,
      }

      let fixtureReq: CreateFixtureRequest | undefined = undefined
      if (item.active_fixture && item.pole_id) {
        fixtureReq = {
          pole_id: item.pole_id,
          fixture_type: item.active_fixture.fixture_type || 'led_road_lamp',
          power_source: item.active_fixture.power_source || 'grid',
          lamp_watt: Number(item.active_fixture.lamp_watt) || 100,
          lamp_count: Number(item.active_fixture.lamp_count) || 1,
          install_date: item.active_fixture.install_date || new Date().toISOString().split('T')[0],
          warranty_expiry: item.active_fixture.warranty_expiry || null,
          data_source: item.active_fixture.data_source || 'field',
        }
      }

      return { pole: createReq, fixture: fixtureReq }
    })

    dispatch(createPolesBulkRequest(bulkPayload))
  }

  const handleUpdatePole = async (updated: PoleListItem) => {
    if (!updated.pole_id) {
      toast.error('Thiếu mã định danh cột để cập nhật!')
      return
    }

    const updateReq: UpdatePoleRequest = {
      external_ref: updated.external_ref || updated.pole_id,
      segment_id: updated.segment_id || null,
      feeder_id: updated.feeder_id || null,
      geom_wkt: updated.location ? `POINT(${updated.location.lng} ${updated.location.lat})` : null,
      near_sensitive_poi: !!updated.near_sensitive_poi,
      data_source: updated.data_source || 'field',
      note: updated.note ?? null,
    }

    dispatch(updatePoleRequest({ poleId: updated.pole_id, data: updateReq }))
  }

  const handleDeletePole = async (poleId: string) => {
    dispatch(deletePoleRequest(poleId))
  }

  // --- Fixture Handlers (Redux-Saga First) ---
  const handleAddFixture = async (data: CreateFixtureRequest) => {
    await handleAddFixtures([data])
  }

  const handleAddFixtures = async (dataList: CreateFixtureRequest[]) => {
    if (!dataList || dataList.length === 0) return
    dispatch(createFixturesBulkRequest(dataList))
  }

  const handleUpdateFixture = (updated: ManagedFixture) => {
    setPoles((prev) =>
      prev.map((p) => {
        if (p.pole_id === updated.pole_id && p.active_fixture) {
          return {
            ...p,
            active_fixture: {
              ...p.active_fixture,
              ...updated,
            },
          }
        }
        return p
      })
    )
    showBanner(`Đã cập nhật thông số bộ đèn "${updated.fixture_id}"!`)
  }

  const handleRetireFixture = async (fixtureId: string, req: RetireFixtureRequest) => {
    dispatch(retireFixtureRequest({ fixtureId, data: req }))
  }

  // --- Cabinet Handlers (Redux-Saga First) ---
  const handleAddCabinet = async (data: CabinetListItem) => {
    await handleAddCabinets([data])
  }

  const handleAddCabinets = async (newCabinetsList: CabinetListItem[]) => {
    if (!newCabinetsList || newCabinetsList.length === 0) return

    const bulkPayload: CreateCabinetRequest[] = newCabinetsList.map((item) => ({
      external_ref: item.external_ref || item.cabinet_id || null,
      cabinet_name: item.cabinet_name || item.cabinet_id || 'Tủ điện mới',
      commune_id: item.commune_id || 'COM-001',
      geom_wkt: item.location ? `POINT(${item.location.lng} ${item.location.lat})` : null,
      data_source: item.data_source || 'field',
    }))

    dispatch(createCabinetsBulkRequest(bulkPayload))
  }

  const handleUpdateCabinet = async (updated: CabinetListItem) => {
    if (!updated.cabinet_id) {
      toast.error('Thiếu mã định danh tủ điện để cập nhật!')
      return
    }

    const updateReq: UpdateCabinetRequest = {
      external_ref: updated.external_ref || updated.cabinet_id,
      cabinet_name: updated.cabinet_name || updated.cabinet_id,
      geom_wkt: updated.location
        ? `POINT(${updated.location.lng} ${updated.location.lat})`
        : null,
      data_source: updated.data_source || 'field',
    }

    dispatch(updateCabinetRequest({ cabinetId: updated.cabinet_id, data: updateReq }))
  }

  const handleDeleteCabinet = async (cabinetId: string) => {
    dispatch(deleteCabinetRequest(cabinetId))
  }

  // --- Feeder Handlers (Redux-Saga First) ---
  const handleAddFeeder = async (data: CreateFeederRequest) => {
    dispatch(createFeederRequest(data))
  }

  const handleAddFeeders = async (list: CreateFeederRequest[]) => {
    dispatch(createFeedersBulkRequest(list))
  }

  const handleUpdateFeeder = async (feederId: string, updated: UpdateFeederRequest) => {
    dispatch(updateFeederRequest({ feederId, data: updated }))
  }

  const handleDeleteFeeder = async (feederId: string) => {
    dispatch(deleteFeederRequest(feederId))
  }

  // --- Segment Handlers (Redux-Saga First) ---
  const handleAddSegment = async (data: SegmentListItem) => {
    const createReq: CreateSegmentRequest = {
      external_ref: data.external_ref || data.segment_id || null,
      segment_name: data.segment_name || 'Tuyến đường mới',
      road_class: data.road_class || 'inter_commune',
      length_m: Number(data.length_m) || 0,
      commune_id: data.commune_id || 'COM-001',
      geom_wkt:
        'geom_wkt' in data && typeof data.geom_wkt === 'string'
          ? data.geom_wkt
          : 'LINESTRING(106.5 10.9, 106.51 10.91)',
      data_source: data.data_source || 'field',
    }

    dispatch(createSegmentRequest(createReq))
  }

  const handleUpdateSegment = async (updated: SegmentListItem) => {
    if (!updated.segment_id) {
      toast.error('Thiếu mã định danh tuyến đường để cập nhật!')
      return
    }

    const updateReq: UpdateSegmentRequest = {
      external_ref: updated.external_ref || updated.segment_id,
      segment_name: updated.segment_name,
      road_class: updated.road_class || 'inter_commune',
      length_m: Number(updated.length_m) || 0,
      geom_wkt:
        'geom_wkt' in updated && typeof updated.geom_wkt === 'string'
          ? updated.geom_wkt
          : null,
      data_source: updated.data_source || 'field',
    }

    dispatch(updateSegmentRequest({ segmentId: updated.segment_id, data: updateReq }))
  }

  const handleDeleteSegment = async (segmentId: string) => {
    dispatch(deleteSegmentRequest(segmentId))
  }

  // --- IoT Node Handlers (Redux-Saga First) ---
  const handleAddIotNode = async (data: CreateIotNodeRequest) => {
    dispatch(createIotNodeRequest(data))
  }

  const handleUpdateIotNode = async (nodeId: string, data: UpdateIotNodeRequest) => {
    dispatch(updateIotNodeRequest({ nodeId, data }))
  }

  const handleDeleteIotNode = async (nodeId: string) => {
    dispatch(deleteIotNodeRequest(nodeId))
  }

  const handleSetRelay = async (nodeId: string, relayNo: number, feederId: string | null) => {
    dispatch(
      setIotNodeRelayRequest({
        nodeId,
        relayNo,
        data: { feeder_id: feederId },
      })
    )
  }

  const handleIssueCredential = (
    nodeId: string,
    onSuccess: (cred: IotNodeCredential) => void
  ) => {
    dispatch(issueIotNodeCredentialRequest({ nodeId, onSuccess }))
  }

  // --- Import Handler ---
  const handleImportSuccess = useCallback(
    (count: number) => {
      toast.success(`Đã đồng bộ thành công ${count} tài sản vào Hệ thống! Dữ liệu mới đã sẵn sàng.`)
    },
    []
  )

  return {
    poles,
    fixtures,
    cabinets,
    segments,
    feeders,
    iotNodes,
    isLoadingAssets,
    loadAssetsError,
    isMutating,
    mutationError,
    successBanner,
    handleAddPole,
    handleAddPoles,
    handleUpdatePole,
    handleAddFixture,
    handleAddFixtures,
    handleUpdateFixture,
    handleRetireFixture,
    handleAddCabinet,
    handleAddCabinets,
    handleUpdateCabinet,
    handleAddFeeder,
    handleAddFeeders,
    handleUpdateFeeder,
    handleDeleteFeeder,
    handleDeleteCabinet,
    handleDeletePole,
    handleDeleteSegment,
    handleAddSegment,
    handleUpdateSegment,
    handleAddIotNode,
    handleUpdateIotNode,
    handleDeleteIotNode,
    handleSetRelay,
    handleIssueCredential,
    handleImportSuccess,
  }
}
