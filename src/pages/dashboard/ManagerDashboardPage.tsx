import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardDataRequest } from '../../feature/dashboard/dashboardSlice'
import type { FaultItem } from '../../types/faults/faults'

import { DashboardToolbar } from './components/DashboardToolbar'
import { DashboardKpiCards } from './components/DashboardKpiCards'
import { DashboardCharts } from './components/DashboardCharts'
import { WarrantyTableCard } from './components/WarrantyTableCard'
import { FaultsTableCard } from './components/FaultsTableCard'
import { FaultDetailModal } from './components/FaultDetailModal'

export const ManagerDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  // Refs cuộn mượt đến các bảng/biểu đồ tương ứng khi click thẻ KPI
  const chartsRef = useRef<HTMLDivElement>(null)
  const faultsTableRef = useRef<HTMLDivElement>(null)
  const warrantyTableRef = useRef<HTMLDivElement>(null)

  // Redux Global State (được quản lý và nạp bởi Redux-Saga)
  const { segmentsList, warrantyList, faultsList, loading } = useSelector(
    (state: RootState) => state.dashboard
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

  // Handler khi click hàng sự cố "Chưa phân lịch" -> Trỏ sang tab Lịch làm việc & Mở popup Tạo sự vụ
  const handleNavigateToCreateSchedule = (fault: FaultItem) => {
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

  // 1. Phân bố trạng thái từng tuyến đường tính toán động trực tiếp từ cơ sở dữ liệu sự cố
  const dynamicSegments = useMemo(() => {
    return segmentsList.map((seg) => {
      const segId = seg.segment_id || ''
      const poleCount = seg.pole_count || 0
      const segFaults = faultsList.filter((f) => f.segment_id === segId)
      const out = segFaults.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !type.includes('offline') &&
          !type.includes('node') &&
          (type.includes('out') || type.includes('blackout') || type.includes('segment_outage'))
        )
      }).length

      const dim = segFaults.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !type.includes('offline') &&
          !type.includes('node') &&
          (type.includes('dim') || type.includes('runtime_decline'))
        )
      }).length

      const normal = Math.max(0, poleCount - out - dim)

      return {
        id: segId,
        name: seg.segment_name || segId,
        poleCount,
        normal,
        dim,
        out,
      }
    })
  }, [segmentsList, faultsList])

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

    const normalPct = totalPoles > 0 ? ((totalNormal / totalPoles) * 100).toFixed(1) : '0.0'
    const dimPct = totalPoles > 0 ? ((totalDim / totalPoles) * 100).toFixed(1) : '0.0'
    const outPct = totalPoles > 0 ? ((totalOut / totalPoles) * 100).toFixed(1) : '0.0'

    return {
      totalPoles,
      totalNormal,
      totalDim,
      totalOut,
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
    }))
  }, [dynamicSegments, selectedSegment])

  // 5. Biểu đồ Donut cơ cấu trạng thái chiếu sáng
  const donutChartData = useMemo(() => {
    return [
      { name: 'Bình thường', value: fixtureKpis.totalNormal, color: '#10b981' },
      { name: 'Sáng yếu', value: fixtureKpis.totalDim, color: '#f59e0b' },
      { name: 'Mất sáng', value: fixtureKpis.totalOut, color: '#ef4444' },
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

  // 7. Lọc Danh sách Sự cố bóng đèn (Khung phải)
  const segmentFaults = useMemo(() => {
    if (selectedSegment === 'all') return faultsList
    return faultsList.filter((f) => f.segment_id === selectedSegment)
  }, [faultsList, selectedSegment])

  const offlineFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return type.includes('offline') || type.includes('node')
    }).length
  }, [segmentFaults])

  const blackoutFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return (
        !type.includes('offline') &&
        !type.includes('node') &&
        (type.includes('out') || type.includes('blackout') || type.includes('segment_outage'))
      )
    }).length
  }, [segmentFaults])

  const dimFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return (
        !type.includes('offline') &&
        !type.includes('node') &&
        (type.includes('dim') || type.includes('runtime_decline'))
      )
    }).length
  }, [segmentFaults])

  const filteredFaults = useMemo(() => {
    let list = segmentFaults
    if (faultTab === 'blackout') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !type.includes('offline') &&
          !type.includes('node') &&
          (type.includes('out') || type.includes('blackout') || type.includes('segment_outage'))
        )
      })
    } else if (faultTab === 'dim') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return (
          !type.includes('offline') &&
          !type.includes('node') &&
          (type.includes('dim') || type.includes('runtime_decline'))
        )
      })
    } else if (faultTab === 'offline') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return type.includes('offline') || type.includes('node')
      })
    }
    return list
  }, [segmentFaults, faultTab])

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col overflow-y-auto pb-24 bg-slate-50 text-slate-800 custom-scrollbar select-none">
      {/* NỘI DUNG TRANG */}
      <div className="px-7 py-6 space-y-5">
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
          faultsCount={filteredFaults.length}
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

        {/* 3. Hàng 2 Biểu đồ (Charts) */}
        <div ref={chartsRef} id="dashboard-charts" className="scroll-mt-4">
          <DashboardCharts
            barChartData={barChartData}
            donutChartData={donutChartData}
            selectedSegment={selectedSegment}
            segmentNameMap={segmentNameMap}
            totalPoles={fixtureKpis.totalPoles}
          />
        </div>

        {/* 4. Hàng 2 Bảng Dữ Liệu Chi Tiết */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bảng Trái: Theo dõi bảo hành */}
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

          {/* Bảng Phải: Giám sát sự cố bóng đèn */}
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
            />
          </div>
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
