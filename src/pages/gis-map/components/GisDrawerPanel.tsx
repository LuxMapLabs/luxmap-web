import React from 'react'
import {
  AlertTriangle,
  Zap,
  X,
  MapPin,
  FileText,
  Activity,
  Info,
  Sun,
  Radio,
} from 'lucide-react'
import { SegmentInfo, PoleFeature } from '../GisMapPage'
import mockPolesData from '../../../data/mock-poles.geo.json'
import mockPoleDetailData from '../../../data/mock-pole-detail.json'

interface LuminanceHistoryItem {
  observed_at: string
  baseline_ratio: number
  classified_as: 'normal' | 'dim' | 'out' | string
}

interface GisDrawerPanelProps {
  selectedPole: PoleFeature | null
  setSelectedPole: (p: PoleFeature | null) => void
  setSelectedSegmentId: (s: string | null) => void
  activeSegmentDetail: SegmentInfo
  panelTab: 'info' | 'iot'
  setPanelTab: (t: 'info' | 'iot') => void
  handleSelectPole: (f: PoleFeature) => void
}

export const GisDrawerPanel: React.FC<GisDrawerPanelProps> = ({
  selectedPole,
  setSelectedPole,
  setSelectedSegmentId,
  activeSegmentDetail,
  panelTab,
  setPanelTab,
  handleSelectPole,
}) => {
  return (
    <aside className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20 shrink-0">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              activeSegmentDetail.hasActiveSegmentFault
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {activeSegmentDetail.hasActiveSegmentFault ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <Zap className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              <span>{selectedPole ? selectedPole.properties?.pole_id : activeSegmentDetail.cabinet}</span>
              {activeSegmentDetail.hasActiveSegmentFault ? (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                  SỰ CỐ CẢ ĐOẠN
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  {activeSegmentDetail.iotStatus === 'online' ? 'IoT Online' : 'Offline'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{activeSegmentDetail.road}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedPole(null)
            setSelectedSegmentId(null)
          }}
          className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subheader Route Banner */}
      <div
        className={`px-4 py-2 border-b text-xs flex justify-between items-center ${
          activeSegmentDetail.hasActiveSegmentFault
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : 'bg-blue-50/50 border-slate-200/60 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-1.5 font-semibold">
          <MapPin className={`w-3.5 h-3.5 ${activeSegmentDetail.hasActiveSegmentFault ? 'text-rose-600' : 'text-blue-600'}`} />
          <span>{activeSegmentDetail.name}</span>
        </div>
        <div className="text-right text-[10px] font-mono">
          {activeSegmentDetail.poleCount} cột ({activeSegmentDetail.lengthM}m)
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-bold text-slate-600 bg-slate-50">
        <button
          type="button"
          onClick={() => setPanelTab('info')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
            panelTab === 'info'
              ? 'border-primary text-primary bg-white'
              : 'border-transparent hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{selectedPole ? 'Hồ sơ cột đèn' : 'Danh sách cột'}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('iot')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
            panelTab === 'iot'
              ? 'border-primary text-primary bg-white'
              : 'border-transparent hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>IoT Tuyến {activeSegmentDetail.id}</span>
        </button>
      </div>

      {/* Panel Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {panelTab === 'info' ? (
          <div className="space-y-3 text-xs">
            {selectedPole ? (
              <>
                {/* Technical Profile Card */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary" />
                      <span>Thông Tin Cột Đèn</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        selectedPole.properties.fixture_status === 'normal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedPole.properties.fixture_status === 'dim'
                          ? 'bg-amber-100 text-amber-800'
                          : selectedPole.properties.fixture_status === 'out'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedPole.properties.fixture_status === 'normal'
                        ? 'Đạt chuẩn (Sáng)'
                        : selectedPole.properties.fixture_status === 'dim'
                        ? 'Đèn mờ (Dim)'
                        : selectedPole.properties.fixture_status === 'out'
                        ? 'Hỏng/Tắt (Out)'
                        : 'Chưa quét (Unknown)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Mã cột:</span>
                    <strong className="text-slate-900 font-mono">{selectedPole.properties.pole_id}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tuyến quản lý:</span>
                    <strong className="text-slate-900">{selectedPole.properties.segment_id}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Nguồn cấp:</span>
                    <strong className="text-slate-900">
                      {selectedPole.properties.power_source === 'solar' ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-900">
                          <Sun className="w-3.5 h-3.5 text-amber-500" /> Năng lượng mặt trời
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-900">
                          <Zap className="w-3.5 h-3.5 text-blue-500" /> Điện lưới 220V
                        </span>
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Loại bóng:</span>
                    <strong className="text-slate-900">
                      {selectedPole.properties.fixture_type || 'LED Đường Phố'} ({selectedPole.properties.lamp_watt || 100}W)
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tọa độ GPS:</span>
                    <strong className="text-slate-900 font-mono">
                      {selectedPole.geometry.coordinates[1].toFixed(5)}° N, {selectedPole.geometry.coordinates[0].toFixed(5)}° E
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ngày lắp đặt:</span>
                    <strong className="text-slate-900">{selectedPole.properties.install_date || '2022-03-24'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Hạn bảo hành:</span>
                    <strong className="text-slate-900">{selectedPole.properties.warranty_expiry || '2027-03-24'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Gần POI nhạy cảm:</span>
                    <strong className={selectedPole.properties.near_sensitive_poi ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {selectedPole.properties.near_sensitive_poi ? 'Có (Cầu / Trường học)' : 'Không'}
                    </strong>
                  </div>
                </div>

                {/* Luminance Baseline Details */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Tỉ Lệ Quang Thông (Baseline Ratio)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">30 đêm quét</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Đường chuẩn: Ngưỡng mờ <strong>0.80</strong> · Ngưỡng tắt <strong>0.15</strong>
                  </p>

                  {/* 3 Nights History */}
                  <div className="space-y-1.5 pt-1">
                    {((mockPoleDetailData.luminance_history || []) as unknown as LuminanceHistoryItem[]).slice(0, 3).map((item: LuminanceHistoryItem, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]"
                      >
                        <span className="font-mono text-slate-600">{item.observed_at.split('T')[0]}</span>
                        <span className="font-bold text-slate-900">{Math.round(item.baseline_ratio * 100)}% Baseline</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            item.classified_as === 'normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.classified_as === 'normal' ? 'Sáng' : 'Mờ'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Route Pole List if no specific pole selected */
              <div className="space-y-2">
                <p className="font-bold text-slate-700">Danh sách cột trên tuyến ({activeSegmentDetail.name}):</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {((mockPolesData.features || []) as unknown as PoleFeature[])
                    .filter((f: PoleFeature) => f.properties?.segment_id === activeSegmentDetail.id)
                    .map((f: PoleFeature) => (
                      <div
                        key={f.properties.pole_id}
                        onClick={() => handleSelectPole(f)}
                        className="p-2 bg-slate-50 hover:bg-blue-50 rounded-xl cursor-pointer flex items-center justify-between border border-slate-100 transition"
                      >
                        <span className="font-bold font-mono text-slate-800">{f.properties.pole_id}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            f.properties.fixture_status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.properties.fixture_status === 'dim'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {f.properties.fixture_status === 'normal'
                            ? 'Sáng'
                            : f.properties.fixture_status === 'dim'
                            ? 'Mờ'
                            : 'Tắt'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: IoT Segment Telemetry */
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-primary" />
                  <span>Thông Số Tủ Điều Khiển {activeSegmentDetail.cabinet}</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    activeSegmentDetail.iotStatus === 'online'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {activeSegmentDetail.iotStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Điện áp Pha A</span>
                  <strong className="text-slate-900 font-mono text-xs">221.4 V</strong>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Dòng điện</span>
                  <strong className="text-slate-900 font-mono text-xs">18.6 A</strong>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Hệ số Cos φ</span>
                  <strong className="text-slate-900 font-mono text-xs">0.94</strong>
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                <span>Trạng thái Aptomat tổng:</span>
                <strong>
                  {activeSegmentDetail.hasActiveSegmentFault ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Đã Nhảy (Trip)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đang Đóng (ON)
                    </span>
                  )}
                </strong>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Lần gửi dữ liệu cuối:</span>
                <strong className="text-slate-900 font-mono">1 phút trước</strong>
              </div>
            </div>
          </div>
        )}
      </div>

    </aside>
  )
}
