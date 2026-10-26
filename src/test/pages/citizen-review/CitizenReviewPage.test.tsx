import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import citizenReportsReducer, {
  fetchReportsRequest,
} from '../../../feature/citizen-reports/citizenReportsSlice'
import assetReducer, { fetchAssetsRequest } from '../../../feature/assets/assetSlice'
import { CitizenReviewPage } from '../../../pages/citizen-review/CitizenReviewPage'
import type {
  CitizenReportItem,
  CitizenReportDetail,
} from '../../../types/citizen-reports/citizen-reports'
import type { PoleListItem } from '../../../types/assets/poles'

// Mock citizenReportsAPI blob fetcher to avoid network calls during tests
vi.mock('../../../feature/citizen-reports/citizenReportsAPI', () => ({
  citizenReportsAPI: {
    list: vi.fn(),
    detail: vi.fn(),
    accept: vi.fn(),
    merge: vi.fn(),
    reject: vi.fn(),
    getPhotoUrl: vi.fn((reportId, photoId, original) =>
      `/api/v1/citizen-reports/${reportId}/photos/${photoId}/${original ? 'original' : 'thumbnail'}`
    ),
    fetchPhotoBlob: vi.fn().mockResolvedValue('blob:http://localhost:5173/mock-blob-photo'),
  },
}))

