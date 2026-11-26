import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  fetchDashboardDataRequest,
  fetchDashboardIotRequest,
  fetchFeederHistoryRequest,
  fetchCitizenScreeningRequest,
  setIncludeCalibrationRig,
} from '../../feature/dashboard/dashboardSlice'
import type { FaultItem } from '../../types/faults/faults'

import { DashboardToolbar } from './components/DashboardToolbar'
import { DashboardKpiCards } from './components/DashboardKpiCards'
import { LightingStatusCard } from './components/DashboardCharts'
import { WarrantyTableCard } from './components/WarrantyTableCard'
import { FaultsTableCard, getFaultProgressInfo } from './components/FaultsTableCard'
import { UrgentFaultsCard } from './components/UrgentFaultsCard'
import { FaultDetailModal } from './components/FaultDetailModal'
import { IotDiagnosticsCard } from './components/IotDiagnosticsCard'
import { CitizenScreeningCard } from './components/CitizenScreeningCard'

export const ManagerDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  // Refs cuộn mượt đến các bảng/biểu đồ tương ứng khi click thẻ KPI
  const chartsRef = useRef<HTMLDivElement>(null)
  const faultsTableRef = useRef<HTMLDivElement>(null)
  const warrantyTableRef = useRef<HTMLDivElement>(null)

  // Redux Global State (được quản lý và nạp bởi Redux-Saga)
  const {
    segmentsList,
    warrantyList,
    faultsList,
    fixtureStatusRows,
    iotSummary,
    iotServers,
    segmentFeederMap,
    unlocatedPoleSegments,
    polesCapped,
    includeCalibrationRig,
    selectedFeederHistory,
    selectedFeederHistoryLoading,
    iotLastUpdated,
    citizenScreening,
    citizenScreeningLoading,
    loading,
  } = useSelector((state: RootState) => state.dashboard)

  const handleSelectFeeder = useCallback(
    (feederId: string) => {
      dispatch(fetchFeederHistoryRequest(feederId))
    },
    [dispatch]
  )

  // State Filters
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [faultTab, setFaultTab] = useState<'all' | 'blackout' | 'dim' | 'offline'>('all')
  const [warrantyTab, setWarrantyTab] = useState<'all' | 'expired' | 'expiring'>('all')

  // Modal State
  const [selectedFault, setSelectedFault] = useState<FaultItem | null>(null)

  // Handlers cuộn mượt khi click các thẻ KPI
  const handleScrollToCharts = () => {
    chartsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleScrollToFaults = (tab?: 'all' | 'blackout') => {
    if (tab) setFaultTab(tab)
    faultsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleScrollToWarranty = () => {
    warrantyTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Điều hướng sang trang tạo WorkOrder (hỗ trợ cả sự cố cột/tuyến lẫn sự cố từ IoT)
  const handleNavigateToCreateSchedule = (fault: FaultItem) => {
    if (!fault.pole_id && !fault.segment_id && !fault.origin_node_id && !fault.feeder_id) {
      setSelectedFault(fault)
      return
    }

    navigate('/work-schedule', {
      state: {
        openCreateModal: true,
        initialTaskKind: 'inspection',
        prefillFault: fault,
        prefillSegmentId: fault.segment_id,
        prefillPoleId: fault.pole_id,
        prefillFaultId: fault.fault_id,
        prefillNote: fault.note || fault.review_note || '',
      },
    })
  }

  // Tải dữ liệu toàn diện qua Redux-Saga khi vào trang Dashboard
  useEffect(() => {
    dispatch(fetchDashboardDataRequest())
  }, [dispatch])

  // Khối báo cáo QR tải riêng, theo tuyến đang lọc (backend lọc theo tuyến của cột)
  useEffect(() => {
    dispatch(fetchCitizenScreeningRequest(selectedSegment === 'all' ? null : selectedSegment))
  }, [dispatch, selectedSegment])

  // Tự động làm mới nhẹ dữ liệu IoT mỗi 30 giây khi tab đang hiển thị
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchDashboardIotRequest())
      }
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [dispatch])

  // Map tên tuyến đường
  const segmentNameMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    segmentsList.forEach((s) => {
      if (s.segment_id) {
        map[s.segment_id] = s.segment_name || s.segment_id
      }
    })
    return map
  }, [segmentsList])

  // --- TÍNH TOÁN DỮ LIỆU KPI & BIỂU ĐỒ (ĐỒNG BỘ 100% VỚI DATABASE) ---

  // 1. Phân bố trạng thái từng tuyến đường: lấy thẳng từ statistics/fixture-status (backend tính).
  //    Cột chưa được quét phủ là "chưa quét", không tự coi là bình thường.
  const dynamicSegments = useMemo(() => {
    return segmentsList.map((seg) => {
      const segId = seg.segment_id || ''
      const rows = fixtureStatusRows.filter((r) => r.segment_id === segId)
      const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((acc, r) => acc + pick(r), 0)

      return {
        id: segId,
        name: seg.segment_name || segId,
        poleCount: sum((r) => r.pole_count),
        normal: sum((r) => r.normal),
        dim: sum((r) => r.dim),
        out: sum((r) => r.out),
        unknown: sum((r) => r.unknown),
      }
    })
  }, [segmentsList, fixtureStatusRows])

  // 2. KPI Tình trạng đèn
  const fixtureKpis = useMemo(() => {
    const activeSegments =
      selectedSegment === 'all'
        ? dynamicSegments
        : dynamicSegments.filter((s) => s.id === selectedSegment)

    const totalPoles = activeSegments.reduce((acc, s) => acc + s.poleCount, 0)
    const totalNormal = activeSegments.reduce((acc, s) => acc + s.normal, 0)
    const totalDim = activeSegments.reduce((acc, s) => acc + s.dim, 0)
    const totalOut = activeSegments.reduce((acc, s) => acc + s.out, 0)
    const totalUnknown = activeSegments.reduce((acc, s) => acc + s.unknown, 0)

    const normalPct = totalPoles > 0 ? ((totalNormal / totalPoles) * 100).toFixed(1) : '0.0'
    const dimPct = totalPoles > 0 ? ((totalDim / totalPoles) * 100).toFixed(1) : '0.0'
    const outPct = totalPoles > 0 ? ((totalOut / totalPoles) * 100).toFixed(1) : '0.0'

    return {
      totalPoles,
      totalNormal,
      totalDim,
      totalOut,
      totalUnknown,
      normalPct,
      dimPct,
      outPct,
    }
  }, [dynamicSegments, selectedSegment])

  // 3. KPI Bảo hành (Điều kiện: Đã hết hạn hoặc sắp hết trong vòng 1 tháng / <= 30 ngày)
  const warrantyKpis = useMemo(() => {
    const items = warrantyList.items || []
    const filtered =
      selectedSegment === 'all'
        ? items
        : items.filter((i) => i.segment_id === selectedSegment)

    const expiringCount = filtered.filter(
      (i) => i.days_remaining != null && i.days_remaining >= 0 && i.days_remaining <= 30
    ).length
    const expiredCount = filtered.filter(
      (i) => i.days_remaining != null && i.days_remaining < 0
    ).length

    return { expiringCount, expiredCount, items: filtered }
  }, [warrantyList, selectedSegment])

  // 4. Biểu đồ Cột Stacked Bar Chart (Cập nhật tương tác mượt mà theo Tuyến đường)
  const barChartData = useMemo(() => {
    // Khi chọn 1 tuyến cụ thể: Hiển thị chi tiết của tuyến đó
    if (selectedSegment !== 'all') {
      const seg = dynamicSegments.find((s) => s.id === selectedSegment)
      if (seg) {
        return [
          {
            name: seg.name,
            fullName: seg.name,
            normal: seg.normal,
            dim: seg.dim,
            out: seg.out,
            unknown: seg.unknown,
          },
        ]
      }
    }

    // Khi chọn "Toàn bộ": Hiển thị các tuyến trong danh sách lọc
    return dynamicSegments.map((s) => ({
      name: s.name,
      fullName: s.name,
      normal: s.normal,
      dim: s.dim,
      out: s.out,
      unknown: s.unknown,
    }))
  }, [dynamicSegments, selectedSegment])

  // 5. Biểu đồ Donut cơ cấu trạng thái chiếu sáng
  const donutChartData = useMemo(() => {
    return [
      { name: 'Bình thường', value: fixtureKpis.totalNormal, color: '#10b981' },
      { name: 'Sáng yếu', value: fixtureKpis.totalDim, color: '#f59e0b' },
      { name: 'Mất sáng', value: fixtureKpis.totalOut, color: '#ef4444' },
      { name: 'Chưa quét', value: fixtureKpis.totalUnknown, color: '#cbd5e1' },
    ]
  }, [fixtureKpis])

  // 6. Lọc Danh sách Bảo hành (Khung trái)
  const filteredWarrantyItems = useMemo(() => {
    let items = warrantyKpis.items
    if (warrantyTab === 'expired') {
      items = items.filter((i) => i.days_remaining != null && i.days_remaining < 0)
    } else if (warrantyTab === 'expiring') {
      items = items.filter((i) => i.days_remaining != null && i.days_remaining >= 0 && i.days_remaining <= 30)
    }
    return items
  }, [warrantyKpis.items, warrantyTab])

  // 7. Lọc Danh sách Sự cố & Node IoT theo Tuyến đường
  const selectedSegmentFeeders = useMemo(() => {
    if (selectedSegment === 'all') return null
    return new Set(segmentFeederMap[selectedSegment] || [])
  }, [selectedSegment, segmentFeederMap])

  const filteredIotSummary = useMemo(() => {
    if (!selectedSegmentFeeders) return iotSummary
    return iotSummary.filter((n) => n.feeder_id && selectedSegmentFeeders.has(n.feeder_id))
  }, [iotSummary, selectedSegmentFeeders])

  const segmentFaults = useMemo(() => {
    if (selectedSegment === 'all') return faultsList
    return faultsList.filter(
      (f) =>
        f.segment_id === selectedSegment ||
        (Boolean(f.feeder_id) && Boolean(selectedSegmentFeeders?.has(f.feeder_id as string)))
    )
  }, [faultsList, selectedSegment, selectedSegmentFeeders])

  const isIotCategoryFault = (faultType?: string | null) => {
    const type = String(faultType || '').toLowerCase()
    return (
      type.includes('offline') ||
      type.includes('node') ||
      type === 'voltage_anomaly' ||
      type === 'current_anomaly' ||
      type === 'iot_hardware_fault'
    )
  }

  const offlineFaultsCount = useMemo(
    () => segmentFaults.filter((f) => isIotCategoryFault(f.fault_type)).length,
    [segmentFaults]
  )

  const blackoutFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return (
        !isIotCategoryFault(type) &&
        (type.includes('out') || type.includes('blackout') || type.includes('segment_outage'))
      )
    }).length
  }, [segmentFaults])

  const dimFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return (
        !isIotCategoryFault(type) &&
        (type.includes('dim') || type.includes('runtime_decline'))
      )
    }).length
  }, [segmentFaults])

  const unassignedFaults = useMemo(
    () =>
      segmentFaults.filter(
        (f) =>
          getFaultProgressInfo(f).key === 'unassigned' &&
          Boolean(f.pole_id || f.segment_id || f.origin_node_id || f.feeder_id)
      ),
    [segmentFaults]
  )

  const unlocatedPoleCount = useMemo(() => {
    if (selectedSegment === 'all') return unlocatedPoleSegments.length
    return unlocatedPoleSegments.filter((segId) => segId === selectedSegment).length
  }, [unlocatedPoleSegments, selectedSegment])

  const filteredFaults = useMemo(() => {
    let list = segmentFaults
    if (faultTab === 'blackout') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !isIotCategoryFault(type) &&
          (type.includes('out') || type.includes('blackout') || type.includes('segment_outage'))
        )
      })
    } else if (faultTab === 'dim') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !isIotCategoryFault(type) &&
          (type.includes('dim') || type.includes('runtime_decline'))
        )
      })
    } else if (faultTab === 'offline') {
      list = list.filter((f) => isIotCategoryFault(f.fault_type))
    }
    return list
  }, [segmentFaults, faultTab])

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col overflow-y-auto text-slate-800 custom-scrollbar select-none">
      {/* NỘI DUNG TRANG */}
      <div className="px-1 pb-2 space-y-4">
        {/* 1. Thanh công cụ Lọc Tuyến Đường */}
        <DashboardToolbar
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
          segments={segmentsList}
          loading={loading}
        />

        {/* 2. Dải 4 Thẻ KPI (Click để cuộn xuống bảng tương ứng) */}
        <DashboardKpiCards
          fixtureKpis={fixtureKpis}
          faultsCount={segmentFaults.length}
          warrantyKpis={{
            itemsCount: warrantyKpis.items.length,
            expiringCount: warrantyKpis.expiringCount,
            expiredCount: warrantyKpis.expiredCount,
          }}
          onClickNormal={handleScrollToCharts}
          onClickPendingFaults={() => handleScrollToFaults('all')}
          onClickSevereFaults={() => handleScrollToFaults('blackout')}
          onClickWarranty={handleScrollToWarranty}
        />

        {/* 3. Tình trạng chiếu sáng cạnh danh sách sự cố cần xử lý ngay */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4 items-stretch">
          <div ref={chartsRef} id="dashboard-charts" className="scroll-mt-4">
            <LightingStatusCard
              barChartData={barChartData}
              donutChartData={donutChartData}
              selectedSegment={selectedSegment}
              segmentNameMap={segmentNameMap}
              totalPoles={fixtureKpis.totalPoles}
            />
          </div>
          <UrgentFaultsCard
            faults={unassignedFaults}
            segmentNameMap={segmentNameMap}
            onCreateSchedule={handleNavigateToCreateSchedule}
            unlocatedPoleCount={unlocatedPoleCount}
            polesCapped={polesCapped}
            onFixUnlocatedPoles={() => navigate('/assets')}
          />
        </div>

        {/* 4. Bảng sự cố */}
        <div ref={faultsTableRef} id="faults-table-card" className="scroll-mt-4">
          <FaultsTableCard
            faults={filteredFaults}
            activeTab={faultTab}
            onTabChange={setFaultTab}
            segmentNameMap={segmentNameMap}
            onSelectFault={setSelectedFault}
            onNavigateToCreateSchedule={handleNavigateToCreateSchedule}
            totalCount={segmentFaults.length}
            blackoutCount={blackoutFaultsCount}
            dimCount={dimFaultsCount}
            offlineCount={offlineFaultsCount}
            includeCalibrationRig={includeCalibrationRig}
            onToggleCalibrationRig={(checked) => dispatch(setIncludeCalibrationRig(checked))}
          />
        </div>

        {/* 4.2. Báo cáo QR của người dân và kết quả CV ON/OFF trên ảnh */}
        <CitizenScreeningCard
          stats={citizenScreening}
          loading={citizenScreeningLoading}
          selectedSegment={selectedSegment}
          segmentNameMap={segmentNameMap}
        />

        {/* 4.5. Giám sát thiết bị IoT (1 Card gọn: Donut + Biểu đồ đường) */}
        <IotDiagnosticsCard
          summary={filteredIotSummary}
          servers={iotServers}
          feederHistory={selectedFeederHistory}
          historyLoading={selectedFeederHistoryLoading}
          onSelectFeeder={handleSelectFeeder}
          iotLastUpdated={iotLastUpdated}
          loading={loading}
        />

        {/* 5. Bảng theo dõi bảo hành */}
        <div ref={warrantyTableRef} id="warranty-table-card" className="scroll-mt-4">
          <WarrantyTableCard
            items={filteredWarrantyItems}
            activeTab={warrantyTab}
            onTabChange={setWarrantyTab}
            segmentNameMap={segmentNameMap}
            totalCount={warrantyKpis.items.length}
            expiredCount={warrantyKpis.expiredCount}
            expiringCount={warrantyKpis.expiringCount}
          />
        </div>
      </div>

      {/* Modal xem chi tiết sự cố */}
      <FaultDetailModal
        fault={selectedFault}
        onClose={() => setSelectedFault(null)}
        segmentNameMap={segmentNameMap}
      />
    </div>
  )
}
