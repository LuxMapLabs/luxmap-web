import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'
import { closeExportModal } from '../../feature/assets/assetSlice'
import {
  CheckCircle,
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
import { ExportAssetModal, type ExportableCategory } from './components/ExportAssetModal'
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
  const isExportModalOpen = useSelector((state: RootState) => Boolean(state.assets.isExportModalOpen))
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('segments')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFixtureCode, setSelectedFixtureCode] = useState<string>('')
  const [selectedPoleCode, setSelectedPoleCode] = useState<string>('')
  const [selectedCabinetCode, setSelectedCabinetCode] = useState<string>('')

  const exportCategory: ExportableCategory =
    activeCategory === 'iot_nodes'
      ? 'cabinets'
      : activeCategory === 'poles_and_fixtures'
      ? 'poles'
      : activeCategory

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
  } = useAssetData()

  return (
    <div className="h-full w-full flex flex-col bg-transparent dark:bg-slate-950 overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 px-1 pb-4 overflow-y-auto space-y-4">
        {/* Top Notification Banner */}
        {successBanner && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
          </div>
        )}

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
            onOpenImport={() => setIsImportModalOpen(true)}
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
            onOpenImport={() => setIsImportModalOpen(true)}
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
            onOpenImport={() => setIsImportModalOpen(true)}
          />
        )}

        {/* Tab 4 Content: Thiết bị IoT */}
        {activeCategory === 'iot_nodes' && (
          <IotNodesTab
            iotNodes={iotNodes}
            cabinets={cabinets}
            feeders={feeders}
            isLoading={isLoadingAssets}
            onAddIotNode={handleAddIotNode}
            onUpdateIotNode={handleUpdateIotNode}
            onDeleteIotNode={handleDeleteIotNode}
            onSetRelay={handleSetRelay}
            onIssueCredential={handleIssueCredential}
          />
        )}

        {/* Tab 5 Content: Cột điện */}
        {(activeCategory === 'poles' || activeCategory === 'poles_and_fixtures') && (
          <PolesTab
            poles={poles}
            cabinets={cabinets}
            segments={segments}
            isLoading={isLoadingAssets}
            activePoleCode={selectedPoleCode}
            onClearActivePole={() => setSelectedPoleCode('')}
            onAddPole={handleAddPole}
            onAddPoles={handleAddPoles}
            onUpdatePole={handleUpdatePole}
            onDeletePole={handleDeletePole}
            onOpenImport={() => setIsImportModalOpen(true)}
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
            onOpenImport={() => setIsImportModalOpen(true)}
          />
        )}
      </div>

      {/* Global Import Modal */}
      <ImportAssetModal
        isOpen={isImportModalOpen}
        category={activeCategory === 'iot_nodes' ? 'cabinets' : activeCategory}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Global Export Modal */}
      <ExportAssetModal
        isOpen={isExportModalOpen}
        initialCategory={exportCategory}
        onClose={() => dispatch(closeExportModal())}
        poles={poles}
        cabinets={cabinets}
        segments={segments}
        feeders={feeders}
        fixtures={fixtures}
      />
    </div>
  )
}

export default AssetManagementPage
