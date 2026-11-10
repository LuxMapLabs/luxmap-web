import React from 'react'
import { OpsCard } from '../../../components/ops/OpsCard'
import { OpsTabs } from '../../../components/ops/OpsTabs'
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
    <OpsCard
      index={4}
      title="Bảo hành sắp hết và quá hạn"
      description="Chỉ hiển thị bóng hết hạn hoặc sắp hết trong vòng 1 tháng"
      flush
    >
      <div className="px-6 pb-4 pt-4">
        <OpsTabs
          value={activeTab}
          onChange={onTabChange}
          items={[
            { key: 'all', label: 'Tất cả', count: totalCount },
            { key: 'expired', label: 'Quá hạn', count: expiredCount },
            { key: 'expiring', label: 'Sắp hết ≤ 30 ngày', count: expiringCount },
          ]}
        />
      </div>

      <div className="max-h-[360px] overflow-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
              <th className="py-2.5 px-6">Mã cột / mã bóng</th>
              <th className="py-2.5 px-3">Tuyến đường</th>
              <th className="py-2.5 px-3">Hạn bảo hành</th>
              <th className="py-2.5 px-6">Tình trạng hạn</th>
            </tr>
          </thead>
          <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const isOverdue = item.days_remaining != null && item.days_remaining < 0
                  const segmentName = segmentNameMap[item.segment_id || ''] || item.segment_id || 'Chưa rõ tuyến'
                  
                  return (
                    <tr
                      key={idx}
                      className="group border-b border-[#eef2f6] transition-colors duration-150 shadow-[inset_3px_0_0_transparent] hover:bg-teal-50/40 hover:shadow-[inset_3px_0_0_#be457a]"
                    >
                      <td className="py-3 px-6">
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[#f1f5f9] text-slate-700 transition-colors group-hover:bg-teal-100 group-hover:text-teal-800">
                          {item.pole_id}
                        </span>
                        <div className="text-[11px] font-mono text-teal-700 mt-0.5">
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
                      <td className="py-3 px-6">
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

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
        <span>Tổng số bóng theo dõi: <strong className="text-slate-800 tabular-nums">{items.length}</strong></span>
        <span>Thời hạn cảnh báo: <strong className="text-slate-800">≤ 30 ngày</strong></span>
      </div>
    </OpsCard>
  )
}
