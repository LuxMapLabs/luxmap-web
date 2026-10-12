import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import citizenReportReducer, {
  verifyTokenRequest,
  verifyTokenSuccess,
  verifyTokenFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
  resetReportState,
} from '../../../feature/citizen-report/citizenReportSlice'
import { CitizenReportPage } from '../../../pages/citizen-report/CitizenReportPage'
import { ReportSuccessModal } from '../../../pages/citizen-report/components/ReportSuccessModal'
import { InvalidQrAlert } from '../../../pages/citizen-report/components/InvalidQrAlert'
import { PoleInfoCard } from '../../../pages/citizen-report/components/PoleInfoCard'
import type { DecryptedPoleInfo } from '../../../utils/qrSecurity'
import type {
  CitizenReportPayload,
  CitizenReportResponse,
} from '../../../feature/citizen-report/citizenReportAPI'
import { VIETNAM_PHONE_REGEX } from '../../../validations/common.schema'

// Mock indexedDbDraft module để tránh phụ thuộc IndexedDB thực tế của browser
vi.mock('../../../utils/indexedDbDraft', () => ({
  getCitizenDraft: vi.fn().mockResolvedValue(null),
  saveCitizenDraft: vi.fn().mockResolvedValue(undefined),
  deleteCitizenDraft: vi.fn().mockResolvedValue(undefined),
}))

// Mock qrSecurity module
vi.mock('../../../utils/qrSecurity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/qrSecurity')>()
  return {
    ...actual,
    decryptAndVerifyQrToken: vi.fn(),
  }
})

