import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserFilterToolbar, UserFilterToolbarProps } from '../../../../pages/users/components/UserFilterToolbar'
import adminUserReducer, {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  createUserRequest,
  createUserFailure,
  setFilters,
} from '../../../../feature/users/userSlice'
import type {
  UserAccountItem,
  UserAccountItemPagedResult,
  CreateUserRequest,
} from '../../../../types/admin/users'
import type { UserRole } from '../../../../types/common/enums'
import { USER_ROLE_LABELS } from '../../../../constants/enums'

describe('UserFilterToolbar & Admin Page Data Flow (src/test/pages/users/)', () => {
  const defaultProps: UserFilterToolbarProps = {
    searchTerm: '',
    selectedRole: '',
    selectedStatus: '',
    onSearchChange: vi.fn(),
    onRoleChange: vi.fn(),
    onStatusChange: vi.fn(),
    onOpenCreateModal: vi.fn(),
  }

  describe('1. Happy Path - Component Rendering & Interactions', () => {
    it('render đầy đủ thanh tìm kiếm, các dropdown bộ lọc và nút thêm người dùng', () => {
      render(<UserFilterToolbar {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Tìm theo họ tên, tài khoản, email...')
      expect(searchInput).toBeInTheDocument()

      expect(screen.getByText('Tất cả vai trò')).toBeInTheDocument()
      expect(screen.getByText('Tất cả trạng thái')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Thêm người dùng/i })).toBeInTheDocument()
    })

    it('áp dụng class responsive mới max-w-full md:max-w-2xl cho search container', () => {
      const { container } = render(<UserFilterToolbar {...defaultProps} />)

      const searchContainer = container.querySelector('.relative.flex-1')
      expect(searchContainer).not.toBeNull()
      expect(searchContainer).toHaveClass('max-w-full')
      expect(searchContainer).toHaveClass('md:max-w-2xl')
    })

    it('kích hoạt onSearchChange khi người dùng nhập từ khóa tìm kiếm', () => {
      const onSearchChangeMock = vi.fn()
      render(<UserFilterToolbar {...defaultProps} onSearchChange={onSearchChangeMock} />)

      const searchInput = screen.getByPlaceholderText('Tìm theo họ tên, tài khoản, email...')
      fireEvent.change(searchInput, { target: { value: 'Nguyen Van A' } })

      expect(onSearchChangeMock).toHaveBeenCalledWith('Nguyen Van A')
    })

    it('hiển thị nút xóa (X) khi searchTerm có giá trị và click xóa sẽ gọi onSearchChange với chuỗi rỗng', () => {
      const onSearchChangeMock = vi.fn()
      render(
        <UserFilterToolbar
          {...defaultProps}
          searchTerm="admin"
          onSearchChange={onSearchChangeMock}
        />
      )

      const clearButton = screen.getByTitle('Xóa tìm kiếm')
      expect(clearButton).toBeInTheDocument()

      fireEvent.click(clearButton)
      expect(onSearchChangeMock).toHaveBeenCalledWith('')
    })

    it('kích hoạt onRoleChange khi người dùng thay đổi vai trò trong dropdown', () => {
      const onRoleChangeMock = vi.fn()
      render(<UserFilterToolbar {...defaultProps} onRoleChange={onRoleChangeMock} />)

      const roleSelect = screen.getByDisplayValue('Tất cả vai trò')
      const targetRoleKey = Object.keys(USER_ROLE_LABELS)[0] || 'manager'
      fireEvent.change(roleSelect, { target: { value: targetRoleKey } })

      expect(onRoleChangeMock).toHaveBeenCalledWith(targetRoleKey)
    })

    it('kích hoạt onStatusChange khi người dùng chọn trạng thái active hoặc locked', () => {
      const onStatusChangeMock = vi.fn()
      render(<UserFilterToolbar {...defaultProps} onStatusChange={onStatusChangeMock} />)

      const statusSelect = screen.getByDisplayValue('Tất cả trạng thái')
      fireEvent.change(statusSelect, { target: { value: 'locked' } })

      expect(onStatusChangeMock).toHaveBeenCalledWith('locked')
    })

    it('kích hoạt onOpenCreateModal khi click nút "Thêm người dùng"', () => {
      const onOpenCreateModalMock = vi.fn()
      render(<UserFilterToolbar {...defaultProps} onOpenCreateModal={onOpenCreateModalMock} />)

      const addButton = screen.getByRole('button', { name: /Thêm người dùng/i })
      fireEvent.click(addButton)

      expect(onOpenCreateModalMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('2. Edge Cases - Input biên & Dữ liệu rỗng/null', () => {
    it('nút xóa (X) không xuất hiện khi searchTerm là chuỗi rỗng', () => {
      render(<UserFilterToolbar {...defaultProps} searchTerm="" />)
      expect(screen.queryByTitle('Xóa tìm kiếm')).toBeNull()
    })

    it('xử lý an toàn khi searchTerm chứa ký tự đặc biệt và khoảng trắng', () => {
      const onSearchChangeMock = vi.fn()
      render(
        <UserFilterToolbar
          {...defaultProps}
          searchTerm="   @#$%^&*()   "
          onSearchChange={onSearchChangeMock}
        />
      )

      const searchInput = screen.getByPlaceholderText(
        'Tìm theo họ tên, tài khoản, email...'
      ) as HTMLInputElement
      expect(searchInput.value).toBe('   @#$%^&*()   ')

      fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      expect(onSearchChangeMock).toHaveBeenCalledWith('test@example.com')
    })

    it('xử lý Redux state an toàn khi Backend trả về danh sách người dùng rỗng (items: [])', () => {
      const initialState = adminUserReducer(undefined, { type: '@@INIT' })
      const emptyPayload: UserAccountItemPagedResult = {
        page: 1,
        page_size: 10,
        total: 0,
        items: [],
      }

      const nextState = adminUserReducer(initialState, fetchUsersSuccess(emptyPayload))
      expect(nextState.users).toEqual([])
      expect(nextState.total).toBe(0)
      expect(nextState.isLoading).toBe(false)
      expect(nextState.error).toBeNull()
    })

    it('xử lý Redux state an toàn khi Backend trả về items là null/undefined', () => {
      const initialState = adminUserReducer(undefined, { type: '@@INIT' })
      const nullishPayload: UserAccountItemPagedResult = {
        page: 1,
        page_size: 10,
        total: 0,
        items: undefined,
      }

      const nextState = adminUserReducer(initialState, fetchUsersSuccess(nullishPayload))
      expect(nextState.users).toEqual([])
      expect(nextState.error).toBeNull()
    })

    it('cập nhật filter và tự động reset page về 1 khi dispatch setFilters', () => {
      const initialState = {
        ...adminUserReducer(undefined, { type: '@@INIT' }),
        page: 5,
      }

      const nextState = adminUserReducer(
        initialState,
        setFilters({ search: 'luxmap', role: 'field_engineer' })
      )

      expect(nextState.filters.search).toBe('luxmap')
      expect(nextState.filters.role).toBe('field_engineer')
      expect(nextState.page).toBe(1)
    })
  })

  describe('3. Error Cases - Giả lập Backend trả về lỗi 400, 422, 500', () => {
    it('bắt lỗi 400 (Bad Request) an toàn khi tải danh sách người dùng thất bại', () => {
      const loadingState = adminUserReducer(undefined, fetchUsersRequest())
      expect(loadingState.isLoading).toBe(true)

      const error400Msg = 'Yêu cầu không hợp lệ. Tham số lọc sai định dạng (HTTP 400)'
      const errorState = adminUserReducer(loadingState, fetchUsersFailure(error400Msg))

      expect(errorState.isLoading).toBe(false)
      expect(errorState.error).toBe(error400Msg)
      expect(errorState.users).toEqual([])
    })

    it('bắt lỗi 422 (Unprocessable Entity / Validation Error) khi tạo người dùng thất bại với DTO chuẩn', () => {
      const targetRole: UserRole = 'field_engineer'
      const mockNewUser: CreateUserRequest = {
        username: 'existing_user',
        email: 'exist@luxmap.vn',
        full_name: 'Nguyen Van Exist',
        role: targetRole,
        commune_ids: ['commune-01'],
      }

      const submittingState = adminUserReducer(undefined, createUserRequest(mockNewUser))
      expect(submittingState.isSubmitting).toBe(true)
      expect(submittingState.actionError).toBeNull()

      const error422Msg = 'Lỗi xác thực dữ liệu: Tên đăng nhập đã tồn tại trong hệ thống (HTTP 422)'
      const errorState = adminUserReducer(submittingState, createUserFailure(error422Msg))

      expect(errorState.isSubmitting).toBe(false)
      expect(errorState.actionError).toBe(error422Msg)
      expect(errorState.actionSuccessMessage).toBeNull()
    })

    it('bắt lỗi 500 (Internal Server Error) an toàn và không làm mất dữ liệu hiện có', () => {
      const existingUser: UserAccountItem = {
        user_id: 'usr-101',
        username: 'engineer_01',
        email: 'engineer@luxmap.vn',
        full_name: 'Tran Van Engineer',
        role: 'field_engineer',
        status: 'active',
        commune_ids: ['commune-01'],
      }

      const stateWithData = {
        ...adminUserReducer(undefined, { type: '@@INIT' }),
        users: [existingUser],
        total: 1,
        isLoading: true,
      }

      const error500Msg = 'Lỗi máy chủ nội bộ. Vui lòng liên hệ quản trị viên (HTTP 500)'
      const failureState = adminUserReducer(stateWithData, fetchUsersFailure(error500Msg))

      expect(failureState.isLoading).toBe(false)
      expect(failureState.error).toBe(error500Msg)
      // Dữ liệu cũ vẫn được bảo toàn an toàn, tránh crash giao diện người dùng
      expect(failureState.users).toHaveLength(1)
      expect(failureState.users[0].user_id).toBe('usr-101')
    })
  })
})
