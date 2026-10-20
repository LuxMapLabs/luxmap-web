import React, { useState, useEffect, useMemo } from 'react'
import {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  X,
  Route,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  fetchWarrantyStatistics,
  fetchFaultsList,
} from '../../feature/dashboard/dashboardAPI'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'

// 3 Tuyến đường tác nghiệp chính (Đồng bộ 100% với Bản đồ GIS & Lịch làm việc)
interface OperationSegment {
  id: string
  name: string
  road: string
  poleCount: number
  normal: number
  dim: number
  out: number
}

const PRIMARY_SEGMENTS: OperationSegment[] = [
  {
    id: 'SEG-001',
    name: 'Tuyến A - Tỉnh Lộ 8',
    road: 'Tỉnh Lộ 8',
    poleCount: 46,
    normal: 36,
    dim: 5,
    out: 5,
  },
  {
    id: 'SEG-002',
    name: 'Tuyến B - Nguyễn Văn Ni',
    road: 'Nguyễn Văn Ni',
    poleCount: 31,
    normal: 23,
    dim: 5,
    out: 3,
  },
  {
    id: 'SEG-003',
    name: 'Tuyến C - Huỳnh Văn Cọ',
    road: 'Huỳnh Văn Cọ',
    poleCount: 26,
    normal: 16,
    dim: 1,
    out: 9,
  },
]

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

  // 0. Phân bố trạng thái từng tuyến đường tính toán động trực tiếp từ cơ sở dữ liệu sự cố
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

  // 1. KPI Tình trạng đèn
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

  // 2. KPI Bảo hành (Điều kiện: Đã hết hạn hoặc sắp hết trong vòng 1 tháng / <= 30 ngày)
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

  // 3. Biểu đồ Cột Stacked Bar Chart (Cập nhật tương tác mượt mà theo Tuyến đường)
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
      { name: 'Yếu sáng', value: fixtureKpis.totalDim, color: '#f59e0b' },
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
  const filteredFaults = useMemo(() => {
    let list = faultsList
    if (selectedSegment !== 'all') {
      list = list.filter((f) => f.segment_id === selectedSegment)
    }
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
  }, [faultsList, selectedSegment, faultTab])

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col overflow-y-auto pb-24 bg-slate-50 text-slate-800 custom-scrollbar select-none">
      
      {/* NỘI DUNG TRANG */}
      <div className="px-7 py-6 space-y-5">
        

        {/* 2. Thanh công cụ Lọc Tuyến Đường */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 px-4.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Lọc Tuyến đường (Đồng bộ 3 tuyến như GIS và Lịch làm việc) */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Route className="w-4 h-4 text-slate-500" />
              <label className="font-semibold text-slate-500 whitespace-nowrap">Tuyến đường:</label>
              <select
                value={selectedSegment}
                onChange={(e) => {
                  setSelectedSegment(e.target.value)
                  toast.info(`Đã chọn: ${e.target.selectedOptions[0]?.text}`)
                }}
                className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer max-w-sm truncate"
              >
                <option value="all">Tất cả các tuyến</option>
                {PRIMARY_SEGMENTS.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading Indicator nhỏ gọn */}
          {loading && (
            <div className="flex items-center gap-1.5 px-2 text-xs text-blue-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ dữ liệu...</span>
            </div>
          )}
        </div>

        {/* 3. Dải 4 Thẻ KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Tỷ lệ chiếu sáng bình thường */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tỷ lệ sáng bình thường</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5 my-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {fixtureKpis.normalPct}%
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                {fixtureKpis.totalNormal} / {fixtureKpis.totalPoles} cột
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span>Yếu sáng: <strong className="text-amber-600">{fixtureKpis.totalDim}</strong></span>
              <span>Mất sáng: <strong className="text-red-600">{fixtureKpis.totalOut}</strong></span>
              <span>Đạt chuẩn: <strong className="text-emerald-600">{fixtureKpis.normalPct}%</strong></span>
            </div>
          </div>

          {/* KPI 2: Sự cố đang tồn đọng */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Sự cố đang tồn đọng</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5 my-3">
              <span className="text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
                {filteredFaults.length}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                Cần khắc phục
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              {filteredFaults.length > 0
                ? `Ghi nhận ${filteredFaults.length} sự cố bóng đèn trên tuyến.`
                : 'Hiện không có sự cố nào chưa được khắc phục.'}
            </p>
          </div>

          {/* KPI 3: Mất sáng nghiêm trọng (Nguy cơ an toàn / Điểm mù) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Mất sáng nghiêm trọng</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5 my-3">
              <span className="text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
                {fixtureKpis.totalOut}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                {fixtureKpis.outPct}% số cột
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, Math.max(8, Number(fixtureKpis.outPct)))}%` }}
                  className="bg-rose-500 rounded-full"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Yếu sáng: <strong className="text-amber-600 font-bold">{fixtureKpis.totalDim} cột</strong></span>
                <span className="text-rose-600 font-bold">Khẩn cấp</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Cảnh báo bảo hành (<= 30 ngày) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Bảo hành cần xử lý (≤ 1 tháng)</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5 my-3">
              <span className="text-3xl font-extrabold text-amber-600 tracking-tight leading-none">
                {warrantyKpis.items.length}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                Bóng đèn
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Đã quá hạn: <strong className="text-red-600 font-bold">{warrantyKpis.expiredCount}</strong></span>
              <span>Sắp hết (≤30đ): <strong className="text-amber-600 font-bold">{warrantyKpis.expiringCount}</strong></span>
            </div>
          </div>

        </div>

        {/* 4. Hàng 2 Biểu đồ (Charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Biểu đồ 1: Stacked Bar Chart theo tuyến */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedSegment === 'all'
                    ? 'Phân Bố Chiếu Sáng Tuyến Đường Tác Nghiệp'
                    : `Chi Tiết Chiếu Sáng: ${segmentNameMap[selectedSegment] || selectedSegment}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSegment === 'all'
                    ? 'Hiện trạng hoạt động của các cột đèn trên 3 tuyến đường chính'
                    : `Thống kê tình trạng hoạt động trên ${segmentNameMap[selectedSegment] || selectedSegment}`}
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    labelFormatter={(label) => {
                      const item = barChartData.find((d) => d.name === label)
                      return item?.fullName || String(label)
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="normal" name="Bình thường" stackId="a" fill="#10b981" />
                  <Bar dataKey="dim" name="Yếu sáng" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="out" name="Mất sáng" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ 2: Donut Chart cơ cấu chiếu sáng */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Cơ Cấu Chiếu Sáng</h3>
              <p className="text-xs text-slate-500">Tổng hợp trên {fixtureKpis.totalPoles} cột đèn</p>
            </div>

            <div className="h-64 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Metric */}
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-800 leading-none">{fixtureKpis.totalPoles}</span>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Cột đèn</span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. Khu vực 2 Khung Dưới (Bảo Hành 1 Tháng & Sự Cố) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="actionSection">
          
          {/* KHUNG TRÁI: Danh Sách Bảo Hành Đã Hết Hạn hoặc Sắp Hết Hạn Trong 1 Tháng (<= 30 ngày) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bảo Hành Sắp Tới (≤ 1 Tháng) / Quá Hạn</h3>
                <p className="text-xs text-slate-500">Bóng đèn đã quá hạn hoặc còn hạn dưới 30 ngày cần lập kế hoạch bảo trì</p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setWarrantyTab('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    warrantyTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tất cả ({warrantyKpis.items.length})
                </button>
                <button
                  onClick={() => setWarrantyTab('expired')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    warrantyTab === 'expired' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Quá hạn ({warrantyKpis.expiredCount})
                </button>
                <button
                  onClick={() => setWarrantyTab('expiring')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    warrantyTab === 'expiring' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sắp hết ({warrantyKpis.expiringCount})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Mã Cột / Mã Bóng</th>
                    <th className="py-2.5 px-3">Tuyến Đường</th>
                    <th className="py-2.5 px-3">Hạn Bảo Hành</th>
                    <th className="py-2.5 px-3">Tình Trạng Hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWarrantyItems.length > 0 ? (
                    filteredWarrantyItems.map((item, idx) => {
                      const isOverdue = item.days_remaining != null && item.days_remaining < 0
                      const segmentName = segmentNameMap[item.segment_id || ''] || item.segment_id || 'Chưa rõ tuyến'
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.pole_id}
                            </span>
                            <div className="text-[11px] font-mono text-blue-600 mt-0.5">
                              {item.fixture_id || 'Chưa gán mã'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{segmentName}</div>
                            <div className="text-[10px] text-slate-400">{item.fixture_type || 'Đèn LED'} • {item.lamp_watt ? `${item.lamp_watt}W` : ''}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-700">
                              {item.warranty_expiry || 'N/A'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Lắp đặt: {item.install_date || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60 whitespace-nowrap">
                                Quá hạn {Math.abs(item.days_remaining!)} ngày
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 whitespace-nowrap">
                                Còn {item.days_remaining} ngày
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                        Không có bóng đèn nào quá hạn hoặc sắp hết hạn trong vòng 1 tháng
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* KHUNG PHẢI: Danh Sách Bóng Đèn Đang Bị Sự Cố (Không có cột thao tác) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Danh Sách Bóng Đèn Đang Bị Sự Cố</h3>
                <p className="text-xs text-slate-500">Chi tiết sự cố bóng đèn hỏng / yếu sáng ghi nhận trên hệ thống</p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFaultTab('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    faultTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tất cả ({faultsList.length})
                </button>
                <button
                  onClick={() => setFaultTab('blackout')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    faultTab === 'blackout' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Mất sáng ({faultsList.filter(f => {
                    const t = String(f.fault_type).toLowerCase()
                    return t.includes('out') || t.includes('blackout') || t.includes('segment_outage')
                  }).length})
                </button>
                <button
                  onClick={() => setFaultTab('dim')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    faultTab === 'dim' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Yếu sáng ({faultsList.filter(f => {
                    const t = String(f.fault_type).toLowerCase()
                    return t.includes('dim') || t.includes('runtime_decline')
                  }).length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Mã Cột / Tuyến</th>
                    <th className="py-2.5 px-3">Hiện Trạng Sự Cố</th>
                    <th className="py-2.5 px-3">Nguồn Phát Hiện</th>
                    <th className="py-2.5 px-3">Tiến Độ Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFaults.length > 0 ? (
                    filteredFaults.map((fault, idx) => {
                      const faultTypeStr = String(fault.fault_type).toLowerCase()
                      const isBlackout = faultTypeStr.includes('out') || faultTypeStr.includes('blackout') || faultTypeStr.includes('segment_outage')
                      
                      const sourceChannel = String(fault.source_channel).toLowerCase()
                      const sourceText = sourceChannel.includes('citizen') || sourceChannel.includes('qr')
                        ? '📱 Dân quét QR'
                        : sourceChannel.includes('iot')
                        ? '⚡ Cảm biến IoT'
                        : sourceChannel.includes('field')
                        ? '📋 Khảo sát hiện trường'
                        : '🤖 Xe quét AI'

                      const segmentName = segmentNameMap[fault.segment_id || ''] || fault.segment_id || 'Chưa rõ tuyến'

                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedFault(fault)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                              {fault.pole_id || 'Chưa gán cột'}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              {segmentName}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {isBlackout ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                                Mất sáng hoàn toàn
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                Yếu sáng / Suy giảm
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={fault.note || ''}>
                              {fault.note || 'Cần kiểm tra điện áp & bóng'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{sourceText}</div>
                            <div className="text-[10px] text-slate-400">
                              {fault.detected_at ? new Date(fault.detected_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {fault.work_order_id ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                Đã giao {fault.work_order_id}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                                Chưa phân lịch
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                        Không có sự cố nào ghi nhận trên tuyến đường được chọn
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL CHI TIẾT SỰ CỐ BÓNG ĐÈN */}
      {selectedFault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chi Tiết Sự Cố Bóng Đèn</h3>
                <p className="text-xs text-slate-500">Cột: <strong>{selectedFault.pole_id || 'Chưa gán cột'}</strong> • {segmentNameMap[selectedFault.segment_id || ''] || selectedFault.segment_id || 'Chưa rõ tuyến'}</p>
              </div>
              <button
                onClick={() => setSelectedFault(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Mã sự cố:</span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{selectedFault.fault_id}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Mức độ ưu tiên:</span>
                  <div className="font-bold text-slate-800 capitalize mt-0.5">{selectedFault.severity || 'Trung bình'}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 font-medium">Ghi chú sự cố:</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-sans">
                  {selectedFault.note || 'Không có ghi chú thêm.'}
                </p>
              </div>

              {selectedFault.location && selectedFault.location.lat != null && selectedFault.location.lng != null && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-medium">Tọa độ GPS:</span>
                  <div className="font-mono text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {selectedFault.location.lat.toFixed(6)}, {selectedFault.location.lng.toFixed(6)}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedFault(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
