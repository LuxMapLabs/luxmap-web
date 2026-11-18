import React, { useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'
import { closeImportModal } from '../../feature/assets/assetSlice'
import {
  Boxes,
  Zap,
  Route,
  Lightbulb,
  Cable,
  Cpu,
} from 'lucide-react'
import { PolesTab } from './components/poles/PolesTab'
import { FixturesTab } from './components/fixtures/FixturesTab'
import { CabinetsTab } from './components/cabinets/CabinetsTab'
import { SegmentsTab } from './components/segments/SegmentsTab'
import { FeedersTab } from './components/feeders/FeedersTab'
import { IotNodesTab } from './components/iot/IotNodesTab'
import { ImportAssetModal } from './components/ImportAssetModal'
import { AssetTabs } from './components/common/AssetTabs'
import { useAssetData } from '../../hooks/assets/useAssetData'

export type AssetCategory =
  | 'poles'
  | 'fixtures'
  | 'cabinets'
  | 'feeders'
  | 'segments'
  | 'iot_nodes'
  | 'poles_and_fixtures'

export const AssetManagementPage: React.FC = () => {
  const dispatch = useDispatch()
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('segments')
  const isImportModalOpen = useSelector((state: RootState) => Boolean(state.assets.isImportModalOpen))
  const [selectedFixtureCode, setSelectedFixtureCode] = useState<string>('')
  const [selectedPoleCode, setSelectedPoleCode] = useState<string>('')
  const [selectedCabinetCode, setSelectedCabinetCode] = useState<string>('')

  // Chuyển tab và xóa các mã đang được chọn sẵn ở những tab khác
  const selectCategory = (
    category: AssetCategory,
    reset: { pole?: boolean; fixture?: boolean; cabinet?: boolean }
  ) => {
    if (reset.fixture) setSelectedFixtureCode('')
    if (reset.pole) setSelectedPoleCode('')
    if (reset.cabinet) setSelectedCabinetCode('')
    setActiveCategory(category)
  }

  const handleSelectFixture = (fixtureCode: string) => {
    setSelectedFixtureCode(fixtureCode)
    setActiveCategory('fixtures')
  }

  const handleSelectPole = (poleCode: string) => {
    setSelectedPoleCode(poleCode)
    setActiveCategory('poles')
  }

  const handleSelectCabinet = (cabinetCode: string) => {
    setSelectedCabinetCode(cabinetCode)
    setActiveCategory('cabinets')
  }

  const {
    poles,
    fixtures,
    cabinets,
    segments,
    feeders,
    iotNodes,
    isLoadingAssets,
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
    handleUpdateFeeder,
    handleDeleteFeeder,
    handleDeleteCabinet,
    handleDeletePole,
    handleDeleteSegment,
    handleDrawSegment,
    handleAddSegment,
    handleUpdateSegment,
    handleImportSuccess,
  } = useAssetData()

  // Tuyến chưa có hình nhưng đã có từ 2 cột có GPS: cho phép vẽ tuyến
  const drawableSegmentIds = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of poles) {
      if (p.segment_id && p.location) counts.set(p.segment_id, (counts.get(p.segment_id) ?? 0) + 1)
    }
    return new Set(
      segments.filter((s) => !s.has_geometry && s.segment_id && (counts.get(s.segment_id) ?? 0) >= 2).map((s) => s.segment_id as string)
    )
  }, [poles, segments])

  return (
    <div className="h-full w-full flex flex-col bg-transparent dark:bg-slate-950 overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 px-1 pb-4 overflow-y-auto space-y-4">
        <AssetTabs
          groups={[
            [
              {
                key: 'segments',
                label: 'Tuyến đường',
                icon: Route,
                count: segments.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'segments',
                onSelect: () => selectCategory('segments', { pole: true, fixture: true, cabinet: true }),
              },
              {
                key: 'cabinets',
                label: 'Tủ điện',
                icon: Zap,
                count: cabinets.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'cabinets',
                onSelect: () => selectCategory('cabinets', { pole: true, fixture: true }),
              },
              {
                key: 'feeders',
                label: 'Mạch điện',
                icon: Cable,
                count: feeders.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'feeders',
                onSelect: () => selectCategory('feeders', { pole: true, fixture: true, cabinet: true }),
              },
            ],
            [
              {
                key: 'iot_nodes',
                label: 'Thiết bị IoT',
                icon: Cpu,
                count: iotNodes.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'iot_nodes',
                onSelect: () => selectCategory('iot_nodes', { pole: true, fixture: true, cabinet: true }),
              },
              {
                key: 'poles',
                label: 'Cột điện',
                icon: Boxes,
                count: poles.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'poles' || activeCategory === 'poles_and_fixtures',
                onSelect: () => selectCategory('poles', { fixture: true, cabinet: true }),
              },
              {
                key: 'fixtures',
                label: 'Bộ đèn',
                icon: Lightbulb,
                count: fixtures.length,
                isLoading: isLoadingAssets,
                active: activeCategory === 'fixtures',
                onSelect: () => selectCategory('fixtures', { pole: true, fixture: true, cabinet: true }),
              },
            ],
          ]}
        />

        {/* Tab 1 Content: Tuyến đường chiếu sáng */}
        {activeCategory === 'segments' && (
          <SegmentsTab
            segments={segments}
            isLoading={isLoadingAssets}
            onAddSegment={handleAddSegment}
            onUpdateSegment={handleUpdateSegment}
            onDeleteSegment={handleDeleteSegment}
            onDrawSegment={handleDrawSegment}
            drawableSegmentIds={drawableSegmentIds}
          />
        )}

        {/* Tab 2 Content: Tủ điện */}
        {activeCategory === 'cabinets' && (
          <CabinetsTab
            cabinets={cabinets}
            segments={segments}
            isLoading={isLoadingAssets}
            activeCabinetCode={selectedCabinetCode}
            onClearActiveCabinet={() => setSelectedCabinetCode('')}
            onAddCabinet={handleAddCabinet}
            onAddCabinets={handleAddCabinets}
            onUpdateCabinet={handleUpdateCabinet}
            onDeleteCabinet={handleDeleteCabinet}
          />
        )}

        {/* Tab 3 Content: Mạch điện (Feeder) */}
        {activeCategory === 'feeders' && (
          <FeedersTab
            feeders={feeders}
            cabinets={cabinets}
            poles={poles}
            isLoading={isLoadingAssets}
            onAddFeeder={handleAddFeeder}
            onUpdateFeeder={handleUpdateFeeder}
            onDeleteFeeder={handleDeleteFeeder}
          />
        )}

        {/* Tab 4 Content: Thiết bị IoT */}
        {activeCategory === 'iot_nodes' && (
          <IotNodesTab cabinets={cabinets} feeders={feeders} />
        )}

        {/* Tab 5 Content: Cột điện */}
        {(activeCategory === 'poles' || activeCategory === 'poles_and_fixtures') && (
          <PolesTab
            poles={poles}
            cabinets={cabinets}
            segments={segments}
            feeders={feeders}
            isLoading={isLoadingAssets}
            activePoleCode={selectedPoleCode}
            onClearActivePole={() => setSelectedPoleCode('')}
            onAddPole={handleAddPole}
            onAddPoles={handleAddPoles}
            onUpdatePole={handleUpdatePole}
            onDeletePole={handleDeletePole}
            onViewCabinetDetail={() => {
              setActiveCategory('cabinets')
            }}
            onSelectFixture={handleSelectFixture}
            onSelectCabinet={handleSelectCabinet}
          />
        )}

        {/* Tab 6 Content: Bộ đèn */}
        {activeCategory === 'fixtures' && (
          <FixturesTab
            fixtures={fixtures}
            poles={poles}
            segments={segments}
            activeFixtureCode={selectedFixtureCode}
            isLoading={isLoadingAssets}
            onClearActiveFixture={() => setSelectedFixtureCode('')}
            onSelectPole={handleSelectPole}
            onAddFixture={handleAddFixture}
            onAddFixtures={handleAddFixtures}
            onUpdateFixture={handleUpdateFixture}
            onRetireFixture={handleRetireFixture}
          />
        )}
      </div>

      {/* Global Import Modal */}
      <ImportAssetModal
        isOpen={isImportModalOpen}
        onClose={() => dispatch(closeImportModal())}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}

export default AssetManagementPage
