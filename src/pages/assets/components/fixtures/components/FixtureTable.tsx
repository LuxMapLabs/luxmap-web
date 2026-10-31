import React from 'react'
import { Edit2, Archive, CheckCircle2, AlertCircle, Boxes, Lightbulb, PackageMinus, Eye } from 'lucide-react'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'
import type { PoleListItem } from '../../../../../types/assets/poles'
import { FixtureTableSkeleton } from './FixtureTableSkeleton'

interface FixtureTableProps {
  fixtures: ManagedFixture[]
  poles: PoleListItem[]
  flashingFixtureCode?: string
  isLoading?: boolean
  onViewDetail?: (fixture: ManagedFixture) => void
  onEditFixture: (fixture: ManagedFixture) => void
  onRetireFixture?: (fixture: ManagedFixture) => void
  onSelectPole?: (poleCode: string) => void
}

export const FixtureTable: React.FC<FixtureTableProps> = ({
  fixtures,
  poles,
  flashingFixtureCode,
  isLoading = false,
  onViewDetail,
  onEditFixture,
  onRetireFixture,
  onSelectPole,
}) => {
  // Pre-build pole map by external_ref for metadata lookup
  const poleMap = React.useMemo(() => {
    const map = new Map<string, PoleListItem>()
    poles.forEach((p) => {
      if (p.external_ref) map.set(p.external_ref.toLowerCase(), p)
    })
    return map
  }, [poles])

  // Scroll to active flashing fixture row smoothly
  React.useEffect(() => {
    if (flashingFixtureCode) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`fixture-row-${flashingFixtureCode.toLowerCase()}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [flashingFixtureCode])

  const getWattBadge = (watt: number) => {
    if (watt <= 60) {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    } else if (watt <= 100) {
      return 'bg-blue-50 text-blue-700 border-blue-200'
    } else if (watt <= 120) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    } else {
      return 'bg-purple-50 text-purple-700 border-purple-200'
    }
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none">
          <tr>
            <th className="py-3 px-3.5">Mã bộ đèn</th>
            <th className="py-3 px-3.5">Cột Lắp Đặt</th>
            <th className="py-3 px-3.5">Tuyến Đường</th>
            <th className="py-3 px-3.5 text-center">Số bóng / bộ</th>
            <th className="py-3 px-3.5 text-center">Công Suất</th>
            <th className="py-3 px-3.5">Loại đèn / Nguồn</th>
            <th className="py-3 px-3.5">Ngày Lắp Đặt</th>
            <th className="py-3 px-3.5">Hạn Bảo Hành</th>
            <th className="py-3 px-3.5">Ngày Tháo Dỡ</th>
            <th className="py-3 px-3.5 text-center">Trạng Thái</th>
            <th className="py-3 px-3.5 text-center w-24">Thao Tác</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-700">
          {isLoading ? (
            <FixtureTableSkeleton rowCount={8} />
          ) : fixtures.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-500">Không tìm thấy bộ đèn nào phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Thử thay đổi bộ lọc hoặc thêm bộ đèn mới</p>
              </td>
            </tr>
          ) : (
            fixtures.map((fixture, idx) => {
              const pole = fixture.pole_external_ref ? poleMap.get(fixture.pole_external_ref.toLowerCase()) : undefined
              const poleExternal = fixture.pole_external_ref || 'Chưa gán'
              const isRetired = Boolean(fixture.removed_date)
              const fixtureId = fixture.fixture_id || (fixture.pole_external_ref ? `FIX-${fixture.pole_external_ref}` : '')
              const isFlashing = Boolean(flashingFixtureCode && fixtureId && fixtureId.toLowerCase() === flashingFixtureCode.toLowerCase())

              return (
                <tr
                  key={fixtureId || fixture.pole_external_ref || idx}
                  id={fixtureId ? `fixture-row-${fixtureId.toLowerCase()}` : undefined}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isRetired ? 'bg-slate-50/50 opacity-75' : ''
                  } ${isFlashing ? 'animate-row-flash' : ''}`}
                >
                  {/* Mã bóng */}
                  <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900">
                    {fixtureId || <span className="text-slate-400 font-normal italic">Chưa đặt</span>}
                  </td>

                  {/* Cột điện gắn bóng */}
                  <td className="py-2.5 px-3.5">
                    {fixture.pole_external_ref ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPole && fixture.pole_external_ref) {
                            onSelectPole(fixture.pole_external_ref)
                          }
                        }}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 font-semibold shadow-2xs hover:border-blue-400 hover:bg-blue-100/80 active:scale-95 transition group"
                        title={`Cột điện: ${fixture.pole_external_ref} — Bấm để chuyển sang tab Cột điện`}
                      >
                        <Boxes className="w-3.5 h-3.5 text-blue-500 shrink-0 group-hover:scale-110 transition" />
                        <span className="font-bold font-mono text-xs">{fixture.pole_external_ref}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-normal italic text-xs">Chưa gán</span>
                    )}
                  </td>

                  {/* Tuyến đường (Lookup từ cột) */}
                  <td className="py-2.5 px-3.5">
                    <span className="text-slate-800 font-medium truncate block max-w-[160px]">
                      {pole?.segment_id ? (
                        <span>Tuyến {pole.segment_id}</span>
                      ) : (
                        <span className="text-slate-400 italic">Theo cột {poleExternal || ''}</span>
                      )}
                    </span>
                  </td>

                  {/* Số lượng bóng */}
                  <td className="py-2.5 px-3.5 text-center">
                    {(() => {
                      const count = fixture.lamp_count || 1
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                            count > 1
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                          title={`Bộ đèn gồm ${count} bóng`}
                        >
                          <Lightbulb className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          <span>{count} bóng</span>
                        </span>
                      )
                    })()}
                  </td>

                  {/* Công suất */}
                  <td className="py-2.5 px-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getWattBadge(
                        fixture.lamp_watt
                      )}`}
                    >
                      {fixture.lamp_watt} W
                    </span>
                    {(fixture.lamp_count || 1) > 1 && (
                      <div className="text-[10px] text-amber-700 font-bold mt-0.5" title="Tổng công suất trên cột">
                        Tổng: {fixture.lamp_watt * (fixture.lamp_count || 1)} W
                      </div>
                    )}
                  </td>

                  {/* Loại bóng & Nguồn */}
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium text-slate-800">
                      {fixture.fixture_type === 'led_road_lamp' ? 'Đèn LED đường phố' : fixture.fixture_type}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Nguồn: {fixture.power_source === 'grid' ? 'Điện lưới' : 'Năng lượng MT'}
                    </div>
                  </td>

                  {/* Ngày lắp đặt */}
                  <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                    {fixture.install_date || '—'}
                  </td>

                  {/* Hạn bảo hành */}
                  <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                    {fixture.warranty_expiry || '—'}
                  </td>

                  {/* Ngày tháo dỡ */}
                  <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                    {fixture.removed_date || '—'}
                  </td>

                  {/* Trạng thái (null = Đang hoạt động, có ngày = Đã tháo dỡ) */}
                  <td className="py-2.5 px-3.5 text-center">
                    {!isRetired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Hoạt động</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        <Archive className="w-3 h-3 text-slate-500" />
                        <span>Tháo dỡ ({fixture.removed_date})</span>
                      </span>
                    )}
                  </td>

                  {/* Thao tác */}
                  <td className="py-2.5 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onViewDetail && (
                        <button
                          type="button"
                          onClick={() => onViewDetail(fixture)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Xem chi tiết bộ đèn"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditFixture(fixture)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Chỉnh sửa thông số"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isRetired && onRetireFixture && (
                        <button
                          type="button"
                          onClick={() => onRetireFixture(fixture)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Tháo dỡ bộ đèn"
                        >
                          <PackageMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
