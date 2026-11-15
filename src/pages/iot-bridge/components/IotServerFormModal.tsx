import React, { useState } from 'react'
import { CheckCircle2, Globe, MapPin, RadioTower, Server } from 'lucide-react'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotServerStatus } from '../../../types/iot/servers'
import type { CommuneItem } from '../../../types/admin/communes'
import { apiErrorMessage } from '../../../utils/iot/apiError'
import { isValidServerId } from '../../../utils/iot/iotRegistration'
import { LocationPickerMap } from '../../../components/LocationPickerMap'
import {
  AssetModalError,
  AssetModalFooter,
  AssetModalFrame,
  AssetModalHeader,
} from '../../assets/components/common/AssetModal'

const DEFAULT_BASE_URL = 'http://127.0.0.1:5000'

type Coords = { lat: number; lng: number }

const centerOf = (commune?: CommuneItem): Coords | null =>
  typeof commune?.center?.lat === 'number' && typeof commune.center.lng === 'number'
    ? { lat: commune.center.lat, lng: commune.center.lng }
    : null

export type CommuneLoadStatus = 'loading' | 'ready' | 'failed'

const COMMUNE_HINT: Record<CommuneLoadStatus | 'empty', string> = {
  loading: 'Đang tải danh sách xã / phường…',
  ready: 'Chỉ người dùng của xã này thấy server trên bản đồ.',
  failed: 'Không tải được danh sách xã / phường. Đóng hộp thoại rồi bấm "Tải lại" trên trang.',
  empty: 'Chưa có xã / phường nào — tạo ở trang "Địa bàn & Khung BBox" trước.',
}

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition'

const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
    {children}
    {hint && <span className="block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</span>}
  </label>
)

/**
 * Đăng ký server IoT Bridge (`server` null) hoặc sửa xã / vị trí gateway của server đã có.
 * Vị trí chọn trên bản đồ vệ tinh: bấm hoặc kéo ghim. Đăng ký mới thì xã và ghim đều phải tự chọn, không có giá trị mặc định.
 * Xã là bắt buộc: `GET /iot/servers` chỉ hiện server có xã nằm trong phạm vi người xem.
 */
export const IotServerFormModal: React.FC<{
  server: IotServerStatus | null
  communes: CommuneItem[]
  /** Danh sách xã tải ở trang cha; modal có thể mở trước khi tải xong. */
  communeStatus: CommuneLoadStatus
  onClose: () => void
  onSaved: () => void
}> = ({ server, communes, communeStatus, onClose, onSaved }) => {
  const editing = Boolean(server?.server_id)
  const [serverId, setServerId] = useState(server?.server_id || '')
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [communeId, setCommuneId] = useState(server?.commune_id || '')
  const [picked, setPicked] = useState<Coords | null>(server?.location ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commune = communes.find((c) => c.commune_id === communeId)
  // Vị trí gửi đi CHỈ là chỗ người dùng tự ghim (`picked`). Tâm xã chỉ để căn bản đồ, không bao giờ thành vị trí gateway.
  const mapCenter = picked ?? centerOf(commune)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!editing && !isValidServerId(serverId.trim()))
      return setError('Server ID chỉ gồm chữ, số, "-" hoặc "_" (tối đa 64 ký tự) và không được là "default".')
    if (!editing && !baseUrl.trim()) return setError('Cần địa chỉ HTTP của IoT Bridge.')
    if (!communeId) return setError('Cần chọn xã/phường.')
    if (!picked) return setError('Hãy bấm lên bản đồ để đặt vị trí gateway.')

    setSaving(true)
    try {
      if (editing) {
        await iotAPI.updateServerLocation(server!.server_id!, { commune_id: communeId, location: picked })
      } else {
        await iotAPI.registerServer({
          server_id: serverId.trim(),
          base_url: baseUrl.trim(),
          commune_id: communeId,
          location: picked,
        })
      }
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err, editing ? 'Không cập nhật được vị trí server.' : 'Không đăng ký được server.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      <AssetModalHeader
        icon={<RadioTower className="w-5 h-5" />}
        accent="blue"
        title={editing ? `Sửa vị trí server ${server!.server_id}` : 'Đăng ký server IoT Bridge'}
        subtitle="Gateway ESP32 + node LoRa — đặt vị trí gateway trên bản đồ vệ tinh"
        onClose={onClose}
      />
      <AssetModalError message={error} />

      <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-5 space-y-5">
            {!editing && (
              <section className="space-y-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Server className="w-4 h-4 text-blue-600" /> Thông tin server
                </h4>
                <Field label="Server ID" hint='Chữ, số, "-" hoặc "_", tối đa 64 ký tự.'>
                  <input
                    className={`${inputClass} font-mono`}
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    placeholder="iot-server-01"
                    autoFocus
                  />
                </Field>
                <Field
                  label="Địa chỉ HTTP của bridge"
                  hint={
                    <>
                      Địa chỉ backend gọi tới bridge, phải nằm trong allowlist{' '}
                      <code className="font-mono text-[10.5px]">IotDiagnostics:AllowedOrigins</code>.
                    </>
                  }
                >
                  <input className={`${inputClass} font-mono`} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                </Field>
              </section>
            )}

            <section className="space-y-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Globe className="w-4 h-4 text-blue-600" /> Địa bàn
              </h4>
              <Field label="Xã / phường" hint={COMMUNE_HINT[communeStatus === 'ready' && communes.length === 0 ? 'empty' : communeStatus]}>
                <select
                  className={`${inputClass} cursor-pointer`}
                  value={communeId}
                  onChange={(e) => {
                    // Đổi xã thì bỏ ghim cũ, bản đồ về tâm xã mới.
                    setCommuneId(e.target.value)
                    setPicked(null)
                  }}
                >
                  <option value="" disabled>
                    {communeStatus === 'loading' ? 'Đang tải danh sách…' : '— Chọn xã / phường —'}
                  </option>
                  {communes.map((c) => (
                    <option key={c.commune_id || ''} value={c.commune_id || ''}>
                      {c.name ? `${c.name} (${c.commune_id})` : c.commune_id}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-amber-500" /> Vị trí gateway
              </p>
              <p className="font-mono text-slate-800 dark:text-slate-100" data-testid="iot-server-location">
                {picked ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` : 'Chưa chọn'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {picked
                  ? 'Đã ghim. Bấm chỗ khác hoặc kéo ghim để đổi.'
                  : 'Bấm lên bản đồ, trong khung xã, đúng chỗ đặt gateway.'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              <MapPin className="w-4 h-4 text-blue-600" /> Bản đồ vệ tinh (GIS)
            </span>
            {/* Chưa ghim: không vẽ ghim, bản đồ căn theo khung/tâm xã (xã chưa có tâm thì về tâm mặc định). */}
            <LocationPickerMap
              key={communeId}
              lat={mapCenter?.lat ?? Number.NaN}
              lng={mapCenter?.lng ?? Number.NaN}
              height="380px"
              boundary={commune?.bbox}
              unpicked={!picked}
              onChange={(coords) => setPicked(coords)}
            />
          </div>
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel={editing ? 'Lưu vị trí' : 'Đăng ký server'}
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
          loading={saving}
        />
      </form>
    </AssetModalFrame>
  )
}

export default IotServerFormModal