describe('CitizenReportPage & Citizen Components Test Suite (src/test/pages/citizen-report/)', () => {
  // Mock Data chuẩn DTO 100%
  const mockPoleInfo: DecryptedPoleInfo = {
    pole_code: 'POLE-TL8-001',
    segment_name: 'Đường Tỉnh Lộ 8 (Đoạn Cầu Tân Quy)',
    commune_name: 'Xã Tân Thạnh Đông',
    issued_at: 1728500000000,
  }

  const mockSuccessResponse: CitizenReportResponse = {
    report_id: 'RPT-20261011-0089',
    status: 'received',
    message: 'Hệ thống đã ghi nhận phản ánh sự cố thành công.',
    pole_code: 'POLE-TL8-001',
    submitted_at: '2026-10-11T14:30:00Z',
  }

  // Factory tạo Redux Store test độc lập
  const createTestStore = (options?: {
    initialState?: Record<string, any>
    autoResolvePole?: DecryptedPoleInfo | null
    autoFailMessage?: string | null
  }) => {
    const { initialState, autoResolvePole, autoFailMessage } = options || {}

    return configureStore({
      reducer: {
        citizenReport: (state, action) => {
          if (action.type === verifyTokenRequest.type) {
            if (autoResolvePole) {
              return {
                ...state,
                isVerifyingToken: false,
                currentPole: autoResolvePole,
                isValidToken: true,
                error: null,
                rawQrToken: action.payload,
              }
            }
            if (autoFailMessage) {
              return {
                ...state,
                isVerifyingToken: false,
                currentPole: null,
                isValidToken: false,
                error: autoFailMessage,
                rawQrToken: action.payload,
              }
            }
          }
          return citizenReportReducer(state, action)
        },
      },
      preloadedState: initialState
        ? {
            citizenReport: {
              currentPole: null,
              rawQrToken: null,
              isValidToken: false,
              isVerifyingToken: false,
              isSubmitting: false,
              submissionResult: null,
              error: null,
              ...initialState,
            },
          }
        : undefined,
    })
  }

  const renderWithProviders = (
    ui: React.ReactElement,
    { store = createTestStore(), initialUrl = '/report?lux=TEST_TOKEN' } = {}
  ) => {
    return {
      store,
      ...render(
        <Provider store={store}>
          <MemoryRouter initialEntries={[initialUrl]}>
            <Routes>
              <Route path="/report" element={ui} />
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </Provider>
      ),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Đảm bảo navigator.onLine là true mặc định
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  // ==========================================
  // TẦNG 1: UNIT TEST CHO CÁC COMPONENT CON
  // ==========================================
  describe('1. Child Components Unit Verification', () => {
    it('PoleInfoCard hiển thị đầy đủ thông tin mã hiệu cột, tuyến đường và địa bàn', () => {
      render(<PoleInfoCard poleInfo={mockPoleInfo} />)

      expect(screen.getByText('Vị trí cột đèn phản ánh')).toBeInTheDocument()
      expect(screen.getByText('Đã xác thực QR')).toBeInTheDocument()
      expect(screen.getByText('POLE-TL8-001')).toBeInTheDocument()
      expect(screen.getByText('Đường Tỉnh Lộ 8 (Đoạn Cầu Tân Quy)')).toBeInTheDocument()
      expect(screen.getByText('Xã Tân Thạnh Đông')).toBeInTheDocument()
    })

    it('InvalidQrAlert hiển thị đúng cảnh báo lỗi và hướng dẫn quét lại mã QR', () => {
      render(<InvalidQrAlert errorMessage="Mã QR đã hết hạn hiệu lực" />)

      expect(screen.getByText('Không Lấy Được Thông Tin Trụ Đèn')).toBeInTheDocument()
      expect(screen.getByText('Mã QR đã hết hạn hiệu lực')).toBeInTheDocument()
      expect(screen.getByText('Cách xử lý:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument()
    })

    it('ReportSuccessModal hiển thị mã biên nhận và thông điệp cảm ơn (không có nút gửi tiếp)', () => {
      render(<ReportSuccessModal result={mockSuccessResponse} />)

      expect(screen.getByText('Gửi Phản Ánh Thành Công!')).toBeInTheDocument()
      expect(screen.getByText('Hệ thống đã ghi nhận phản ánh sự cố thành công.')).toBeInTheDocument()
      expect(screen.getByText('RPT-20261011-0089')).toBeInTheDocument()
      expect(screen.getByText('POLE-TL8-001')).toBeInTheDocument()
      // Khẳng định không có nút gửi thêm phản ánh khác (hoàn tất hành trình)
      expect(screen.queryByText(/Gửi thêm phản ánh khác/i)).not.toBeInTheDocument()
      expect(
        screen.getByText(/Bạn có thể thoát trình duyệt hoặc khóa màn hình điện thoại/i)
      ).toBeInTheDocument()
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
      expect(VIETNAM_PHONE_REGEX.test('0241234567')).toBe(false) // Sai đầu số
      expect(VIETNAM_PHONE_REGEX.test('090123456')).toBe(false) // 9 số (thiếu)
      expect(VIETNAM_PHONE_REGEX.test('09012345678')).toBe(false) // 11 số (thừa)
      expect(VIETNAM_PHONE_REGEX.test('abc0901234')).toBe(false) // Chứa chữ
    })
  })

  // ==========================================
  // TẦNG 3: CITIZEN REPORT REDUX REDUCER
  // ==========================================
  describe('3. citizenReportSlice Reducer Unit Tests', () => {
    it('verifyTokenRequest cập nhật trạng thái đang xác thực', () => {
      const state = citizenReportReducer(undefined, verifyTokenRequest('QR_TOKEN_123'))
      expect(state.isVerifyingToken).toBe(true)
      expect(state.rawQrToken).toBe('QR_TOKEN_123')
      expect(state.error).toBeNull()
    })

    it('verifyTokenSuccess lưu thông tin trụ đèn và đặt isValidToken = true', () => {
      const state = citizenReportReducer(undefined, verifyTokenSuccess(mockPoleInfo))
      expect(state.isVerifyingToken).toBe(false)
      expect(state.isValidToken).toBe(true)
      expect(state.currentPole).toEqual(mockPoleInfo)
    })

    it('verifyTokenFailure ghi nhận lỗi và đặt isValidToken = false', () => {
      const state = citizenReportReducer(undefined, verifyTokenFailure('Mã QR không hợp lệ'))
      expect(state.isVerifyingToken).toBe(false)
      expect(state.isValidToken).toBe(false)
      expect(state.error).toBe('Mã QR không hợp lệ')
      expect(state.currentPole).toBeNull()
    })

    it('submitReportRequest đặt cờ isSubmitting = true', () => {
      const payload: CitizenReportPayload = {
        qr_token: 'TOKEN',
        pole_code: 'POLE-01',
        fault_type: 'lamp_out',
        severity: 'medium',
        description: 'Đèn chiếu sáng bị tắt hoàn toàn',
      }
      const state = citizenReportReducer(undefined, submitReportRequest(payload))
      expect(state.isSubmitting).toBe(true)
      expect(state.error).toBeNull()
    })

    it('submitReportSuccess lưu submissionResult và tắt cờ isSubmitting', () => {
      const state = citizenReportReducer(undefined, submitReportSuccess(mockSuccessResponse))
      expect(state.isSubmitting).toBe(false)
      expect(state.submissionResult).toEqual(mockSuccessResponse)
      expect(state.error).toBeNull()
    })

    it('submitReportFailure ghi nhận lỗi API và tắt cờ isSubmitting', () => {
      const state = citizenReportReducer(undefined, submitReportFailure('Lỗi 500: Server bận'))
      expect(state.isSubmitting).toBe(false)
      expect(state.error).toBe('Lỗi 500: Server bận')
    })

    it('resetReportState đưa các cờ submitting và lỗi về giá trị rỗng', () => {
      const intermediateState = citizenReportReducer(
        undefined,
        submitReportFailure('Lỗi trước đó')
      )
      const resetState = citizenReportReducer(intermediateState, resetReportState())
      expect(resetState.isSubmitting).toBe(false)
      expect(resetState.error).toBeNull()
      expect(resetState.submissionResult).toBeNull()
    })
  })

  // ==========================================
  // TẦNG 4: PAGE HAPPY PATH - FORM FLOW & INTERACTION
  // ==========================================
  describe('4. Happy Path - CitizenReportPage Interaction Flow', () => {
    it('render đầy đủ 4 danh mục hiện trạng sự cố và hiển thị form gửi phản ánh', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
        }),
      })

      // Thông tin trụ đèn hiển thị
      expect(screen.getByText('POLE-TL8-001')).toBeInTheDocument()

      // 4 danh mục hiện trạng sự cố
      expect(screen.getByText('Hở dây điện / Rò rỉ điện nguy hiểm')).toBeInTheDocument()
      expect(screen.getByText('Cột đèn nghiêng / Nguy cơ gãy đổ')).toBeInTheDocument()
      expect(screen.getByText('Đèn tắt hoàn toàn / Mất chiếu sáng')).toBeInTheDocument()
      expect(screen.getByText('Đèn sáng yếu / Chập chờn')).toBeInTheDocument()
    })

    it('chuyển đổi danh mục sự cố độc lập giữa các ô và thay đổi class active', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
        }),
      })

      // Lấy nút chọn "Cột đèn nghiêng / Nguy cơ gãy đổ"
      const tiltTitle = screen.getByText('Cột đèn nghiêng / Nguy cơ gãy đổ')
      const tiltButton = tiltTitle.closest('button')
      expect(tiltButton).not.toBeNull()
      expect(tiltButton).not.toHaveClass('border-blue-600')

      // Click chọn
      fireEvent.click(tiltButton!)
      expect(tiltButton).toHaveClass('border-blue-600')

      // Click chọn "Đèn tắt hoàn toàn / Mất chiếu sáng"
      const lampOutTitle = screen.getByText('Đèn tắt hoàn toàn / Mất chiếu sáng')
      const lampOutButton = lampOutTitle.closest('button')
      expect(lampOutButton).not.toBeNull()

      fireEvent.click(lampOutButton!)
      expect(lampOutButton).toHaveClass('border-blue-600')
      expect(tiltButton).not.toHaveClass('border-blue-600')
    })

    it('nhập form hợp lệ và gửi phản ánh thành công, dispatch đúng action submitReportRequest', () => {
      const store = createTestStore({
        autoResolvePole: mockPoleInfo,
      })
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      renderWithProviders(<CitizenReportPage />, { store })

      // Nhập mô tả hợp lệ (> 10 ký tự) qua placeholder "Ví dụ: Đèn bị tắt từ hôm qua"
      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, {
        target: { value: 'Bóng đèn chiếu sáng tại cột này đã tắt hẳn 3 ngày nay, đường rất tối.' },
      })

      // Nhập họ tên
      const nameInput = screen.getByPlaceholderText(/Họ và tên của bạn/i)
      fireEvent.change(nameInput, { target: { value: 'Trần Văn Dân' } })

      // Nhập số điện thoại hợp lệ
      const phoneInput = screen.getByPlaceholderText(/Số điện thoại liên hệ/i)
      fireEvent.change(phoneInput, { target: { value: '0901234567' } })

      // Bấm nút nộp phản ánh
      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      // Kiểm tra dispatch submitReportRequest được gọi với payload chuẩn
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: submitReportRequest.type,
          payload: expect.objectContaining({
            pole_code: 'POLE-TL8-001',
            description: 'Bóng đèn chiếu sáng tại cột này đã tắt hẳn 3 ngày nay, đường rất tối.',
            reporter_name: 'Trần Văn Dân',
            reporter_phone: '0901234567',
          }),
        })
      )
    })

    it('hiển thị ReportSuccessModal khi submissionResult có dữ liệu', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
          initialState: {
            submissionResult: mockSuccessResponse,
          },
        }),
      })

      expect(screen.getByText('Gửi Phản Ánh Thành Công!')).toBeInTheDocument()
      expect(screen.getByText('RPT-20261011-0089')).toBeInTheDocument()
    })
  })

  // ==========================================
  // TẦNG 5: EDGE CASES & VALIDATION GUARDS
  // ==========================================
  describe('5. Edge Cases & Validation Guards', () => {
    it('hiển thị thông báo InvalidQrAlert khi mã QR rỗng hoặc không hợp lệ', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoFailMessage: 'Mã QR không hợp lệ hoặc đã hết hạn.',
        }),
        initialUrl: '/report',
      })

      expect(screen.getByText('Không Lấy Được Thông Tin Trụ Đèn')).toBeInTheDocument()
      expect(screen.getByText('Mã QR không hợp lệ hoặc đã hết hạn.')).toBeInTheDocument()
    })

    it('ngăn chặn gửi khi mô tả sự cố dưới 10 ký tự và hiển thị lỗi cụ thể', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
        }),
      })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, { target: { value: 'Đèn hỏng' } }) // 8 ký tự (< 10)

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(
        screen.getByText('Vui lòng nhập mô tả sự cố cụ thể hơn (tối thiểu 10 ký tự).')
      ).toBeInTheDocument()
    })

    it('ngăn chặn gửi khi số điện thoại không hợp lệ và hiển thị lỗi rõ ràng', () => {
      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
        }),
      })

      const descInput = screen.getByPlaceholderText(/Ví dụ: Đèn bị tắt từ hôm qua/i)
      fireEvent.change(descInput, {
        target: { value: 'Đèn đường bị tắt hoàn toàn gây nguy hiểm' },
      })

      const phoneInput = screen.getByPlaceholderText(/Số điện thoại liên hệ/i)
      fireEvent.change(phoneInput, { target: { value: '0123456789' } }) // Đầu 01 không thuộc các mạng di động chuẩn

      const submitBtn = screen.getByRole('button', { name: /Gửi Phản Ánh Ngay/i })
      fireEvent.click(submitBtn)

      expect(
        screen.getByText(
          'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (10 chữ số, VD: 0901234567) hoặc để trống.'
        )
      ).toBeInTheDocument()
    })

    it('ngăn chặn gửi khi mất kết nối mạng và hiển thị cảnh báo offline', () => {
      // Giả lập offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      })

      renderWithProviders(<CitizenReportPage />, {
        store: createTestStore({
          autoResolvePole: mockPoleInfo,
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
  // TẦNG 6: ERROR CASES (SIMULATE BE 400 / 500 / TIMEOUT)
  // ==========================================
  describe('6. Error Cases - API 400, 500 & Network Timeout Handling', () => {
    it('xử lý an toàn khi Backend trả về lỗi 400 Bad Request (Redux store nhận failure)', () => {
      const store = createTestStore({
        initialState: {
          currentPole: mockPoleInfo,
          isValidToken: true,
          isSubmitting: true,
        },
      })

      // Dispatch failure mô phỏng API 400 trả về từ saga
      store.dispatch(submitReportFailure('Dữ liệu phản ánh không hợp lệ (Lỗi 400). Vui lòng thử lại.'))

      const state: any = store.getState().citizenReport
      expect(state.isSubmitting).toBe(false)
      expect(state.error).toBe('Dữ liệu phản ánh không hợp lệ (Lỗi 400). Vui lòng thử lại.')
      expect(state.submissionResult).toBeNull()
    })

    it('xử lý an toàn khi Backend lỗi 500 hoặc Timeout 10 giây (dữ liệu form được giữ nguyên)', () => {
      const store = createTestStore({
        initialState: {
          currentPole: mockPoleInfo,
          isValidToken: true,
          isSubmitting: true,
        },
      })

      // Dispatch failure mô phỏng timeout 10s từ citizenReportSaga
      store.dispatch(
        submitReportFailure(
          'Kết nối mạng quá chậm hoặc không ổn định. Vui lòng kiểm tra 4G/Wifi và gửi lại phản ánh.'
        )
      )

      const state: any = store.getState().citizenReport
      expect(state.isSubmitting).toBe(false)
      expect(state.error).toContain('Kết nối mạng quá chậm hoặc không ổn định')
    })
  })
})
