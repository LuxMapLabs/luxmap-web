import React from 'react'
import { ShieldCheck } from 'lucide-react'
import type { WarrantyItem } from '../../../types/statistics/warranty'

interface WarrantyTableCardProps {
  items: WarrantyItem[]
  activeTab: 'all' | 'expired' | 'expiring'
  onTabChange: (tab: 'all' | 'expired' | 'expiring') => void
  segmentNameMap: Record<string, string>
  expiredCount: number
  expiringCount: number
  totalCount: number
}

export const WarrantyTableCard: React.FC<WarrantyTableCardProps> = ({
  items,
  activeTab,
  onTabChange,
  segmentNameMap,
  expiredCount,
  expiringCount,
  totalCount,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bảo Hành Sắp & Quá Hạn</h3>
              <p className="text-[11px] text-slate-500">Chỉ hiển thị bóng hết hạn hoặc sắp hết trong vòng 1 tháng</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200/60">
            {items.length} bóng đèn
          </span>
        </div>

        {/* 3 Tab Lọc Bảo hành */}
        <div className="flex gap-1.5 border-b border-slate-100 pb-2.5 mb-3 text-xs">
          <button
            onClick={() => onTabChange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => onTabChange('expired')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'expired'
                ? 'bg-red-600 text-white'
                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Quá hạn ({expiredCount})
          </button>
          <button
            onClick={() => onTabChange('expiring')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'expiring'
                ? 'bg-amber-600 text-white'
                : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Sắp hết ≤ 30 ngày ({expiringCount})
          </button>
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
              {items.length > 0 ? (
                items.map((item, idx) => {
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
                    Không có bóng đèn nào trong diện cần xử lý bảo hành trên tuyến này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Tổng số bóng theo dõi: <strong className="text-slate-700">{items.length}</strong></span>
        <span>Thời hạn cảnh báo: <strong>≤ 30 ngày</strong></span>
      </div>
    </div>
  )
}