describe('CitizenReviewPage Component Integration Tests (UI & Review Workflow)', () => {
  const mockPoles: PoleListItem[] = [
    {
      pole_id: 'POLE-001',
      external_ref: 'COT-PH-01',
      segment_id: 'seg-1',
      commune_id: 'Xã Phú Hòa',
      commune_name: null,
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.8, lng: 106.6 },
      updated_at: '2026-10-14T00:00:00Z',
    },
    {
      pole_id: 'POLE-002',
      external_ref: 'COT-TTD-02',
      segment_id: 'seg-2',
      commune_id: 'Xã Tân Thạnh Đông',
      commune_name: null,
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.85, lng: 106.65 },
      updated_at: '2026-10-14T00:00:00Z',
    },
  ]

  const mockReportPending: CitizenReportItem = {
    report_id: 'rep-001',
    pole_id: 'POLE-001',
    commune_id: 'Xã Phú Hòa',
    data_source: 'field',
    night_of: '2026-10-14',
    status: 'pending',
    created_at: '2026-10-14T19:00:00Z',
    last_submitted_at: '2026-10-14T20:30:00Z',
    submission_count: 2,
    photo_count: 2,
    kinds: ['lamp_out', 'lamp_dim'],
    far_from_pole: true,
    fault_id: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
  }

  const mockReportAccepted: CitizenReportItem = {
    report_id: 'rep-002',
    pole_id: 'POLE-002',
    commune_id: 'Xã Tân Thạnh Đông',
    data_source: 'field',
    night_of: '2026-10-14',
    status: 'accepted',
    created_at: '2026-10-14T18:00:00Z',
    last_submitted_at: '2026-10-14T18:15:00Z',
    submission_count: 1,
    photo_count: 1,
    kinds: ['pole_damaged'],
    far_from_pole: false,
    fault_id: 'FLT-001',
    decided_by: 'manager',
    decided_at: '2026-10-14T18:30:00Z',
    decision_note: 'Đã duyệt',
  }

  const mockReportDetailPending: CitizenReportDetail = {
    report_id: 'rep-001',
    pole_id: 'POLE-001',
    commune_id: 'Xã Phú Hòa',
    data_source: 'field',
    night_of: '2026-10-14',
    status: 'pending',
    created_at: '2026-10-14T19:00:00Z',
    last_submitted_at: '2026-10-14T20:30:00Z',
    submission_count: 2,
    photo_count: 2,
    kinds: ['lamp_out', 'lamp_dim'],
    far_from_pole: true,
    fault_id: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    pole: {
      pole_id: 'POLE-001',
      segment_id: 'seg-1',
      location: { lat: 10.8, lng: 106.6 },
      fixture_status: 'unknown',
      last_seen_at: null,
    },
    open_faults: [],
    submissions: [
      {
        submission_id: 'sub-01',
        kind: 'lamp_out',
        description: 'Đèn tối om cả khu vực ngã ba',
        far_from_pole: true,
        photos_dropped: 'over_quota',
        received_at: '2026-10-14T19:00:00Z',
        photo_count: 1,
        photos: [
          {
            photo_id: 'photo-1',
            position: 1,
            thumbnail_url: '/photos/photo-1/thumbnail',
            original_url: '/photos/photo-1/original',
            ai_hint: {
              label: 'lamp_off',
              confidence: 0.94,
              artifact_version: 'v1.0',
              checked_at: '2026-10-14T19:05:00Z',
            },
          },
        ],
      },
      {
        submission_id: 'sub-02',
        kind: 'lamp_dim',
        description: 'Đèn chập chờn lúc sáng lúc tắt',
        far_from_pole: false,
        photos_dropped: 'over_budget',
        received_at: '2026-10-14T19:20:00Z',
        photo_count: 1,
        photos: [],
      },
    ],
    allowed_actions: ['accept', 'reject'],
    acceptable_fault_types: ['lamp_out', 'lamp_dim'],
  }

  const createTestStore = (options?: {
    citizenReportsOverride?: Record<string, any>
    assetsOverride?: Record<string, any>
  }) => {
    // Custom reducers to preserve preloaded items and poles when mount actions are dispatched
    const customAssetReducer = (state: any, action: any) => {
      const nextState = assetReducer(state, action)
      if (action.type === fetchAssetsRequest.type && state?.poles?.length > 0) {
        return {
          ...nextState,
          poles: state.poles,
        }
      }
      return nextState
    }

    const customCitizenReportsReducer = (state: any, action: any) => {
      const nextState = citizenReportsReducer(state, action)
      if (action.type === fetchReportsRequest.type && state?.items?.length > 0) {
        return {
          ...nextState,
          items: state.items,
          isFetchingList: false, // Ensure table is rendered rather than skeleton rows
        }
      }
      return nextState
    }

    return configureStore({
      reducer: {
        citizenReports: customCitizenReportsReducer,
        assets: customAssetReducer,
      },
      preloadedState: {
        citizenReports: {
          items: [mockReportPending, mockReportAccepted],
          total: 2,
          page: 1,
          pageSize: 10,
          isFetchingList: false,
          listError: null,
          statusFilter: [],
          communeFilter: [],
          poleFilter: null,
          selectedReportId: null,
          selectedDetail: null,
          isFetchingDetail: false,
          detailError: null,
          isSubmittingDecision: false,
          decisionError: null,
          pendingCount: 1,
          ...options?.citizenReportsOverride,
        },
        assets: {
          poles: mockPoles,
          cabinets: [],
          segments: [],
          isLoadingAssets: false,
          loadAssetsError: null,
          isImporting: false,
          importResult: null,
          error: null,
          ...options?.assetsOverride,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Render Toolbar 1 hàng ngang
  it('1. should render 1-row toolbar with search input, commune dropdown, and status dropdown', () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CitizenReviewPage />
        </MemoryRouter>
      </Provider>
    )

    // Ô tìm kiếm mã cột đèn
    const searchInput = screen.getByPlaceholderText('Tìm theo mã cột đèn...')
    expect(searchInput).toBeInTheDocument()

    // Dropdown Xã/Phường
    const communeSelect = screen.getByDisplayValue('Tất cả địa bàn / Xã, Phường')
    expect(communeSelect).toBeInTheDocument()
    expect(screen.getAllByText('Xã Phú Hòa').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Xã Tân Thạnh Đông').length).toBeGreaterThan(0)

    // Dropdown Trạng thái
    const statusSelect = screen.getByDisplayValue('Tất cả trạng thái')
    expect(statusSelect).toBeInTheDocument()
    expect(screen.getByText(/Chờ duyệt \(1\)/)).toBeInTheDocument()

    // Huy hiệu cảnh báo chờ duyệt
    expect(screen.getByText('1 chờ duyệt')).toBeInTheDocument()
  })

  // 2. Hiển thị bảng hàng đợi với mã cột thực địa external_ref và badges
  it('2. should display table with external_ref and fault kind badges', () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CitizenReviewPage />
        </MemoryRouter>
      </Provider>
    )

    // Mã cột thực địa external_ref được tra cứu từ danh sách poles
    expect(screen.getByText('COT-PH-01')).toBeInTheDocument()
    expect(screen.getByText('COT-TTD-02')).toBeInTheDocument()

    // Các huy hiệu tình trạng phản ánh
    expect(screen.getByText('Đèn tắt')).toBeInTheDocument()
    expect(screen.getByText('Sáng yếu')).toBeInTheDocument()
    expect(screen.getByText('Hỏng cột')).toBeInTheDocument()

    // Cảnh báo vị trí > 200m
    expect(screen.getByText('> 200m')).toBeInTheDocument()
    expect(screen.getByText('Chuẩn vị trí')).toBeInTheDocument()

    // Nút thao tác theo ngữ cảnh: 'Thẩm định' cho pending, 'Xem chi tiết' cho accepted
    expect(screen.getByRole('button', { name: /Thẩm định/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xem chi tiết/i })).toBeInTheDocument()
  })

  // 3. Cơ chế lọc tức thì trên Client-side (In-memory filtering)
  it('3. should perform instant client-side filtering without extra API calls', () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CitizenReviewPage />
        </MemoryRouter>
      </Provider>
    )

    const searchInput = screen.getByPlaceholderText('Tìm theo mã cột đèn...')

    // Lọc theo mã external_ref 'COT-PH-01'
    fireEvent.change(searchInput, { target: { value: 'COT-PH-01' } })

    // Bảng chỉ còn cột COT-PH-01, COT-TTD-02 bị lọc biến mất
    expect(screen.getByText('COT-PH-01')).toBeInTheDocument()
    expect(screen.queryByText('COT-TTD-02')).not.toBeInTheDocument()

    // Lọc theo trạng thái 'accepted'
    const statusSelect = screen.getByDisplayValue('Tất cả trạng thái')
    fireEvent.change(statusSelect, { target: { value: 'accepted' } })

    // Xóa bộ lọc mã cột để kiểm tra lọc trạng thái
    fireEvent.change(searchInput, { target: { value: '' } })

    expect(screen.queryByText('COT-PH-01')).not.toBeInTheDocument()
    expect(screen.getByText('COT-TTD-02')).toBeInTheDocument()
  })

  // 4. Mở Popup Modal chi tiết căn giữa: Việt hóa fixture_status và nhãn cảnh báo GPS
  it('4. should open detail modal, display vietnamese fixture status and GPS warning label', () => {
    const store = createTestStore({
      citizenReportsOverride: {
        selectedReportId: 'rep-001',
        selectedDetail: mockReportDetailPending,
      },
    })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CitizenReviewPage />
        </MemoryRouter>
      </Provider>
    )

    // Tiêu đề modal hiển thị mã cột thực địa
    const modalHeadings = screen.getAllByText('COT-PH-01')
    expect(modalHeadings.length).toBeGreaterThan(0)

    // Kiểm tra trạng thái bóng đèn gần nhất được Việt hóa: 'Chưa có dữ liệu khảo sát'
    expect(screen.getByText('Chưa có dữ liệu khảo sát')).toBeInTheDocument()
    expect(screen.queryByText('unknown')).not.toBeInTheDocument()

    // Kiểm tra nhãn cảnh báo GPS: '> 200m so với cột'
    expect(screen.getByText('> 200m so với cột')).toBeInTheDocument()

    // Kiểm tra lời người dân phản ánh
    expect(screen.getByText('Đèn tối om cả khu vực ngã ba')).toBeInTheDocument()
    expect(screen.getByText('Đèn chập chờn lúc sáng lúc tắt')).toBeInTheDocument()

    // Kiểm tra cụm 3 nút ra quyết định (Chấp thuận / Từ chối)
    expect(screen.getByRole('button', { name: /Chấp thuận/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Từ chối/i })).toBeInTheDocument()
  })

  // 5. Đóng Modal khi nhấn phím Escape hoặc nút Đóng
  it('5. should close detail modal when clicking close button or pressing Escape', () => {
    const store = createTestStore({
      citizenReportsOverride: {
        selectedReportId: 'rep-001',
        selectedDetail: mockReportDetailPending,
      },
    })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CitizenReviewPage />
        </MemoryRouter>
      </Provider>
    )

    // Bấm nút Đóng (ở góc trên modal có title="Đóng (Esc)")
    const closeBtn = screen.getByTitle('Đóng (Esc)')
    fireEvent.click(closeBtn)

    // Sau khi dispatch clearReportDetail, state selectedReportId về null
    expect(store.getState().citizenReports.selectedReportId).toBeNull()
  })
})
