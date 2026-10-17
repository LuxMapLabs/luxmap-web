import type { FaultType, Severity } from '../../types/common/enums'

const DB_NAME = 'LuxMapCitizenDB'
const DB_VERSION = 1
const STORE_NAME = 'draft_reports'

export interface CitizenReportDraft {
  pole_code: string
  selectedOptionId: string
  selectedFaultType: FaultType
  selectedSeverity: Severity
  description: string
  reporterName: string
  reporterPhone: string
  mediaFiles: File[]
  saved_at: number
}

/**
 * Mở kết nối IndexedDB (hoạt động độc lập trên mọi trình duyệt điện thoại)
 */
function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ trên môi trường này'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'pole_code' })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * Lưu bản nháp (Text + Tệp ảnh/video gốc) theo mã cột đèn
 */
export async function saveCitizenDraft(draft: CitizenReportDraft): Promise<void> {
  try {
    const db = await openDraftDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const putRequest = store.put(draft)

      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[IndexedDB] Không thể lưu bản nháp:', error)
  }
}

/**
 * Lấy bản nháp theo mã cột đèn, tự động kiểm tra TTL (số ngày cấu hình trong .env)
 */
export async function getCitizenDraft(poleCode: string): Promise<CitizenReportDraft | null> {
  try {
    const db = await openDraftDb()
    const draft = await new Promise<CitizenReportDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getRequest = store.get(poleCode)

      getRequest.onsuccess = () => resolve(getRequest.result || null)
      getRequest.onerror = () => reject(getRequest.error)
      tx.oncomplete = () => db.close()
    })

    if (!draft) return null

    // Kiểm tra TTL (Mặc định 2 ngày nếu không cấu hình)
    const ttlDays = Number(import.meta.env?.VITE_DRAFT_TTL_DAYS || '') || 2
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000
    const isExpired = Date.now() - draft.saved_at > ttlMs

    if (isExpired) {
      await deleteCitizenDraft(poleCode)
      return null
    }

    return draft
  } catch (error) {
    console.warn('[IndexedDB] Không thể đọc bản nháp:', error)
    return null
  }
}

/**
 * Xóa bản nháp của cột đèn (khi gửi thành công hoặc hết hạn)
 */
export async function deleteCitizenDraft(poleCode: string): Promise<void> {
  try {
    const db = await openDraftDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const delRequest = store.delete(poleCode)

      delRequest.onsuccess = () => resolve()
      delRequest.onerror = () => reject(delRequest.error)
      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[IndexedDB] Không thể xóa bản nháp:', error)
  }
}
