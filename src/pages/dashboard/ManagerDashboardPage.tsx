import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  fetchWarrantyStatistics,
  fetchFaultsList,
} from '../../feature/dashboard/dashboardAPI'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'

import { PRIMARY_SEGMENTS } from './constants'
import { DashboardToolbar } from './components/DashboardToolbar'
import { DashboardKpiCards } from './components/DashboardKpiCards'
import { DashboardCharts } from './components/DashboardCharts'
import { WarrantyTableCard } from './components/WarrantyTableCard'
import { FaultsTableCard } from './components/FaultsTableCard'
import { FaultDetailModal } from './components/FaultDetailModal'

export const ManagerDashboardPage: React.FC = () => {
  // State Filters
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [faultTab, setFaultTab] = useState<'all' | 'blackout' | 'dim'>('all')
  const [warrantyTab, setWarrantyTab] = useState<'all' | 'expired' | 'expiring'>('all')

  // Data State từ Backend API
  const [loading, setLoading] = useState<boolean>(true)
  const [warrantyList, setWarrantyList] = useState<WarrantyList>({
    today: new Date().toISOString().split('T')[0],
    expiring_within_days: 30,
    page: 1,
    page_size: 100,
    total: 0,
    items: [],
  })
  const [faultsList, setFaultsList] = useState<FaultItem[]>([])

  // Modal State
  const [selectedFault, setSelectedFault] = useState<FaultItem | null>(null)

  // Tải dữ liệu toàn diện từ Backend API
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [wStats, fList] = await Promise.all([
        // API Bảo hành: Chỉ lấy bóng hết hạn hoặc sắp hết trong vòng 1 tháng (<= 30 ngày)
        fetchWarrantyStatistics({
          within_days: 30,
          status: 'expired,expiring',
          page_size: 100,
        }),
        // API Sự cố: Tải danh sách sự cố trên các tuyến đường
        fetchFaultsList({
          sort: '-detected_at',
          page_size: 100,
        }),
      ])

      // Lọc các bóng đèn thuộc phạm vi 3 tuyến tác nghiệp chính và có ngày hạn rõ ràng
      const targetSegmentIds = ['SEG-001', 'SEG-002', 'SEG-003']
      const filteredWarrantyItems = (wStats.items || []).filter(
        (i) =>
          i.days_remaining != null &&
          i.days_remaining <= 30 &&
          (i.segment_id ? targetSegmentIds.includes(i.segment_id) : true)
      )

      setWarrantyList({
        ...wStats,
        total: filteredWarrantyItems.length,
        items: filteredWarrantyItems,
      })

      // Lọc sự cố trên 3 tuyến tác nghiệp
      const filteredFaultItems = (fList || []).filter((f) =>
        f.segment_id ? targetSegmentIds.includes(f.segment_id) : true
      )
      setFaultsList(filteredFaultItems)
    } catch (err) {
      console.error('[ManagerDashboard] Load data error:', err)
      toast.error('Không thể đồng bộ dữ liệu mới nhất từ máy chủ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Map tên tuyến đường
  const segmentNameMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    PRIMARY_SEGMENTS.forEach((s) => {
      map[s.id] = s.name
    })
    return map
  }, [])

  // --- TÍNH TOÁN DỮ LIỆU KPI & BIỂU ĐỒ (ĐỒNG BỘ 100% VỚI DATABASE) ---

  // 1. Phân bố trạng thái từng tuyến đường tính toán động trực tiếp từ cơ sở dữ liệu sự cố
  const dynamicSegments = useMemo(() => {
    return PRIMARY_SEGMENTS.map((seg) => {
      const segFaults = faultsList.filter((f) => f.segment_id === seg.id)
      const out = segFaults.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return type.includes('out') || type.includes('blackout') || type.includes('segment_outage')
      }).length

      const dim = segFaults.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return type.includes('dim') || type.includes('runtime_decline')
      }).length

      const normal = Math.max(0, seg.poleCount - out - dim)

      return {
        ...seg,
        normal,
        dim,
        out,
      }
    })
  }, [faultsList])

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

    // Khi chọn "Toàn bộ": Hiển thị 3 tuyến tác nghiệp chính
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

  const blackoutFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return type.includes('out') || type.includes('blackout') || type.includes('segment_outage')
    }).length
  }, [segmentFaults])

  const dimFaultsCount = useMemo(() => {
    return segmentFaults.filter((f) => {
      const type = String(f.fault_type).toLowerCase()
      return type.includes('dim') || type.includes('runtime_decline')
    }).length
  }, [segmentFaults])

  const filteredFaults = useMemo(() => {
    let list = segmentFaults
    if (faultTab === 'blackout') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return type.includes('out') || type.includes('blackout') || type.includes('segment_outage')
      })
    } else if (faultTab === 'dim') {
      list = list.filter((f) => {
        const type = String(f.fault_type).toLowerCase()
        return type.includes('dim') || type.includes('runtime_decline')
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
          segments={PRIMARY_SEGMENTS}
          loading={loading}
        />

        {/* 2. Dải 4 Thẻ KPI */}
        <DashboardKpiCards
          fixtureKpis={fixtureKpis}
          faultsCount={filteredFaults.length}
          warrantyKpis={{
            itemsCount: warrantyKpis.items.length,
            expiringCount: warrantyKpis.expiringCount,
            expiredCount: warrantyKpis.expiredCount,
          }}
        />

        {/* 3. Hàng 2 Biểu đồ (Charts) */}
        <DashboardCharts
          barChartData={barChartData}
          donutChartData={donutChartData}
          selectedSegment={selectedSegment}
          segmentNameMap={segmentNameMap}
          totalPoles={fixtureKpis.totalPoles}
        />

        {/* 4. Hàng 2 Bảng Dữ Liệu Chi Tiết */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bảng Trái: Theo dõi bảo hành */}
          <WarrantyTableCard
            items={filteredWarrantyItems}
            activeTab={warrantyTab}
            onTabChange={setWarrantyTab}
            segmentNameMap={segmentNameMap}
            totalCount={warrantyKpis.items.length}
            expiredCount={warrantyKpis.expiredCount}
            expiringCount={warrantyKpis.expiringCount}
          />

          {/* Bảng Phải: Giám sát sự cố bóng đèn */}
          <FaultsTableCard
            faults={filteredFaults}
            activeTab={faultTab}
            onTabChange={setFaultTab}
            segmentNameMap={segmentNameMap}
            onSelectFault={setSelectedFault}
            totalCount={segmentFaults.length}
            blackoutCount={blackoutFaultsCount}
            dimCount={dimFaultsCount}
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
