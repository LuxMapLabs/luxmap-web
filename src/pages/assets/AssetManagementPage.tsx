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
import { TabCountBadge } from './components/common/TabCountBadge'
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
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {/* Top Notification Banner */}
        {successBanner && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-semibold flex items-center shadow-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
          </div>
        )}

        {/* Segmented Control Navigation Tabs - Silky Sliding Active Pill */}
        <div className="relative grid grid-cols-6 bg-slate-100/85 dark:bg-slate-900/85 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none">
          {/* Animated Sliding Active Pill */}
          <div
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-[0_2px_8px_-1px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 dark:border-slate-700/80 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              width: 'calc((100% - 15px) / 6)',
              transform: `translateX(calc(${
                activeCategory === 'segments'
                  ? 0
                  : activeCategory === 'cabinets'
                  ? 100
                  : activeCategory === 'feeders'
                  ? 200
                  : activeCategory === 'iot_nodes'
                  ? 300
                  : activeCategory === 'poles' || activeCategory === 'poles_and_fixtures'
                  ? 400
                  : 500
              }%))`,
            }}
          />

          {/* Tab 1: Tuyến đường chiếu sáng */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedPoleCode('')
              setSelectedCabinetCode('')
              setActiveCategory('segments')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'segments'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Route
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'segments'
                  ? 'text-indigo-600 dark:text-indigo-400 scale-110 drop-shadow-[0_1px_2px_rgba(79,70,229,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Tuyến đường chiếu sáng</span>
            <TabCountBadge
              count={segments.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'segments'}
              colorScheme="indigo"
            />
          </button>

          {/* Tab 2: Tủ điện */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedPoleCode('')
              setActiveCategory('cabinets')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'cabinets'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Zap
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'cabinets'
                  ? 'text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_1px_2px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Tủ điện</span>
            <TabCountBadge
              count={cabinets.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'cabinets'}
              colorScheme="purple"
            />
          </button>

          {/* Tab 3: Mạch điện (Feeder) */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedPoleCode('')
              setSelectedCabinetCode('')
              setActiveCategory('feeders')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'feeders'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Cable
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'feeders'
                  ? 'text-emerald-600 dark:text-emerald-400 scale-110 drop-shadow-[0_1px_2px_rgba(5,150,105,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Mạch điện</span>
            <TabCountBadge
              count={feeders.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'feeders'}
              colorScheme="blue"
            />
          </button>

          {/* Tab 4: Thiết bị IoT */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedPoleCode('')
              setSelectedCabinetCode('')
              setActiveCategory('iot_nodes')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'iot_nodes'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Cpu
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'iot_nodes'
                  ? 'text-purple-600 dark:text-purple-400 scale-110 drop-shadow-[0_1px_2px_rgba(147,51,234,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Thiết bị IoT</span>
            <TabCountBadge
              count={iotNodes.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'iot_nodes'}
              colorScheme="purple"
            />
          </button>

          {/* Tab 5: Cột điện */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedCabinetCode('')
              setActiveCategory('poles')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'poles' || activeCategory === 'poles_and_fixtures'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Boxes
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'poles' || activeCategory === 'poles_and_fixtures'
                  ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Cột điện</span>
            <TabCountBadge
              count={poles.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'poles' || activeCategory === 'poles_and_fixtures'}
              colorScheme="blue"
            />
          </button>

          {/* Tab 6: Bộ đèn */}
          <button
            type="button"
            onClick={() => {
              setSelectedFixtureCode('')
              setSelectedPoleCode('')
              setSelectedCabinetCode('')
              setActiveCategory('fixtures')
            }}
            className={`relative z-10 py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 ${
              activeCategory === 'fixtures'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Lightbulb
              className={`w-4 h-4 transition-all duration-300 ${
                activeCategory === 'fixtures'
                  ? 'text-amber-500 dark:text-amber-400 scale-110 drop-shadow-[0_1px_2px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400'
              }`}
            />
            <span>Bộ đèn</span>
            <TabCountBadge
              count={fixtures.length}
              isLoading={isLoadingAssets}
              isActive={activeCategory === 'fixtures'}
              colorScheme="amber"
            />
          </button>
        </div>

        {/* Tab 1 Content: Tuyến đường chiếu sáng */}
        {activeCategory === 'segments' && (
          <SegmentsTab
            segments={segments}
            isLoading={isLoadingAssets}
            onAddSegment={handleAddSegment}
            onUpdateSegment={handleUpdateSegment}
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
