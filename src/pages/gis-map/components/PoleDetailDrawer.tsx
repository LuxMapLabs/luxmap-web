import React from 'react'
import { Drawer } from '../../../components/Drawer'
import { StatusBadge } from '../../../components/StatusBadge'
import { Button } from '../../../components/Button'
import {
  Zap,
  Sun,
  Radio,
  TrendingDown,
  Wrench,
  AlertTriangle,
} from 'lucide-react'
import { showToast } from '../../../utils/toastUtils'

export interface PoleDetail {
  pole_id: string
  segment_id?: string
  segment_name?: string
  commune_id?: string
  location?: {
    lat: number
    lng: number
  }
  fixture?: {
    fixture_type: string
    power_source: string
    lamp_watt: number
    install_date: string
    warranty_expiry: string
    supplier?: string
  }
  current_status?: {
    fixture_status: 'normal' | 'dim' | 'out' | 'unknown'
    status_confidence: number
    determined_at: string
    source_channel: string
  }
  iot_node?: {
    node_id: string
    node_status: string
    last_report_at: string
  }
  luminance_baseline?: {
    baseline_value: number
    dim_threshold_ratio: number
    out_threshold_ratio: number
  }
  luminance_history?: {
    observed_at: string
    sweep_id: string
    normalized_luminance: number
    baseline_ratio: number
    classified_as: string
  }[]
}

export interface PoleDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  pole: PoleDetail | null
}

export const PoleDetailDrawer: React.FC<PoleDetailDrawerProps> = ({
  isOpen,
  onClose,
  pole,
}) => {
  if (!pole) return null

  const fixtureStatus = pole.current_status?.fixture_status || 'normal'
  const isDimOrOut = fixtureStatus === 'dim' || fixtureStatus === 'out'
  const isSolar = pole.fixture?.power_source === 'solar'

  const handleCreateWorkOrder = () => {
    showToast.success(
      'Đã mở form tạo phiếu sửa chữa',
      `Tự động gắn mã cột ${pole.pole_id} vào phiếu bảo trì.`
    )
  }

  const handleReportFault = () => {
    showToast.warning(
      'Gửi phản ánh sự cố thủ công',
      `Đã ghi nhận yêu cầu kiểm tra hiện trường cho ${pole.pole_id}.`
    )
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi Tiết Cột: ${pole.pole_id}`}
      subtitle={`${pole.segment_name || pole.segment_id || 'Tuyến liên thôn'} · Xã Phước Hậu`}
      width="md"
      footer={
        <div className="flex items-center gap-2 w-full">
          {isDimOrOut ? (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={handleCreateWorkOrder}
              leftIcon={<Wrench className="w-4 h-4" />}
            >
              Tạo Lệnh Sửa Chữa (Ưu tiên)
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleReportFault}
              leftIcon={<AlertTriangle className="w-4 h-4" />}
            >
              Báo Sự Cố Thủ Công
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        
        {/* 1. Status Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái phát sáng</span>
            <StatusBadge type="fixture" status={fixtureStatus} />
          </div>

          {/* Độ suy giảm quang thông nếu đèn Mờ */}
          {fixtureStatus === 'dim' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                <span>Cảnh báo: Đèn mờ (Suy giảm quang thông 40%)</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Độ sáng đo được chỉ đạt 60% so với đường chuẩn (Baseline). Khuyến nghị thay bóng LED trước khi tắt hẳn.
              </p>
            </div>
          )}

          {fixtureStatus === 'out' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Sự cố: Đèn tắt hoàn toàn (Blackout)</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Phát hiện không phát sáng trong đợt quét đêm gần nhất. Cần đội bảo trì kiểm tra nguồn và bóng đèn.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400 block text-[10px]">Độ tin cậy AI:</span>
              <span className="font-extrabold text-slate-800">
                {Math.round((pole.current_status?.status_confidence || 0.9) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Kênh phát hiện:</span>
              <span className="font-extrabold text-slate-800 uppercase">
                {pole.current_status?.source_channel || 'CV Quét Đêm'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Technical Specifications */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Thông số kỹ thuật tài sản</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Loại bóng</span>
              <span className="font-bold text-slate-800">{pole.fixture?.fixture_type === 'solar_all_in_one' ? 'Solar All-In-One' : 'LED Đường Phố'}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Công suất</span>
              <span className="font-bold text-slate-800">{pole.fixture?.lamp_watt || 100}W</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Nguồn cấp điện</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                {isSolar ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Zap className="w-3.5 h-3.5 text-blue-500" />}
                <span>{isSolar ? 'Năng lượng Mặt trời' : 'Điện lưới Quốc gia'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Tọa độ GPS</span>
              <span className="font-bold text-slate-800 font-mono text-[11px]">
                {pole.location ? `${pole.location.lat.toFixed(4)}, ${pole.location.lng.toFixed(4)}` : '10.5841, 106.6321'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Ngày lắp đặt</span>
              <span className="font-bold text-slate-800">{pole.fixture?.install_date || '2022-03-24'}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Hạn bảo hành</span>
              <span className="font-bold text-emerald-700">{pole.fixture?.warranty_expiry || '2027-03-24'}</span>
            </div>

          </div>
        </div>

        {/* 3. IoT Node Sensor (If Available) */}
        {pole.iot_node && (
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Cảm biến đo sáng IoT ({pole.iot_node.node_id})</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {pole.iot_node.node_status}
              </span>
            </div>
            <p className="text-[11px] text-blue-800/80">
              Lần gửi dữ liệu cuối: <strong>{pole.iot_node.last_report_at || 'Vừa xong'}</strong>
            </p>
          </div>
        )}

        {/* 4. Luminance History (Lịch sử đo độ sáng) */}
        {pole.luminance_history && pole.luminance_history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lịch sử đo sáng 3 đêm gần nhất</p>
            <div className="space-y-1.5">
              {pole.luminance_history.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{item.observed_at.split('T')[0]}</p>
                    <p className="text-[10px] text-slate-400">{item.sweep_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">
                      {Math.round(item.baseline_ratio * 100)}% Baseline
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Quang thông: {item.normalized_luminance.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Drawer>
  )
}
