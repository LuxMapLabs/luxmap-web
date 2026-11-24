import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import type { RootState } from '../../redux/rootReducer'
import { updateCurrentUserProfile } from '../auth/authSlice'
import { userAPI as adminUserAPI, type UserQueryParams } from './userAPI'
import type {
  UserAccountItemPagedResult,
  UserAccountItem,
  CreateUserRequest,
  CreateUserResponse,
  ChangeUserEmailRequest,
  ChangeUserEmailResponse,
  InvitationResponse,
} from '../../types/admin/users'
import {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  createUserRequest,
  createUserSuccess,
  createUserFailure,
  updateUserRequest,
  updateUserSuccess,
  updateUserFailure,
  changeUserEmailRequest,
  changeUserEmailSuccess,
  changeUserEmailFailure,
  lockUserRequest,
  lockUserSuccess,
  lockUserFailure,
  unlockUserRequest,
  unlockUserSuccess,
  unlockUserFailure,
  inviteUserRequest,
  inviteUserSuccess,
  inviteUserFailure,
  type UpdateUserPayload,
} from './userSlice'

/**
 * Trích xuất thông điệp lỗi chuẩn từ backend ApiErrorResponse hoặc generic Axios error
 */
function getErrorMessage(error: any, fallback: string): string {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    fallback
  )
}

/**
 * Worker saga tải danh sách người dùng
 */
function* handleFetchUsers(action: PayloadAction<UserQueryParams | undefined>) {
  try {
    const result: UserAccountItemPagedResult = yield call(adminUserAPI.getUsers, action.payload)
    yield put(fetchUsersSuccess(result))
  } catch (error: any) {
    const errorMsg = getErrorMessage(
      error,
      'Không thể tải danh sách tài khoản người dùng từ hệ thống.'
    )
    yield put(fetchUsersFailure(errorMsg))
  }
}

/**
 * Worker saga tạo mới tài khoản
 */
function* handleCreateUser(action: PayloadAction<CreateUserRequest>) {
  try {
    const result: CreateUserResponse = yield call(adminUserAPI.createUser, action.payload)
    yield put(createUserSuccess(result))
    if (result?.invitation_sent === false) {
      toast.warning('Đã tạo tài khoản, nhưng máy chủ mail chưa gửi được thư mời. Hãy gửi lại lời mời.')
    } else {
      toast.success('Tạo tài khoản người dùng thành công!')
    }
    // Tải lại danh sách người dùng mới nhất
    yield put(fetchUsersRequest())
  } catch (error: any) {
    const errorMsg = getErrorMessage(error, 'Lỗi khi tạo tài khoản người dùng.')
    yield put(createUserFailure(errorMsg))
    toast.error(`Tạo tài khoản thất bại: ${errorMsg}`)
  }
}

/**
 * Worker saga cập nhật tài khoản
 */
function* handleUpdateUser(action: PayloadAction<UpdateUserPayload>) {
  const { id, data } = action.payload
  try {
    const result: UserAccountItem = yield call(adminUserAPI.updateUser, id, data)
    yield put(updateUserSuccess(result))
    const currentUserId: string | null | undefined = yield select(
      (state: RootState) => state.auth?.user?.user_id
    )
    if (currentUserId && result?.user_id === currentUserId) {
      yield put(updateCurrentUserProfile(result))
    }
    toast.success('Cập nhật thông tin tài khoản thành công!')
  } catch (error: any) {
    const errorMsg = getErrorMessage(error, 'Lỗi khi cập nhật tài khoản.')
    yield put(updateUserFailure(errorMsg))
    toast.error(`Cập nhật thất bại: ${errorMsg}`)
  }
}

/**
 * Worker saga đổi email tài khoản người dùng
 */
function* handleChangeUserEmail(
  action: PayloadAction<{ id: string; data: ChangeUserEmailRequest }>
) {
  const { id, data } = action.payload
  try {
    const result: ChangeUserEmailResponse = yield call(adminUserAPI.changeUserEmail, id, data)
    yield put(changeUserEmailSuccess(result))
    const currentUserId: string | null | undefined = yield select(
      (state: RootState) => state.auth?.user?.user_id
    )
    if (currentUserId && result?.user?.user_id === currentUserId) {
      yield put(updateCurrentUserProfile(result.user))
    }
    if (result?.notification_sent === false) {
      toast.warning('Đã đổi email tài khoản, nhưng máy chủ mail chưa gửi được thư thông báo.')
    } else {
      toast.success('Đổi email tài khoản thành công!')
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Lỗi khi đổi email tài khoản.')
    yield put(changeUserEmailFailure(errorMsg))
    toast.error(`Đổi email thất bại: ${errorMsg}`)
  }
}

/**
 * Worker saga khóa tài khoản
 */
function* handleLockUser(action: PayloadAction<string>) {
  const id = action.payload
  try {
    const result: UserAccountItem = yield call(adminUserAPI.lockUser, id)
    yield put(lockUserSuccess(result))
    toast.success('Đã khóa tài khoản thành công!')
  } catch (error: any) {
    const errorMsg = getErrorMessage(error, 'Không thể khóa tài khoản.')
    yield put(lockUserFailure(errorMsg))
    toast.error(`Lỗi khóa tài khoản: ${errorMsg}`)
  }
}

/**
 * Worker saga mở khóa tài khoản
 */
function* handleUnlockUser(action: PayloadAction<string>) {
  const id = action.payload
  try {
    const result: UserAccountItem = yield call(adminUserAPI.unlockUser, id)
    yield put(unlockUserSuccess(result))
    toast.success('Đã mở khóa tài khoản thành công!')
  } catch (error: any) {
    const errorMsg = getErrorMessage(error, 'Không thể mở khóa tài khoản.')
    yield put(unlockUserFailure(errorMsg))
    toast.error(`Lỗi mở khóa tài khoản: ${errorMsg}`)
  }
}

/**
 * Worker saga gửi lại lời mời kích hoạt
 */
function* handleInviteUser(action: PayloadAction<string>) {
  const id = action.payload
  try {
    const result: InvitationResponse = yield call(adminUserAPI.inviteUser, id)
    yield put(inviteUserSuccess(result))
    if (result.invitation_sent === false) {
      toast.warning('Đã tạo liên kết mời, nhưng máy chủ mail chưa gửi được email.')
    } else {
      toast.success('Đã gửi email mời đặt lại mật khẩu cho tài khoản!')
    }
  } catch (error: any) {
    const errorMsg = getErrorMessage(error, 'Không thể gửi lời mời kích hoạt.')
    yield put(inviteUserFailure(errorMsg))
    toast.error(`Lỗi gửi lời mời: ${errorMsg}`)
  }
}

export function* adminUserSaga() {
  yield all([
    takeLatest(fetchUsersRequest.type, handleFetchUsers),
    takeLatest(createUserRequest.type, handleCreateUser),
    takeLatest(updateUserRequest.type, handleUpdateUser),
    takeLatest(changeUserEmailRequest.type, handleChangeUserEmail),
    takeLatest(lockUserRequest.type, handleLockUser),
    takeLatest(unlockUserRequest.type, handleUnlockUser),
    takeLatest(inviteUserRequest.type, handleInviteUser),
  ])
}

export default adminUserSaga
