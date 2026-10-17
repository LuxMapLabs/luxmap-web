import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import citizenReportReducer, {
  lookupPublicQrRequest,
  lookupPublicQrSuccess,
  lookupPublicQrFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
  resetReportState,
} from '../../../feature/citizen-report/citizenReportSlice'
import { CitizenReportPage } from '../../../pages/citizen-report/CitizenReportPage'
import { ReportSuccessModal } from '../../../pages/citizen-report/components/ReportSuccessModal'
import { PoleInfoCard } from '../../../pages/citizen-report/components/PoleInfoCard'
import type {
  PublicQrInfo,
  PublicReportReceipt,
  PublicReportSubmitPayload,
} from '../../../feature/citizen-report/citizenReportAPI'
import { VIETNAM_PHONE_REGEX } from '../../../validations/common.schema'

// Mock indexedDbDraft module
vi.mock('../../../utils/citizen-report/indexedDbDraft', () => ({
  getCitizenDraft: vi.fn().mockResolvedValue(null),
  saveCitizenDraft: vi.fn().mockResolvedValue(undefined),
  deleteCitizenDraft: vi.fn().mockResolvedValue(undefined),
}))

// Mock imageUtils module
vi.mock('../../../utils/imageUtils', () => ({
  convertToJpeg: vi.fn().mockImplementation((file: File) => Promise.resolve(file)),
}))

