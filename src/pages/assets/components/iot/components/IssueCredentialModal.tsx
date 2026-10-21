import React, { useState } from 'react'
import { X, Key, ShieldAlert, Check, Copy, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { IotNodeItem, IotNodeCredential } from '../../../../../types/assets/iot-nodes'

export interface IssueCredentialModalProps {
  isOpen: boolean
  node: IotNodeItem | null
  onClose: () => void
  onIssue: (nodeId: string, onSuccess: (cred: IotNodeCredential) => void) => void
}

export const IssueCredentialModal: React.FC<IssueCredentialModalProps> = ({
  isOpen,
  node,
  onClose,
  onIssue,
}) => {
  const [issuedCredential, setIssuedCredential] = useState<IotNodeCredential | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen || !node) return null

  const handleGenerate = () => {
    if (!node.node_id) return
    setIsGenerating(true)
    onIssue(node.node_id, (cred) => {
      setIsGenerating(false)
      setIssuedCredential(cred)
    })
  }

  const handleCopy = () => {
    if (issuedCredential?.secret) {
      navigator.clipboard.writeText(issuedCredential.secret)
      setCopied(true)
      toast.success('Đã sao chép Secret vào bộ nhớ tạm!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setIssuedCredential(null)
    setCopied(false)
    setIsGenerating(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Cấp Secret Xác Thực IoT
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Thiết bị: {node.node_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {!issuedCredential ? (
            <>
              {/* Cảnh báo an toàn */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <p className="font-bold">Cảnh báo bảo mật quan trọng:</p>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                    Secret chỉ được hiển thị <strong>DUY NHẤT MỘT LẦN</strong> trong phiên này và không thể đọc lại từ máy chủ. Nếu thiết bị đã có secret trước đó, secret cũ sẽ bị <strong>vô hiệu hóa ngay lập tức</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p>
                  Tình trạng hiện tại:{' '}
                  <strong>
                    {node.has_credential ? 'Đã có secret được cấp trước đó' : 'Chưa có secret'}
                  </strong>
                </p>
                {node.credential_set_at && (
                  <p className="text-[11px] text-slate-400">
                    Cấp lần cuối:{' '}
                    {new Date(node.credential_set_at).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-[#1f3864] hover:bg-[#1f3864]/90 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-4 h-4" />
                  <span>{isGenerating ? 'Đang tạo secret...' : 'Tạo Secret Mới'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Thành công, hiển thị secret */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-800 dark:text-emerald-200">
                  <p className="font-bold">Đã cấp phát Secret thành công!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Hãy sao chép ngay chuỗi bí mật này để nạp vào firmware của thiết bị.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Device Secret Key (Chỉ hiển thị 1 lần)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={issuedCredential.secret || ''}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3.5 py-2 bg-[#1f3864] hover:bg-[#1f3864]/90 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
                    title="Sao chép vào clipboard"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Đã Lưu Xong, Đóng Hộp Thoại
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
