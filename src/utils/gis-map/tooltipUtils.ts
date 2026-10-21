import type { PoleFeature, SegmentInfo } from '../../pages/gis-map/GisMapPage'

interface PoleTooltipParams {
  pole: PoleFeature
}

export function getPoleTooltipHtml({ pole }: PoleTooltipParams): string {
  const p = pole.properties || {}
  const status = p.fixture_status || 'unknown'
  const statusText =
    status === 'normal'
      ? 'Đạt chuẩn'
      : status === 'dim'
      ? 'Đèn mờ (Sụt áp)'
      : status === 'out'
      ? 'Hỏng / Tắt'
      : 'Chưa quét'
  const statusCol =
    status === 'normal'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : status === 'dim'
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : status === 'out'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : 'text-slate-700 bg-slate-50 border-slate-200'

  // Ưu tiên hiển thị external_ref theo đúng chỉ đạo người dùng
  const displayPoleCode = p.external_ref || p.pole_code || p.pole_id
  const displayCabinet = p.cabinet_external_ref || p.cabinet_name || (p.cabinet_id ? `Tủ ${p.cabinet_id}` : 'Chưa gán')
  const displayFeeder = p.feeder_external_ref || p.feeder_name || (p.feeder_id ? `Lộ ${p.feeder_id}` : 'Chưa gán')

  return `
    <div class="bg-white/98 dark:bg-slate-900/98 text-slate-800 dark:text-slate-100 p-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-md min-w-52 font-sans text-xs">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-mono font-bold gap-2">
        <span class="text-slate-900 dark:text-white font-bold">${displayPoleCode}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded border font-sans font-semibold ${statusCol}">${statusText}</span>
      </div>
      <div class="pt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
        <div>Tủ cấp nguồn: <strong class="text-emerald-700 dark:text-emerald-400 font-semibold">${displayCabinet}</strong></div>
        <div>Lộ điện (Feeder): <strong class="text-slate-700 dark:text-slate-200 font-mono">${displayFeeder}</strong></div>
        <div>Công suất tải: <strong class="text-slate-700 dark:text-slate-200 font-mono">${p.lamp_watt || 100}W</strong> (220V AC)</div>
        ${p.atlas || p.atlas_note ? `<div class="text-slate-600 dark:text-slate-400 text-[10.5px]">📍 Vị trí: <strong class="text-slate-800 dark:text-slate-200">${p.atlas || p.atlas_note}</strong></div>` : ''}
        ${p.power_loss_reason ? `<div class="text-rose-600 dark:text-rose-400 text-[10px] font-medium pt-0.5">⚠️ ${p.power_loss_reason}</div>` : status === 'out' ? `<div class="text-rose-600 dark:text-rose-400 text-[10px] font-medium pt-0.5">⚠️ Cháy bóng LED/Driver (Cáp nguồn trục 220V vẫn thông mạch)</div>` : status === 'dim' ? `<div class="text-amber-600 dark:text-amber-400 text-[10px] font-medium pt-0.5">⚡ Sụt áp cuối nguồn / Giảm quang thông</div>` : ''}
      </div>
    </div>
  `
}

interface CabinetTooltipParams {
  cabinet: any
}

export function getCabinetTooltipHtml({ cabinet }: CabinetTooltipParams): string {
  const p = cabinet.properties || {}
  const isFault = p.status === 'fault'

  const roleBadge = '<span class="text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded text-[10px]">Tủ Điều Khiển</span>'
  const statusBadge = isFault
    ? '<span class="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded text-[10px]">Đã ngắt nguồn</span>'
    : '<span class="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">Đang cấp điện</span>'

  const displayCabinetCode = p.external_ref || p.cabinet_code || p.cabinet_id

  return `
    <div class="bg-white/98 dark:bg-slate-900/98 text-slate-800 dark:text-slate-100 p-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-md min-w-52 font-sans">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 gap-2">
        <span class="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">${displayCabinetCode}</span>
        <div class="flex items-center gap-1">${roleBadge}${statusBadge}</div>
      </div>
      <div class="pt-1.5 space-y-0.5 text-[11px]">
        <div class="font-bold text-slate-900 dark:text-white">${p.cabinet_name}</div>
        <div class="text-slate-600 dark:text-slate-400 text-[10.5px]">📍 Atlas: <strong class="text-slate-800 dark:text-slate-200">${p.atlas || p.landmark_note || ''}</strong></div>
        <div class="text-purple-600 dark:text-purple-400 font-semibold pt-0.5">
          Tuyến điện: ${p.feeder_external_ref || p.feeder_id || `FDR-${p.cabinet_id}`} • Quản lý: ${p.total_poles_managed || p.pole_count || 0} cột
        </div>
      </div>
    </div>
  `
}

