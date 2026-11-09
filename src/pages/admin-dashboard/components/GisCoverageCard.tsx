import React from 'react'
import type { CommuneItem } from '../../../types/admin/communes'
import { GlassRing } from './GlassRing'

interface GisCoverageCardProps {
  communes: CommuneItem[]
}

export const GisCoverageCard: React.FC<GisCoverageCardProps> = ({ communes }) => {
  const total = communes.length

  const withBbox = communes.filter(
    (c) => Boolean(c.bbox && c.bbox.min_lat !== undefined && c.bbox.min_lat !== null)
  ).length
  const withCenter = communes.filter(
    (c) => Boolean(c.center && c.center.lat !== undefined && c.center.lat !== null)
  ).length

  const coverageRatio = total > 0 ? Math.round((withBbox / total) * 100) : 0
  const isComplete = total > 0 && coverageRatio === 100

  return (
    <section className="glass-tile glass-lift flex h-full items-center gap-5 p-5 select-none">
      {total > 0 ? (
        <>
          <GlassRing percent={coverageRatio} size={84} strokeWidth={9} tone={isComplete ? 'primary' : 'warning'}>
            <span className="admin-display text-[13px] font-semibold text-slate-900 dark:text-white">
              {coverageRatio}%
            </span>
          </GlassRing>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Độ phủ bản đồ</h2>
              {isComplete ? (
                <span className="glass-badge glass-badge-ok">Toàn vẹn</span>
              ) : (
                <span className="glass-badge glass-badge-warning">Chưa đồng bộ hết</span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {withBbox}/{total} địa bàn đã số hóa ranh giới. {withCenter}/{total} địa bàn có tọa độ tâm.
            </p>
          </div>
        </>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Độ phủ bản đồ</h2>
          <p className="mt-1 text-[13px] text-slate-400">Chưa có dữ liệu địa bàn.</p>
        </div>
      )}
    </section>
  )
}
