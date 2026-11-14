import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'
import { fetchDashboardDataRequest } from '../../feature/dashboard/dashboardSlice'
import {
  fetchSuperiorDashboardRequest,
  exportSuperiorCsvRequest,
} from '../../feature/dashboard/superiorDashboardSlice'

import { SuperiorToolbar, type SuperiorCsvExportType } from './components/SuperiorToolbar'
import { SuperiorKpiGrid, type SuperiorKpiData } from './components/SuperiorKpiGrid'
import { SuperiorMainCharts, type FixtureBarItem, type SlaBreakdownData } from './components/SuperiorMainCharts'
import {
  SuperiorSubCharts,
  type FaultChannelData,
  type WarrantyChartData,
  type WorkOrderChartData,
  type DetailTab,
} from './components/SuperiorSubCharts'

export const SuperiorDashboardPage: React.FC = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const reduxDashboard = useSelector((state: RootState) => state.dashboard)

  // Thông tin địa bàn Xã của Superior
  const primaryCommune = user?.communes?.[0]
  const communeId = user?.commune_ids?.[0] || primaryCommune?.commune_id || ''
  const communeName = primaryCommune?.name || ''
  const communeCode = primaryCommune?.commune_id || ''

  // State bộ lọc
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('all')
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<7 | 30 | 90>(30)
  const [detailTab, setDetailTab] = useState<DetailTab>('faults')

  // Dữ liệu từ APIs Backend: tải qua Saga, lưu ở store superiorDashboard
  const {
    segments,
    fixtureStats,
    slaStats,
    warrantyData,
    faults,
    citizenFeedbackStats,
    workOrderStats,
    loading,
    refreshing,
  } = useSelector((state: RootState) => state.superiorDashboard)

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Toggle Presentation / Fullscreen Mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
      }
    }
  }

  // Lắng nghe phím Esc để đồng bộ lại state isFullscreen
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Tải dữ liệu Redux Saga (đồng bộ chung với Manager Dashboard)
  useEffect(() => {
    dispatch(fetchDashboardDataRequest())
  }, [dispatch])

  // Yêu cầu Saga tải toàn bộ số liệu theo xã / tuyến / chu kỳ đang chọn
  const loadDashboardData = useCallback(
    (isSilent = false) => {
      dispatch(
        fetchSuperiorDashboardRequest({
          communeId,
          segmentId: selectedSegmentId !== 'all' ? selectedSegmentId : null,
          periodDays: selectedPeriodDays,
          silent: isSilent,
        })
      )
    },
    [dispatch, communeId, selectedPeriodDays, selectedSegmentId]
  )

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Tải lần lượt các báo cáo CSV đã chọn (Saga xử lý từng file và báo tiến độ)
  const handleExportCsv = (types: SuperiorCsvExportType[]) => {
    dispatch(
      exportSuperiorCsvRequest({
        types,
        communeId,
        communeCode,
        segmentId: selectedSegmentId !== 'all' ? selectedSegmentId : null,
        periodDays: selectedPeriodDays,
      })
    )
  }

  // Nguồn dữ liệu hợp nhất giữa local fetch và Redux store (đảm bảo khớp 100% với Manager Dashboard)
  const effectiveSegments = useMemo(() => {
    if (segments.length > 0) return segments
    if (reduxDashboard?.segmentsList?.length > 0) return reduxDashboard.segmentsList
    return []
  }, [segments, reduxDashboard?.segmentsList])

  const segmentNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    effectiveSegments.forEach((s) => {
      if (s.segment_id) {
        map[s.segment_id] = s.segment_name || s.segment_id
      }
    })
    return map
  }, [effectiveSegments])

  const effectiveFaults = useMemo(() => {
    if (faults.length > 0) return faults
    if (reduxDashboard?.faultsList?.length > 0) return reduxDashboard.faultsList
    return []
  }, [faults, reduxDashboard?.faultsList])

  const effectiveWarrantyItems = useMemo(() => {
    if (warrantyData?.items && warrantyData.items.length > 0) return warrantyData.items
    if (reduxDashboard?.warrantyList?.items && reduxDashboard.warrantyList.items.length > 0) {
      return reduxDashboard.warrantyList.items
    }
    return []
  }, [warrantyData, reduxDashboard?.warrantyList?.items])

  // Lọc danh sách tuyến theo bộ lọc dropdown Tuyến đường
  const displaySegments = useMemo(() => {
    if (selectedSegmentId === 'all') return effectiveSegments
    return effectiveSegments.filter((s) => s.segment_id === selectedSegmentId)
  }, [effectiveSegments, selectedSegmentId])

  // Lọc danh sách sự cố theo bộ lọc dropdown Tuyến đường
  const filteredFaults = useMemo(() => {
    if (selectedSegmentId === 'all') return effectiveFaults
    return effectiveFaults.filter((f) => f.segment_id === selectedSegmentId)
  }, [effectiveFaults, selectedSegmentId])

  const totalPolesCount = useMemo(() => {
    return effectiveSegments.reduce((sum, s) => sum + (s.pole_count || 0), 0)
  }, [effectiveSegments])

  // --- HIỆN TRẠNG BÓNG THEO TỪNG TUYẾN: lấy thẳng từ statistics/fixture-status (group_by=segment) ---
  // Cột chưa được quét phủ tính là "chưa rõ", không tự coi là đạt chuẩn.
  const segmentChartData: FixtureBarItem[] = useMemo(() => {
    if (!displaySegments.length) return []
    const rows = fixtureStats?.rows ?? []

    return displaySegments.map((seg) => {
      const segId = seg.segment_id || ''
      const segRows = rows.filter((r) => r.segment_id === segId)
      const name = seg.segment_name || segId
      const shortLabel = name.length > 24 ? name.substring(0, 22) + '...' : name

      return {
        id: segId,
        name,
        shortLabel,
        normal: segRows.reduce((acc, r) => acc + r.normal, 0),
        dim: segRows.reduce((acc, r) => acc + r.dim, 0),
        out: segRows.reduce((acc, r) => acc + r.out, 0),
        unknown: segRows.reduce((acc, r) => acc + r.unknown, 0),
      }
    })
  }, [displaySegments, fixtureStats])

  // --- TÍNH TOÁN DỮ LIỆU BỘ CHỈ SỐ KPI VĨ MÔ DỰA TRÊN DỮ LIỆU THỰC TẾ ---
  const kpiData: SuperiorKpiData = useMemo(() => {
    // 1. Tình trạng chiếu sáng
    // Tổng toàn xã (kể cả cột chưa gán tuyến) lấy từ API; normal + dim + out + unknown = pole_count
    const statRows = fixtureStats?.rows ?? []
    const normal = statRows.reduce((acc, r) => acc + r.normal, 0)
    const dim = statRows.reduce((acc, r) => acc + r.dim, 0)
    const out = statRows.reduce((acc, r) => acc + r.out, 0)
    const unknown = statRows.reduce((acc, r) => acc + r.unknown, 0)
    const total = statRows.reduce((acc, r) => acc + r.pole_count, 0)
    const normalPct = total > 0 ? (normal / total) * 100 : 0

    // 2. Dữ liệu từ SLA repair timeliness
    const slaRow = slaStats?.rows?.[0]
    const slaCompleted = slaRow?.completed ?? 0
    const slaRate = slaCompleted > 0 && slaRow?.on_time_rate != null ? slaRow.on_time_rate * 100 : 0
    const slaOnTime = slaRow?.on_time ?? 0
    const slaLate = slaRow?.late ?? 0
    const slaOverdue = slaRow?.open_overdue ?? 0

    // 3. Dữ liệu từ danh sách sự cố
    const openFaults = filteredFaults.filter(
      (f) => f.fault_status !== 'verified' && f.fault_status !== 'rejected'
    )
    const criticalFaults = openFaults.filter((f) => String(f.severity).toLowerCase() === 'critical')

    const inRepairFaults = openFaults.filter(
      (f) => f.fault_status === 'in_progress' || f.fault_status === 'resolved'
    )

    const waitingRepairFaults = openFaults.filter(
      (f) => f.fault_status === 'confirmed' || (f.fault_status === 'detected' && Boolean(f.work_order_id))
    )

    const unassignedFaults = openFaults.filter(
      (f) => f.fault_status === 'detected' && !f.work_order_id
    )

    // 4. Dữ liệu từ Warranty
    const filteredWItems =
      selectedSegmentId === 'all'
        ? effectiveWarrantyItems
        : effectiveWarrantyItems.filter((w) => w.segment_id === selectedSegmentId)

    const expiredItems = filteredWItems.filter(
      (w) => w.warranty_status === 'expired' || (w.days_remaining != null && w.days_remaining < 0)
    )
    const expiringItems = filteredWItems.filter(
      (w) => w.warranty_status === 'expiring' || (w.days_remaining != null && w.days_remaining >= 0 && w.days_remaining <= 90)
    )
    const activeItems = filteredWItems.filter(
      (w) => w.warranty_status === 'active' || (w.days_remaining != null && w.days_remaining > 90)
    )
    const alertCount = expiredItems.length + expiringItems.length

    return {
      normalPct,
      normalCount: normal,
      totalPoles: total,
      dimCount: dim,
      outCount: out,
      unknownCount: unknown,

      slaRate,
      slaOnTimeCount: slaOnTime,
      slaTotalFinished: slaCompleted,
      slaLateCount: slaLate,
      slaOverdueCount: slaOverdue,

      openFaultsCount: openFaults.length,
      criticalFaultsCount: criticalFaults.length,
      inRepairFaultsCount: inRepairFaults.length,
      waitingRepairFaultsCount: waitingRepairFaults.length,
      detectedFaultsCount: unassignedFaults.length,

      warrantyAlertCount: alertCount,
      warrantyExpiredCount: expiredItems.length,
      warrantyExpiringCount: expiringItems.length,
      warrantyActiveCount: activeItems.length,
    }
  }, [fixtureStats, selectedSegmentId, slaStats, filteredFaults, effectiveWarrantyItems])

  // Hiện trạng bóng theo nguồn dữ liệu: lấy thẳng từ statistics/fixture-status
  const dataSourceChartData: FixtureBarItem[] = useMemo(() => {
    const labels: Record<string, string> = {
      field: 'Hiện trường',
      public_imagery: 'Ảnh công khai',
      simulated: 'Giả lập',
      calibration_rig: 'Thiết bị hiệu chuẩn',
    }
    const bySource = new Map<string, FixtureBarItem>()
    for (const row of fixtureStats?.rows ?? []) {
      const id = String(row.data_source)
      const name = labels[id] ?? id
      const item = bySource.get(id) ?? { id, name, shortLabel: name, normal: 0, dim: 0, out: 0, unknown: 0 }
      item.normal += row.normal
      item.dim += row.dim
      item.out += row.out
      item.unknown += row.unknown
      bySource.set(id, item)
    }
    return [...bySource.values()]
  }, [fixtureStats])

  const slaBreakdown: SlaBreakdownData = useMemo(() => {
    const r = slaStats?.rows?.[0]
    const completed = r?.completed ?? 0
    return {
      onTimeRate: completed > 0 && r?.on_time_rate != null ? r.on_time_rate * 100 : 0,
      completed,
      onTime: r?.on_time ?? 0,
      late: r?.late ?? 0,
      noDueDate: r?.no_due_date ?? 0,
      openOverdue: r?.open_overdue ?? 0,
    }
  }, [slaStats])

  // --- TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ PHÂN TÍCH CHUYÊN SÂU (HÀNG 4) ---
  const subFaultData: FaultChannelData = useMemo(() => {
    const aiCount = filteredFaults.filter((f) => String(f.source_channel).includes('field_survey') || String(f.source_channel).includes('ai')).length
    const iotCount = filteredFaults.filter((f) => String(f.source_channel).includes('iot') || String(f.source_channel).includes('telemetry')).length
    const qrCount = filteredFaults.filter((f) => String(f.source_channel).includes('citizen')).length
    const manualCount = filteredFaults.filter((f) => String(f.source_channel).includes('field_report') || String(f.source_channel).includes('manual')).length
    const total = (aiCount + iotCount + qrCount + manualCount) || 1 // tránh chia cho 0, các tỷ lệ vẫn ra 0%

    return {
      channelData: [
        { name: 'Camera AI Quét', value: aiCount, color: '#8FB8DA' },
        { name: 'Node IoT / Tủ', value: iotCount, color: '#A6B4F0' },
        { name: 'Dân quét mã QR', value: qrCount, color: '#7CCBA2' },
        { name: 'Kỹ sư hiện trường', value: manualCount, color: '#F2C46B' },
      ],
      typeData: [
        { name: 'Mất sáng hoàn toàn', value: filteredFaults.filter((f) => String(f.fault_type).includes('out')).length, color: '#EE8B8B' },
        { name: 'Sáng yếu / Suy giảm', value: filteredFaults.filter((f) => String(f.fault_type).includes('dim')).length, color: '#F2C46B' },
        { name: 'Mất điện / Mất pha', value: filteredFaults.filter((f) => String(f.fault_type).includes('outage')).length, color: '#E27474' },
        { name: 'Mất tín hiệu kết nối', value: filteredFaults.filter((f) => String(f.fault_type).includes('offline')).length, color: '#64748b' },
      ],
      aiPct: Math.round((aiCount / total) * 100),
      iotPct: Math.round((iotCount / total) * 100),
      citizenPct: Math.round((qrCount / total) * 100),
    }
  }, [filteredFaults])

  const subWarrantyData: WarrantyChartData = useMemo(() => {
    const filteredWItems =
      selectedSegmentId === 'all'
        ? effectiveWarrantyItems
        : effectiveWarrantyItems.filter((w) => w.segment_id === selectedSegmentId)

    const expired = filteredWItems.filter(
      (w) => w.warranty_status === 'expired' || (w.days_remaining != null && w.days_remaining < 0)
    ).length
    const expiring = filteredWItems.filter(
      (w) => w.warranty_status === 'expiring' || (w.days_remaining != null && w.days_remaining >= 0 && w.days_remaining <= 90)
    ).length
    const active = filteredWItems.filter(
      (w) => w.warranty_status === 'active' || (w.days_remaining != null && w.days_remaining > 90)
    ).length
    const unknown = Math.max(0, kpiData.totalPoles - active - expiring - expired)

    const fixtureTypeCounts = new Map<string, number>()
    for (const w of filteredWItems) {
      const key = String(w.fixture_type || '-')
      fixtureTypeCounts.set(key, (fixtureTypeCounts.get(key) ?? 0) + 1)
    }
    const typeColors = ['#8FB8DA', '#A6B4F0', '#7CCBA2', '#F2C46B', '#cbd5e1']

    return {
      statusData: [
        { name: 'Còn hạn (>90 ngày)', value: active, color: '#7CCBA2' },
        { name: 'Sắp hết (≤90 ngày)', value: expiring, color: '#F2C46B' },
        { name: 'Đã hết bảo hành', value: expired, color: '#EE8B8B' },
        { name: 'Chưa rõ / Chưa lắp', value: unknown, color: '#cbd5e1' },
      ],
      fixtureTypeData: [...fixtureTypeCounts.entries()].map(([name, value], i) => ({
        name,
        value,
        color: typeColors[i % typeColors.length],
      })),
      activeCount: active,
      expiringCount: expiring,
      expiredCount: expired,
    }
  }, [selectedSegmentId, kpiData.totalPoles, effectiveWarrantyItems])

  // --- KẾT NỐI DỮ LIỆU THỰC TẾ TỪ statistics/work-orders & statistics/citizen-feedback ---
  const subWorkOrderData: WorkOrderChartData = useMemo(() => {
    // 1. Dữ liệu lệnh công tác theo phân loại thực tế từ Backend (workOrderStats)
    const woRows = workOrderStats?.rows || []
    const repairRow = woRows.find((r) => String(r.task_kind).toLowerCase() === 'repair')
    const inspectionRow = woRows.find((r) => String(r.task_kind).toLowerCase() === 'inspection')
    const surveyRow = woRows.find((r) => String(r.task_kind).toLowerCase() === 'survey')

    const woByKindData = [
      {
        kind: 'Sửa chữa',
        completed: (repairRow?.done || 0) + (repairRow?.verified || 0),
        inProgress: (repairRow?.in_progress || 0) + (repairRow?.assigned || 0),
        pending: (repairRow?.open || 0),
      },
      {
        kind: 'Kiểm tra',
        completed: (inspectionRow?.done || 0) + (inspectionRow?.verified || 0),
        inProgress: (inspectionRow?.in_progress || 0) + (inspectionRow?.assigned || 0),
        pending: (inspectionRow?.open || 0),
      },
      {
        kind: 'Khảo sát',
        completed: (surveyRow?.done || 0) + (surveyRow?.verified || 0),
        inProgress: (surveyRow?.in_progress || 0) + (surveyRow?.assigned || 0),
        pending: (surveyRow?.open || 0),
      },
    ]

    const totalAccepted = woByKindData.reduce((sum, item) => sum + item.completed, 0)
    const totalExecuting = woByKindData.reduce((sum, item) => sum + item.inProgress, 0)

    // 2. Dữ liệu phản ánh người dân từ Backend (citizenFeedbackStats)
    const feedbackRows = citizenFeedbackStats?.rows || []
    let citizenBySegmentData = feedbackRows.map((r) => {
      const segName = r.segment_id ? (segmentNameMap[r.segment_id] || r.segment_id) : 'Toàn địa bàn'
      return {
        id: r.segment_id || '',
        segment: segName.length > 15 ? segName.substring(0, 14) + '...' : segName,
        confirmed: r.accepted || 0,
        merged: r.merged || 0,
        rejected: r.rejected || 0,
      }
    })

    if (selectedSegmentId !== 'all') {
      citizenBySegmentData = citizenBySegmentData.filter((c) => c.id === selectedSegmentId)
    }

    // Tỷ lệ giải quyết phản ánh người dân thực tế
    let citizenResolutionRate: number | null = null
    if (feedbackRows.length > 0) {
      const totalFeedback = feedbackRows.reduce((sum, r) => sum + (r.total || 0), 0)
      const resolvedFeedback = feedbackRows.reduce((sum, r) => sum + (r.accepted + r.merged + r.rejected || 0), 0)
      if (totalFeedback > 0) {
        citizenResolutionRate = Number(((resolvedFeedback / totalFeedback) * 100).toFixed(1))
      }
    }

    return {
      woByKindData,
      citizenBySegmentData,
      totalAccepted,
      totalExecuting,
      citizenResolutionRate,
    }
  }, [
    workOrderStats,
    citizenFeedbackStats,
    selectedSegmentId,
    segmentNameMap,
  ])

  // --- CÁC HÀM XỬ LÝ ONCLICK TỪ KPI CARD CUỘN TỚI BIỂU ĐỒ TƯƠNG ỨNG ---
  const handleScrollToLighting = () => {
    document.getElementById('superior-lighting-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleScrollToSla = () => {
    document.getElementById('superior-sla-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToDetail = (tab: DetailTab) => {
    setDetailTab(tab)
    document.getElementById('superior-detail-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleScrollToFaults = () => scrollToDetail('faults')

  const handleScrollToWarranty = () => scrollToDetail('warranty')

  return (
    <div
      className="w-full h-full min-h-0 flex-1 flex flex-col overflow-y-auto text-slate-800 custom-scrollbar select-none"
    >
      <div className="pt-3 pb-6 pr-1 space-y-4 flex flex-col">
        {/* TẦNG 1: EXECUTIVE FILTER & EXPORT TOOLBAR */}
        <SuperiorToolbar
          communeName={communeName}
          communeCode={communeCode}
          totalPolesCount={totalPolesCount}
          segments={effectiveSegments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          selectedPeriodDays={selectedPeriodDays}
          onChangePeriod={setSelectedPeriodDays}
          onExportCsv={handleExportCsv}
          onRefresh={() => loadDashboardData(true)}
          isRefreshing={refreshing}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* TẦNG 2: 4 THẺ CHỈ SỐ VĨ MÔ CỦA XÃ (KPI CARDS - HỖ TRỢ ONCLICK CUỘN TỚI CHART) */}
        <SuperiorKpiGrid
          data={kpiData}
          loading={loading}
          isSegmentFiltered={selectedSegmentId !== 'all'}
          onClickLighting={handleScrollToLighting}
          onClickSla={handleScrollToSla}
          onClickFaults={handleScrollToFaults}
          onClickWarranty={handleScrollToWarranty}
        />

        {/* TẦNG 3: HÀNG BIỂU ĐỒ CHÍNH (7 CỘT : 5 CỘT) */}
        <SuperiorMainCharts
          segmentChartData={segmentChartData}
          dataSourceChartData={dataSourceChartData}
          slaData={slaBreakdown}
          communeName={communeName}
        />

        {/* TẦNG 4: HÀNG 3 BIỂU ĐỒ PHÂN TÍCH CHUYÊN SÂU */}
        <SuperiorSubCharts
          faultData={subFaultData}
          warrantyData={subWarrantyData}
          workOrderData={subWorkOrderData}
          activeTab={detailTab}
          onChangeTab={setDetailTab}
        />
      </div>
    </div>
  )
}