describe('CitizenReportPage End-to-End Test Suite (TASK-CITIZEN-QR-END-TO-END)', () => {
  const mockPublicQr: PublicQrInfo = {
    segment_name: 'Đường Tỉnh Lộ 8 (Đoạn Cầu Tân Quy)',
    commune_name: 'Xã Tân Thạnh Đông',
  }

  const mockReceipt: PublicReportReceipt = {
    client_op_id: 'op-20261013-abcd-1234',
    received_at: '2026-10-13T10:00:00Z',
    photos_kept: 1,
  }

  const createTestStore = (options?: {
    initialState?: Record<string, any>
    autoResolvePole?: PublicQrInfo | null
    autoFailLookupError?: string | null
  }) => {
    const { initialState, autoResolvePole, autoFailLookupError } = options || {}

    return configureStore({
      reducer: {
        citizenReport: (state, action) => {
          if (action.type === lookupPublicQrRequest.type) {
            if (autoResolvePole) {
              return {
                ...state,
                isLookingUp: false,
                currentPole: autoResolvePole,
                isValidCode: true,
                lookupError: null,
                code: action.payload,
              }
            }
            if (autoFailLookupError) {
              return {
                ...state,
                isLookingUp: false,
                currentPole: null,
                isValidCode: false,
                lookupError: autoFailLookupError,
                code: action.payload,
              }
            }
          }
          return citizenReportReducer(state, action)
        },
      },
      preloadedState: initialState
        ? {
            citizenReport: {
              code: null,
              currentPole: null,
              isValidCode: false,
              isLookingUp: false,
              isSubmitting: false,
              submissionResult: null,
              lookupError: null,
              submitError: null,
              ...initialState,
            },
          }
        : undefined,
    })
  }

  const renderWithProviders = (
    ui: React.ReactElement,
    { store = createTestStore(), initialUrl = '/r/QR12345678901234' } = {}
  ) => {
    return {
      store,
      ...render(
        <Provider store={store}>
          <MemoryRouter initialEntries={[initialUrl]}>
            <Routes>
              <Route path="/r/:code" element={ui} />
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </Provider>
      ),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  // ==========================================
  // TẦNG 1: UNIT TEST CHO CÁC COMPONENT CON
  // ==========================================
  describe('1. Child Components Unit Verification', () => {
    it('PoleInfoCard hiển thị Skeleton Loading khi isLoading=true', () => {
      const { container } = render(
        <PoleInfoCard code="QR12345678901234" poleInfo={null} isLoading={true} />
      )
      expect(container.querySelector('.animate-pulse')).not.toBeNull()
    })

    it('PoleInfoCard hiển thị thẻ xanh 200 OK khi có poleInfo hợp lệ', () => {
      render(
        <PoleInfoCard code="QR12345678901234" poleInfo={mockPublicQr} isLoading={false} />
      )
      expect(screen.getByText('Vị trí cột đèn phản ánh')).toBeInTheDocument()
      expect(screen.getByText('Mã QR hợp lệ')).toBeInTheDocument()
      expect(screen.getByText('Đường Tỉnh Lộ 8 (Đoạn Cầu Tân Quy)')).toBeInTheDocument()
      expect(screen.getByText('Xã Tân Thạnh Đông')).toBeInTheDocument()
      expect(screen.getByText('QR12345678901234')).toBeInTheDocument()
    })

    it('PoleInfoCard hiển thị thẻ đỏ khi gặp lỗi 404 / thu hồi', () => {
      render(
        <PoleInfoCard
          code="REVOKED_CODE"
          poleInfo={null}
          isLoading={false}
          error="Mã QR này không tồn tại hoặc đã bị thu hồi"
        />
      )
      expect(screen.getByText('Mã không hợp lệ')).toBeInTheDocument()
      expect(screen.getByText('REVOKED_CODE')).toBeInTheDocument()
      expect(screen.getByText('Mã QR này không tồn tại hoặc đã bị thu hồi')).toBeInTheDocument()
    })

    it('ReportSuccessModal hiển thị mã biên nhận client_op_id và thời gian ghi nhận', () => {
      render(<ReportSuccessModal receipt={mockReceipt} code="QR12345678901234" />)
      expect(screen.getByText('Gửi Phản Ánh Thành Công!')).toBeInTheDocument()
      expect(screen.getByText('op-20261013-abcd-1234')).toBeInTheDocument()
      expect(screen.getByText('QR12345678901234')).toBeInTheDocument()
      expect(screen.getByText('1 ảnh')).toBeInTheDocument()
    })
  })

  // ==========================================
  // TẦNG 2: VIETNAM PHONE REGEX VALIDATION
  // ==========================================
  describe('2. Phone Regex Validation Rules', () => {
    it('chấp nhận số điện thoại hợp lệ 10 số của các nhà mạng', () => {
      expect(VIETNAM_PHONE_REGEX.test('0901234567')).toBe(true)
      expect(VIETNAM_PHONE_REGEX.test('0381234567')).toBe(true)
      expect(VIETNAM_PHONE_REGEX.test('0868889999')).toBe(true)
      expect(VIETNAM_PHONE_REGEX.test('0771234567')).toBe(true)
      expect(VIETNAM_PHONE_REGEX.test('0591234567')).toBe(true)
    })

    it('từ chối số điện thoại sai đầu số, thiếu hoặc thừa chữ số', () => {
      expect(VIETNAM_PHONE_REGEX.test('0241234567')).toBe(false)
      expect(VIETNAM_PHONE_REGEX.test('090123456')).toBe(false)
      expect(VIETNAM_PHONE_REGEX.test('09012345678')).toBe(false)
      expect(VIETNAM_PHONE_REGEX.test('abc0901234')).toBe(false)
    })
  })

  // ==========================================
  // TẦNG 3: citizenReportSlice Reducer Unit Tests
  // ==========================================
  describe('3. citizenReportSlice Reducer Unit Tests', () => {
    it('lookupPublicQrRequest cập nhật trạng thái đang tra cứu', () => {
      const state = citizenReportReducer(undefined, lookupPublicQrRequest('QR16CHARSCODE123'))
      expect(state.isLookingUp).toBe(true)
      expect(state.code).toBe('QR16CHARSCODE123')
      expect(state.lookupError).toBeNull()
      expect(state.isValidCode).toBe(false)
    })

    it('lookupPublicQrSuccess cập nhật poleInfo và đặt isValidCode=true', () => {
      const state = citizenReportReducer(
        undefined,
        lookupPublicQrSuccess({ code: 'QR16CHARSCODE123', poleInfo: mockPublicQr })
      )
      expect(state.isLookingUp).toBe(false)
      expect(state.isValidCode).toBe(true)
      expect(state.currentPole).toEqual(mockPublicQr)
      expect(state.lookupError).toBeNull()
    })

    it('lookupPublicQrFailure lưu thông báo lỗi và đặt isValidCode=false', () => {
      const state = citizenReportReducer(
        undefined,
        lookupPublicQrFailure('Mã QR tem cột đèn này không tồn tại hoặc đã bị thu hồi.')
      )
      expect(state.isLookingUp).toBe(false)
      expect(state.isValidCode).toBe(false)
      expect(state.lookupError).toBe('Mã QR tem cột đèn này không tồn tại hoặc đã bị thu hồi.')
      expect(state.currentPole).toBeNull()
    })

    it('submitReportRequest đặt cờ isSubmitting=true và reset submitError', () => {
      const payload: PublicReportSubmitPayload = {
        code: 'QR16CHARSCODE123',
        kind: 'lamp_out',
        description: 'Đèn chiếu sáng bị tắt hoàn toàn',
      }
      const state = citizenReportReducer(undefined, submitReportRequest(payload))
      expect(state.isSubmitting).toBe(true)
      expect(state.submitError).toBeNull()
    })

    it('submitReportSuccess lưu submissionResult và tắt cờ isSubmitting', () => {
      const state = citizenReportReducer(undefined, submitReportSuccess(mockReceipt))
      expect(state.isSubmitting).toBe(false)
      expect(state.submissionResult).toEqual(mockReceipt)
      expect(state.submitError).toBeNull()
    })

    it('submitReportFailure ghi nhận lỗi submitError và tắt cờ isSubmitting', () => {
      const state = citizenReportReducer(undefined, submitReportFailure('Lỗi 500: Server bận'))
      expect(state.isSubmitting).toBe(false)
      expect(state.submitError).toBe('Lỗi 500: Server bận')
    })

    it('resetReportState đưa submitError và submissionResult về rỗng', () => {
      const dirtyState = citizenReportReducer(
        undefined,
        submitReportFailure('Lỗi submit trước')
      )
      const cleanState = citizenReportReducer(dirtyState, resetReportState())
      expect(cleanState.isSubmitting).toBe(false)
      expect(cleanState.submitError).toBeNull()
      expect(cleanState.submissionResult).toBeNull()
    })
  })

  // ==========================================
  // TẦNG 4: PAGE HAPPY PATH - FORM FLOW & INTERACTION
  // ==========================================
  describe('4. Happy Path - CitizenReportPage Interaction Flow', () => {
    it('Instant Render: hiển thị ngay giao diện form và 4 danh mục hiện trạng sự cố', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
        }),
      })

      // Thông tin vị trí cột đèn hợp lệ
      expect(screen.getByText('Đường Tỉnh Lộ 8 (Đoạn Cầu Tân Quy)')).toBeInTheDocument()
      expect(screen.getByText('Xã Tân Thạnh Đông')).toBeInTheDocument()

      // 4 danh mục hiện trạng sự cố
      expect(screen.getByText('Đèn tắt hoàn toàn / Mất chiếu sáng')).toBeInTheDocument()
      expect(screen.getByText('Đèn sáng yếu / Chập chờn')).toBeInTheDocument()
      expect(screen.getByText('Cột đèn nghiêng / Nguy cơ gãy đổ')).toBeInTheDocument()
      expect(screen.getByText('Hở dây điện / Sự cố nguy hiểm khác')).toBeInTheDocument()
    })

    it('chuyển đổi danh mục sự cố cập nhật trạng thái chọn viền xanh', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
        }),
      })

      const tiltOption = screen.getByText('Cột đèn nghiêng / Nguy cơ gãy đổ')
      const tiltButton = tiltOption.closest('button')
      expect(tiltButton).not.toBeNull()

      fireEvent.click(tiltButton!)
      expect(tiltButton).toHaveClass('border-blue-600')
    })

    it('nhập form hợp lệ và gửi phản ánh thành công, dispatch đúng action submitReportRequest', () => {
      const store = createTestStore({
        autoResolvePole: mockPublicQr,
      })
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      renderWithProviders(<CitizenReportPage />, { store })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, {
        target: { value: 'Bóng đèn chiếu sáng tại cột này đã tắt hẳn 3 ngày nay, đường rất tối.' },
      })

      const nameInput = screen.getByPlaceholderText(/Họ và tên của bạn/i)
      fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Dân' } })

      const phoneInput = screen.getByPlaceholderText(/Số điện thoại liên hệ/i)
      fireEvent.change(phoneInput, { target: { value: '0901234567' } })

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: submitReportRequest.type,
          payload: expect.objectContaining({
            code: 'QR12345678901234',
            kind: 'lamp_out',
            description: expect.stringContaining('Bóng đèn chiếu sáng tại cột này đã tắt hẳn 3 ngày nay, đường rất tối.'),
          }),
        })
      )
    })

    it('hiển thị ReportSuccessModal khi submissionResult có dữ liệu', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
          initialState: {
            submissionResult: mockReceipt,
          },
        }),
      })

      expect(screen.getByText('Gửi Phản Ánh Thành Công!')).toBeInTheDocument()
      expect(screen.getByText('op-20261013-abcd-1234')).toBeInTheDocument()
    })
  })

  // ==========================================
  // TẦNG 5: EMPTY STATE & EDGE CASES
  // ==========================================
  describe('5. Empty States & Edge Cases', () => {
    it('Vô hiệu hóa nút gửi và hiển thị cảnh báo khi mã QR không hợp lệ (404/revoked)', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoFailLookupError: 'Mã QR tem cột đèn này không tồn tại trong hệ thống hoặc đã bị thu hồi.',
        }),
      })

      expect(screen.getByText('Mã không hợp lệ')).toBeInTheDocument()
      const disabledBtn = screen.getByRole('button', {
        name: /Mã QR không hợp lệ - Không thể gửi/i,
      })
      expect(disabledBtn).toBeDisabled()
    })

    it('chặn gửi khi mô tả sự cố dưới 5 ký tự và hiển thị lỗi cụ thể', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
        }),
      })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, { target: { value: 'Đèn' } })

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(
        screen.getByText('Vui lòng nhập mô tả sự cố cụ thể hơn (tối thiểu 5 ký tự).')
      ).toBeInTheDocument()
    })

    it('chặn gửi khi số điện thoại không hợp lệ', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
        }),
      })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, {
        target: { value: 'Đèn đường bị tắt hoàn toàn gây nguy hiểm' },
      })

      const phoneInput = screen.getByPlaceholderText(/Số điện thoại liên hệ/i)
      fireEvent.change(phoneInput, { target: { value: '0123456789' } })

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(
        screen.getByText(
          'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (10 chữ số, VD: 0901234567) hoặc để trống.'
        )
      ).toBeInTheDocument()
    })

    it('chặn gửi khi mất kết nối mạng và hiển thị cảnh báo offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      })

      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPublicQr,
        }),
      })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, {
        target: { value: 'Đèn đường bị hở dây điện nguy hiểm người đi đường' },
      })

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(
        screen.getByText(
          'Không có kết nối mạng. Vui lòng kiểm tra lại Wifi/4G trên điện thoại và thử gửi lại.'
        )
      ).toBeInTheDocument()
    })
  })

  // ==========================================
  // TẦNG 6: ERROR CASES - SIMULATE API 400 / 404 / 500
  // ==========================================
  describe('6. Error Cases - API 400, 404, 500 Handling', () => {
    it('xử lý an toàn khi Backend trả về lỗi 400 Bad Request lúc submit', () => {
      const store = createTestStore({
        initialState: {
          currentPole: mockPublicQr,
          isValidCode: true,
          isSubmitting: true,
        },
      })

      store.dispatch(submitReportFailure('Dữ liệu phản ánh không hợp lệ (Lỗi 400). Vui lòng thử lại.'))

      const state = store.getState().citizenReport
      expect(state.isSubmitting).toBe(false)
      expect(state.submitError).toBe('Dữ liệu phản ánh không hợp lệ (Lỗi 400). Vui lòng thử lại.')
      expect(state.submissionResult).toBeNull()
    })

    it('xử lý an toàn khi Backend trả về lỗi 404 lúc lookup mã tem QR', () => {
      const store = createTestStore({
        initialState: {
          code: 'NON_EXISTENT_QR',
          isLookingUp: true,
        },
      })

      store.dispatch(lookupPublicQrFailure('Không tìm thấy thông tin trụ đèn tương ứng (404)'))

      const state = store.getState().citizenReport
      expect(state.isLookingUp).toBe(false)
      expect(state.isValidCode).toBe(false)
      expect(state.currentPole).toBeNull()
      expect(state.lookupError).toBe('Không tìm thấy thông tin trụ đèn tương ứng (404)')
    })

    it('xử lý an toàn khi Backend trả về lỗi 500 hoặc Timeout 10 giây', () => {
      const store = createTestStore({
        initialState: {
          currentPole: mockPublicQr,
          isValidCode: true,
          isSubmitting: true,
        },
      })

      store.dispatch(
        submitReportFailure(
          'Kết nối mạng quá chậm hoặc không ổn định. Vui lòng kiểm tra 4G/Wifi và gửi lại phản ánh.'
        )
      )

      const state = store.getState().citizenReport
      expect(state.isSubmitting).toBe(false)
      expect(state.submitError).toContain('Kết nối mạng quá chậm hoặc không ổn định')
    })
  })
})
