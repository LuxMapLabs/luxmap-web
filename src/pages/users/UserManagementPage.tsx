import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../redux/rootReducer'
import type {
  UserAccountItem,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../types/admin/users'
import {
  fetchUsersRequest,
  createUserRequest,
  updateUserRequest,
  lockUserRequest,
  unlockUserRequest,
  inviteUserRequest,
  setFilters,
  setPage,
} from '../../feature/users/userSlice'
import { fetchCommunesRequest } from '../../feature/communes/communeSlice'
import { UserTable } from './components/UserTable'
import { UserFilterToolbar } from './components/UserFilterToolbar'
import { CreateUserModal } from './components/CreateUserModal'
import { EditUserModal } from './components/EditUserModal'
import { LockUserDialog } from './components/LockUserDialog'
import { TablePagination } from '../assets/components/common/TablePagination'

export const AdminManagementPage: React.FC = () => {
  const dispatch = useDispatch()

  const currentUser = useSelector((state: RootState) => state.auth.user)
  const {
    users,
    total,
    page,
    pageSize,
    isLoading,
    isSubmitting,
    invitingUserId,
    filters,
  } = useSelector((state: RootState) => state.adminUsers)

  // Local state for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccountItem | null>(null)
  const [lockingUser, setLockingUser] = useState<UserAccountItem | null>(null)

  // Tải danh mục địa bàn từ API Backend để map tên động
  useEffect(() => {
    dispatch(fetchCommunesRequest())
  }, [dispatch])

  // Tải danh sách người dùng khi mount hoặc khi filter thay đổi
  useEffect(() => {
    dispatch(
      fetchUsersRequest({
        role: filters.role || undefined,
        status: filters.status || undefined,
        page,
        page_size: pageSize,
      })
    )
  }, [dispatch, filters.role, filters.status, page, pageSize])

  // Lọc bỏ tài khoản đang đăng nhập (chính mình) và lọc theo từ khóa tìm kiếm (họ tên, username, email)
  const filteredUsers = useMemo(() => {
    const otherUsers = users.filter((u) => {
      if (!currentUser) return true
      const matchId =
        (currentUser.userId && u.user_id === currentUser.userId) ||
        (currentUser.id && u.user_id === currentUser.id)
      const matchUsername =
        currentUser.username &&
        u.username?.toLowerCase() === currentUser.username.toLowerCase()
      const matchEmail =
        currentUser.email &&
        u.email?.toLowerCase() === currentUser.email.toLowerCase()

      const isSelf = Boolean(matchId || matchUsername || matchEmail)
      return !isSelf
    })

    if (!filters.search.trim()) return otherUsers
    const query = filters.search.toLowerCase().trim()
    return otherUsers.filter((u) => {
      const matchName = (u.full_name || '').toLowerCase().includes(query)
      const matchUser = (u.username || '').toLowerCase().includes(query)
      const matchEmail = (u.email || '').toLowerCase().includes(query)
      return matchName || matchUser || matchEmail
    })
  }, [users, filters.search, currentUser])

  const handleCreateSubmit = (payload: CreateUserRequest) => {
    dispatch(createUserRequest(payload))
    setIsCreateModalOpen(false)
  }

  const handleEditSubmit = (id: string, payload: UpdateUserRequest) => {
    dispatch(updateUserRequest({ id, data: payload }))
    setEditingUser(null)
  }

  const handleConfirmToggleLock = () => {
    if (!lockingUser?.user_id) return
    if (lockingUser.status === 'locked') {
      dispatch(unlockUserRequest(lockingUser.user_id))
    } else {
      dispatch(lockUserRequest(lockingUser.user_id))
    }
    setLockingUser(null)
  }

  const handleInvite = (user: UserAccountItem) => {
    if (user.user_id && user.status === 'invited') {
      dispatch(inviteUserRequest(user.user_id))
    }
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-3.5">
        {/* Toolbar & Filter with Add User on the far right */}
        <UserFilterToolbar
          searchTerm={filters.search}
          selectedRole={filters.role}
          selectedStatus={filters.status}
          onSearchChange={(search) => dispatch(setFilters({ search }))}
          onRoleChange={(role) => dispatch(setFilters({ role }))}
          onStatusChange={(status) => dispatch(setFilters({ status }))}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* User Table */}
        <UserTable
          users={filteredUsers}
          isLoading={isLoading}
          invitingUserId={invitingUserId}
          onEdit={(user) => setEditingUser(user)}
          onToggleLock={(user) => setLockingUser(user)}
          onInvite={handleInvite}
        />

        {/* Pagination */}
        <TablePagination
          currentListLength={filteredUsers.length}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          unitLabel="tài khoản"
          isLoading={isLoading}
          onPageChange={(newPage) => dispatch(setPage(newPage))}
        />
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        isSubmitting={isSubmitting}
        onClose={() => setEditingUser(null)}
        onSubmit={handleEditSubmit}
      />

      <LockUserDialog
        isOpen={Boolean(lockingUser)}
        user={lockingUser}
        isSubmitting={isSubmitting}
        onClose={() => setLockingUser(null)}
        onConfirm={handleConfirmToggleLock}
      />
    </div>
  )
}

export const UserManagementPage = AdminManagementPage
export default UserManagementPage