interface FeederTooltipParams {
  featureProps: any
  info?: SegmentInfo
}

export function getFeederTooltipHtml({ featureProps: p }: FeederTooltipParams): string {
  const isLineFault = p.status === 'fault'
  const cabName = p.cabinet_external_ref || p.cabinet_name || p.cabinet_code || p.cabinet_id || p.from_id || 'Tủ điện'
  const feederDisplay = p.external_ref || p.feeder_name || p.feeder_id || 'FDR-001'
  const segName = p.segment_name || p.segment_id || 'Tuyến đường'
  const branch = p.branch != null ? `Nhánh ${p.branch}` : undefined
  const order = p.order != null ? `Cạnh thứ ${p.order}` : undefined
  const fromId = p.from_id
  const toPoleId = p.to_pole_id
  const statusBg = isLineFault ? 'bg-rose-500' : 'bg-emerald-500'
  const statusText = isLineFault ? 'Đã ngắt nguồn' : 'Đang cấp điện'

  return `
    <div class="bg-white/98 dark:bg-slate-900/98 text-slate-800 dark:text-slate-100 p-3 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 backdrop-blur-md min-w-60 font-sans">
      <div class="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 gap-2">
        <span class="font-bold text-xs ${isLineFault ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'} flex items-center gap-1.5 truncate">
          <span class="w-2 h-2 rounded-full ${statusBg} ${isLineFault ? 'animate-pulse' : ''} shrink-0"></span>
          Tuyến điện ${feederDisplay}
        </span>
        <span class="${isLineFault ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'} px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0">
          ${statusText}
        </span>
      </div>
      <div class="pt-2 space-y-1.5 text-[11.5px]">
        <div>Tủ cấp nguồn: <strong class="text-slate-900 dark:text-white font-semibold">${cabName}</strong></div>
        ${fromId && toPoleId ? `<div class="font-mono text-[11px] text-slate-600 dark:text-slate-300">Liên kết: <strong class="text-blue-600 dark:text-blue-400">${fromId}</strong> ➔ <strong class="text-emerald-600 dark:text-emerald-400">${toPoleId}</strong></div>` : ''}
        ${branch || order ? `<div class="text-[11px] text-slate-500 dark:text-slate-400">${[branch, order].filter(Boolean).join(' • ')}</div>` : ''}
        <div>Tuyến đường: <strong class="text-slate-700 dark:text-slate-300 font-medium">${segName}</strong></div>
      </div>
    </div>
  `
}

export function getRoadSegmentTooltipHtml({ featureProps: p }: { featureProps: any }): string {
  const name = p.segment_name || p.name || 'Tuyến đường'
  const lengthM = p.length_m || 0
  const poleCount = p.pole_count || 0
  const hasFault = p.has_active_segment_fault

  return `
    <div class="bg-white/98 dark:bg-slate-900/98 text-slate-800 dark:text-slate-100 p-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-md min-w-48 font-sans">
      <div class="font-bold text-xs text-sky-700 dark:text-sky-400 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span>${name}</span>
        ${hasFault ? '<span class="text-[9px] bg-rose-50 text-rose-600 px-1 py-0.2 rounded border border-rose-200">Sự cố</span>' : ''}
      </div>
      <div class="pt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
        <div>Chiều dài: <strong class="text-slate-800 dark:text-slate-200">${lengthM}m</strong></div>
        <div>Số cột đèn: <strong class="text-slate-800 dark:text-slate-200">${poleCount} cột</strong></div>
      </div>
    </div>
  `
}
