import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Sliders, Cable, AlertCircle, Check, Unlink, Plus, Edit2, Loader2 } from 'lucide-react'
import type { IotNodeItem, IotNodeRelay } from '../../../../../types/assets/iot-nodes'
import type { FeederListItem } from '../../../../../types/assets/feeders'
import assetAPI from '../../../../../feature/assets/assetAPI'

export interface SetRelayModalProps {
  isOpen: boolean
  node: IotNodeItem | null
  feeders: FeederListItem[]
  onClose: () => void
  onSave: (nodeId: string, relayNo: number, feederId: string | null) => void
}

export const SetRelayModal: React.FC<SetRelayModalProps> = ({
  isOpen,
  node,
  feeders,
  onClose,
  onSave,
}) => {
  // State quản lý chi tiết node cục bộ để cập nhật tức thì (Optimistic + Backend Refetch)
  const [internalNode, setInternalNode] = useState<IotNodeItem | null>(node)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [relayNo, setRelayNo] = useState<number>(1)
  const [selectedFeederId, setSelectedFeederId] = useState<string>('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingRelayNo, setEditingRelayNo] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Node hiển thị ưu tiên internalNode mới nhất, fallback về props node
  const activeNode = internalNode || node

  // Đồng bộ internalNode khi props node thay đổi
  useEffect(() => {
    setInternalNode(node)
    setIsAddingNew(false)
    setEditingRelayNo(null)
    setErrorMsg(null)
  }, [node, isOpen])

  // Hàm fetch lại dữ liệu chi tiết thiết bị IoT từ Backend để đồng bộ 100%
  const refreshNodeDetail = useCallback(async (nodeId: string) => {
    try {
      setIsRefreshing(true)
      const freshData = await assetAPI.getIotNodeDetail(nodeId)
      if (freshData) {
        setInternalNode(freshData)
      }
    } catch (err) {
      console.warn('Không thể làm mới thông tin IoT node:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Lọc danh sách mạch xuất tuyến thuộc về cùng tủ điện của node
  const cabinetFeeders = useMemo(() => {
    return feeders.filter(
      (f) => !!(activeNode?.cabinet_id && f.cabinet?.cabinet_id === activeNode.cabinet_id)
    )
  }, [feeders, activeNode?.cabinet_id])

  // Tính số rơ-le kế tiếp khả dụng (tối đa 32)
  const nextAvailableRelayNo = useMemo(() => {
    if (!activeNode?.relays || activeNode.relays.length === 0) return 1
    const maxRelay = Math.max(...activeNode.relays.map((r) => r.relay_no))
    return Math.min(32, maxRelay + 1)
  }, [activeNode?.relays])

  if (!isOpen || !activeNode) return null

  // Chọn rơ-le đang có để đổi mạch
  const handleSelectExistingRelay = (relay: IotNodeRelay) => {
    setIsAddingNew(false)
    setEditingRelayNo(relay.relay_no)
    setRelayNo(relay.relay_no)
    setSelectedFeederId(relay.feeder_id || cabinetFeeders[0]?.feeder_id || '')
    setErrorMsg(null)
  }

  // Bấm nút Thêm Rơ-le Mới
  const handleAddNewRelay = () => {
    setEditingRelayNo(null)
    setIsAddingNew(true)
    setRelayNo(nextAvailableRelayNo)
    setSelectedFeederId(cabinetFeeders[0]?.feeder_id || '')
    setErrorMsg(null)
  }

  // Hủy form soạn thảo
  const handleCancelForm = () => {
    setIsAddingNew(false)
    setEditingRelayNo(null)
    setErrorMsg(null)
  }

  // Thao tác ngắt kết nối nhanh một rơ-le
  const handleQuickUnwire = async (targetRelayNo: number) => {
    if (activeNode.node_id) {
      onSave(activeNode.node_id, targetRelayNo, null)

      // Optimistic update: ngắt kết nối ngay trên UI modal
      setInternalNode((prev) => {
        if (!prev) return prev
        const updatedRelays = (prev.relays || []).map((r) =>
          r.relay_no === targetRelayNo ? { ...r, feeder_id: null } : r
        )
        return { ...prev, relays: updatedRelays }
      })

      if (editingRelayNo === targetRelayNo) {
        handleCancelForm()
      }

      // Fetch lại từ Backend để đồng bộ chính xác
      await refreshNodeDetail(activeNode.node_id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!activeNode.node_id) {
      setErrorMsg('Thiếu mã định danh thiết bị IoT!')
      return
    }

    if (relayNo < 1 || relayNo > 32) {
      setErrorMsg('Số thứ tự rơ-le phải nằm trong khoảng từ 1 đến 32!')
      return
    }

    if (!selectedFeederId) {
      setErrorMsg('Vui lòng chọn mạch điện để đấu nối rơ-le!')
      return
    }

    const finalFeederId = selectedFeederId.trim()
    onSave(activeNode.node_id, relayNo, finalFeederId)

    // Optimistic update ngay trên UI modal
    setInternalNode((prev) => {
      if (!prev) return prev
      const currentList = prev.relays ? [...prev.relays] : []
      const idx = currentList.findIndex((r) => r.relay_no === relayNo)
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], feeder_id: finalFeederId }
      } else {
        currentList.push({ relay_no: relayNo, feeder_id: finalFeederId })
      }
      return {
        ...prev,
        relays: currentList.sort((a, b) => a.relay_no - b.relay_no),
      }
    })

    // Đóng form thêm/sửa để hiển thị danh sách rơ-le đã cập nhật
    handleCancelForm()

    // Fetch lại từ Backend để đảm bảo dữ liệu mới nhất
    await refreshNodeDetail(activeNode.node_id)
  }

  const getFeederName = (feederId: string | null) => {
    if (!feederId) return 'Chưa đấu nối'
    const f = feeders.find((item) => item.feeder_id === feederId)
    return f?.feeder_name || f?.external_ref || feederId
  }

  const isFormOpen = isAddingNew || editingRelayNo !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Cấu Hình Đấu Nối Rơ-le
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Thiết bị: {activeNode.node_id} | Tủ: {activeNode.cabinet_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Phần 1: Danh sách Rơ-le hiện có từ Backend */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Rơ-le Đã Đấu Nối ({activeNode.relays?.length || 0})</span>
                {isRefreshing && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                )}
              </label>

              {/* Nút Thêm Rơ-le hoặc Badge Đang Thêm */}
              {isAddingNew ? (
                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Đang cấu hình Rơ-le #{relayNo}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNewRelay}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Thêm một đầu rơ-le mới cho thiết bị"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Rơ-le</span>
                </button>
              )}
            </div>

            {activeNode.relays && activeNode.relays.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeNode.relays.map((relay) => {
                  const isEditingThis = editingRelayNo === relay.relay_no

                  return (
                    <div
                      key={relay.relay_no}
                      onClick={() => handleSelectExistingRelay(relay)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                        isEditingThis
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/40 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                          Rơ-le #{relay.relay_no}
                        </span>
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">
                            {getFeederName(relay.feeder_id)}
                          </span>
                          <span className="font-mono text-slate-400 block text-[10px]">
                            {relay.feeder_id ? `Mạch: ${relay.feeder_id}` : 'Chưa đấu nối'}
                            {relay.control_mode ? ` • Chế độ: ${relay.control_mode.toUpperCase()}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectExistingRelay(relay)
                          }}
                          className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="Đổi mạch điện cho rơ-le này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Đổi mạch</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickUnwire(relay.relay_no)
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Hủy đấu nối rơ-le này khỏi mạch"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !isFormOpen ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center text-xs text-slate-400 italic border border-slate-200 dark:border-slate-800">
                Thiết bị này hiện chưa có rơ-le nào được đấu nối. Bấm nút <strong>"Thêm Rơ-le"</strong> để bắt đầu.
              </div>
            ) : null}
          </div>

          {/* Phần 2: Form Cấu Hình / Đấu Nối Rơ-le - Tinh gọn không còn radio ngắt nối thừa thãi */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="p-4 bg-indigo-50/40 dark:bg-slate-800/60 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-700/60 pb-2">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Cable className="w-4 h-4 text-indigo-600" />
                  <span>
                    {isAddingNew
                      ? `Đấu Nối Rơ-le Mới: #${relayNo}`
                      : `Đổi Mạch Cho Rơ-le #${relayNo}`}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Rơ-le số 1..32
                </span>
              </div>

              {/* Nhập số thứ tự rơ-le */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Số thứ tự Rơ-le (Relay Number)
                </label>
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={relayNo}
                  onChange={(e) => setRelayNo(parseInt(e.target.value) || 1)}
                  disabled={!isAddingNew}
                  required
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Chọn mạch điện xuất tuyến */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Mạch Điện Xuất Tuyến Thuộc Tủ {activeNode.cabinet_id} <span className="text-rose-500">*</span>
                </label>
                {cabinetFeeders.length > 0 ? (
                  <select
                    value={selectedFeederId}
                    onChange={(e) => setSelectedFeederId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary transition"
                  >
                    <option value="">-- Chọn mạch điện xuất tuyến --</option>
                    {cabinetFeeders.map((f) => (
                      <option
                        key={f.feeder_id || f.external_ref || Math.random().toString()}
                        value={f.feeder_id || ''}
                      >
                        {f.feeder_name || f.feeder_id} ({f.feeder_id})
                        {f.external_ref ? ` - Mã: ${f.external_ref}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Tủ điện <strong>{activeNode.cabinet_id}</strong> hiện chưa có mạch điện xuất tuyến nào. Vui lòng tạo mạch điện trước khi đấu nối rơ-le!
                    </span>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-indigo-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={cabinetFeeders.length === 0}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAddingNew ? 'Lưu Rơ-le Này' : 'Cập Nhật Mạch'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Modal Footer: Nút Đóng Modal */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
