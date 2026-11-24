import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Shield,
  Mail,
  MapPin,
  Globe,
  X,
  Camera,
  AtSign,
  User as UserIcon,
  Trash2,
  Loader2,
  Briefcase,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Calendar,
  Phone,
  Home,
  IdCard,
  Info,
  Pencil,
  Save,
  Upload,
} from 'lucide-react'
import type { CurrentUserResponse } from '../types/auth/me'
import type { UpdateUserRequest } from '../types/admin/users'
import type { RootState } from '../redux/rootReducer'
import { uploadAvatarRequest, removeAvatarRequest } from '../feature/avatar/avatarSlice'
import { changePasswordRequest, resetPasswordState } from '../feature/password/passwordSlice'
import { changeUserEmailRequest, updateUserRequest } from '../feature/users/userSlice'
import {
  changePasswordSchema,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordFormData,
} from '../validations/password.schema'
import { VIETNAM_PHONE_REGEX } from '../validations/common.schema'
import { hasAllCharacterTypes } from '../utils/passwordStrength'
import { PasswordRuleItem, PasswordStrengthMeter } from './PasswordStrengthMeter'
import { UserAvatar } from './UserAvatar'
import { ConfirmModal } from '../pages/iot-bridge/components/IotBridgeModal'
import { ChangeEmailModal } from '../pages/users/components/ChangeEmailModal'
import { convertToJpeg } from '../utils/imageUtils'
import {
  getRoleName,
  isAdmin as checkIsAdmin,
  isManagementAgency,
  isMaintenanceEngineer,
  isFieldCrew,
} from '../utils/roleUtils'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: CurrentUserResponse | null
}

// Backend nhận JPEG hoặc PNG tối đa 1 MB và tự thu về cạnh dài 512 px. Ảnh được thu nhỏ ngay trên trình duyệt
// trước khi gửi, nên người dùng chọn ảnh dung lượng bao nhiêu cũng được.
const MAX_AVATAR_BYTES = 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png']
const AVATAR_MAX_EDGE = 1024
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const GENDER_LABELS: Record<NonNullable<CurrentUserResponse['gender']>, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
}

const IDENTITY_TYPE_LABELS: Record<NonNullable<CurrentUserResponse['identity_type']>, string> = {
  citizen_id: 'Căn cước công dân',
  identity_card: 'Chứng minh nhân dân',
  passport: 'Hộ chiếu',
  other: 'Khác',
}

function formatDateOfBirth(value?: string | null): string {
  if (!value) return '-'
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (!match) return trimmed || '-'
  return `${match[3]}/${match[2]}/${match[1]}`
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const dispatch = useDispatch()
  const isAvatarSubmitting = useSelector((state: RootState) => state.avatar.isSubmitting)
  const { isChanging, changeSuccess, changeError } = useSelector(
    (state: RootState) => state.password
  )
  const { isSubmitting: isAdminUserSubmitting, actionError: adminUserActionError } = useSelector(
    (state: RootState) => state.adminUsers
  )

  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)

  // State sửa hồ sơ & đổi email (chỉ dành cho system_admin)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileSubmitPending, setIsProfileSubmitPending] = useState(false)
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false)
  const [isEmailSubmitPending, setIsEmailSubmitPending] = useState(false)
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<NonNullable<UpdateUserRequest['gender']> | ''>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [identityType, setIdentityType] = useState<
    NonNullable<UpdateUserRequest['identity_type']> | ''
  >('')
  const [identityNumber, setIdentityNumber] = useState('')
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  const isAvatarBusy = isPreparing || isAvatarSubmitting
  const isProfileSubmitting = isProfileSubmitPending && isAdminUserSubmitting
  const isEmailSubmitting = isEmailSubmitPending && isAdminUserSubmitting
  const isModalBusy = isChanging || isProfileSubmitting || isEmailSubmitting

  const fileRef = useRef<HTMLInputElement>(null)
  const avatarContainerRef = useRef<HTMLDivElement>(null)
  const avatarMenuButtonRef = useRef<HTMLButtonElement>(null)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const infoTabRef = useRef<HTMLButtonElement>(null)
  const securityTabRef = useRef<HTMLButtonElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    shouldUnregister: false,
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const syncProfileFormFromUser = useCallback((target: CurrentUserResponse | null) => {
    setFullName(target?.full_name || '')
    setDateOfBirth(target?.date_of_birth ? target.date_of_birth.slice(0, 10) : '')
    setGender(target?.gender || '')
    setPhoneNumber(target?.phone_number || '')
    setAddress(target?.address || '')
    setIdentityType(target?.identity_type || '')
    setIdentityNumber(target?.identity_number || '')
    setProfileErrors({})
  }, [])

  useEffect(() => {
    setIsRemoveConfirmOpen(false)
    setIsAvatarMenuOpen(false)
    setActiveTab('info')
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setCapsLockActive(false)
    setIsEditingProfile(false)
    setIsProfileSubmitPending(false)
    setIsChangeEmailOpen(false)
    setIsEmailSubmitPending(false)
    setProfileErrors({})
    reset()
    dispatch(resetPasswordState())
  }, [isOpen, user?.user_id, dispatch, reset])

  // Hoàn tất đổi mật khẩu: xoá form, ẩn mật khẩu, giữ modal mở ở tab Bảo mật và reset state
  useEffect(() => {
    if (!changeSuccess) return
    reset()
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setCapsLockActive(false)
    const oldInput = document.getElementById('profile-old-password')
    if (oldInput instanceof HTMLInputElement) {
      oldInput.focus()
    }
    dispatch(resetPasswordState())
  }, [changeSuccess, reset, dispatch])

  // Hoàn tất lưu hồ sơ: thành công thì thoát chế độ sửa, lỗi giữ nguyên form để chỉnh lại
  useEffect(() => {
    if (isProfileSubmitPending && !isAdminUserSubmitting) {
      setIsProfileSubmitPending(false)
      if (!adminUserActionError) {
        setIsEditingProfile(false)
        setProfileErrors({})
      }
    }
  }, [isProfileSubmitPending, isAdminUserSubmitting, adminUserActionError])

  // Hoàn tất đổi email: thành công thì tự đóng ChangeEmailModal
  useEffect(() => {
    if (isEmailSubmitPending && !isAdminUserSubmitting) {
      setIsEmailSubmitPending(false)
      if (!adminUserActionError) {
        setIsChangeEmailOpen(false)
      }
    }
  }, [isEmailSubmitPending, isAdminUserSubmitting, adminUserActionError])

  // Cuộn vùng nội dung về đầu mỗi khi chuyển tab hoặc mở lại modal
  useEffect(() => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0
    }
  }, [activeTab, isOpen])

  useEffect(() => {
    // The saga clears isSubmitting after either success or its existing error toast.
    if (!isAvatarSubmitting) setIsRemoveConfirmOpen(false)
  }, [isAvatarSubmitting])

  // Xoá lỗi ảnh cũ mỗi lần mở / đổi người dùng
  useEffect(() => {
    if (!isOpen) return
    setAvatarError(null)
  }, [isOpen, user?.user_id])

  const handleCancelEditProfile = useCallback(() => {
    if (isProfileSubmitting) return
    syncProfileFormFromUser(user)
    setIsEditingProfile(false)
  }, [isProfileSubmitting, syncProfileFormFromUser, user])

  // Đóng menu ảnh đại diện khi bận tải/gỡ ảnh
  useEffect(() => {
    if (isAvatarBusy) setIsAvatarMenuOpen(false)
  }, [isAvatarBusy])

  // Mở menu ảnh đại diện thì focus mục đầu tiên và đóng khi bấm ra ngoài
  useEffect(() => {
    if (!isAvatarMenuOpen) return
    const firstItem = avatarMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])'
    )
    firstItem?.focus()

    const handlePointerDown = (e: MouseEvent) => {
      if (
        avatarContainerRef.current &&
        e.target instanceof Node &&
        !avatarContainerRef.current.contains(e.target)
      ) {
        setIsAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isAvatarMenuOpen])

  const isVisible = isOpen && Boolean(user)

  // Lưu phần tử đang focus trước khi mở, đưa focus vào tab đang chọn và khôi phục khi đóng modal
  useEffect(() => {
    if (!isVisible) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    infoTabRef.current?.focus()
    return () => {
      const prev = previousFocusRef.current
      previousFocusRef.current = null
      if (prev && prev.isConnected) {
        prev.focus()
      }
    }
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Tạm nhường quản lý focus khi modal con đang mở
        if (isRemoveConfirmOpen || isChangeEmailOpen) return
        const dialog = dialogRef.current
        if (!dialog) return
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
          (el) =>
            el.tabIndex >= 0 &&
            !el.classList.contains('hidden') &&
            !el.closest('.hidden') &&
            !el.closest('[hidden]')
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last || !dialog.contains(active)) {
          e.preventDefault()
          first.focus()
        }
        return
      }

      if (e.key !== 'Escape') return
      if (isAvatarMenuOpen) {
        e.preventDefault()
        setIsAvatarMenuOpen(false)
        avatarMenuButtonRef.current?.focus()
        return
      }
      if (isRemoveConfirmOpen || isChangeEmailOpen || isModalBusy) return
      if (isEditingProfile && activeTab === 'info') {
        handleCancelEditProfile()
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [
    isVisible,
    onClose,
    isAvatarMenuOpen,
    isRemoveConfirmOpen,
    isChangeEmailOpen,
    isModalBusy,
    isEditingProfile,
    activeTab,
    handleCancelEditProfile,
  ])

  if (!isOpen || !user) return null

  const onSubmitChangePassword = (data: ChangePasswordFormData) => {
    if (isChanging) return
    dispatch(
      changePasswordRequest({
        old_password: data.oldPassword,
        new_password: data.newPassword,
      })
    )
  }

  const trackCapsLock = (e: React.KeyboardEvent) =>
    setCapsLockActive(e.getModifierState('CapsLock'))

  const oldPasswordValue = watch('oldPassword') || ''
  const newPasswordValue = watch('newPassword') || ''
  const confirmPasswordValue = watch('confirmPassword') || ''
  const lengthMet = newPasswordValue.length >= PASSWORD_MIN_LENGTH
  const differsFromOldMet = newPasswordValue.length > 0 && newPasswordValue !== oldPasswordValue
  const matchMet = confirmPasswordValue.length > 0 && confirmPasswordValue === newPasswordValue

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const nextTab = activeTab === 'info' ? 'security' : 'info'
    setActiveTab(nextTab)
    if (nextTab === 'info') {
      infoTabRef.current?.focus()
    } else {
      securityTabRef.current?.focus()
    }
  }

  const roleName = getRoleName(user.role).replace(/\s*\([^)]*\)\s*$/, '')
  const isAdmin = checkIsAdmin(user.role)

  let badgeColor =
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  if (isAdmin) {
    badgeColor =
      'bg-primary/10 text-primary border-primary/20 dark:bg-primary/30 dark:text-secondary dark:border-primary/40'
  } else if (isManagementAgency(user.role)) {
    badgeColor =
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
  } else if (isMaintenanceEngineer(user.role)) {
    badgeColor =
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
  } else if (isFieldCrew(user.role)) {
    badgeColor =
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  }

  const displayName = user.full_name || user.username || 'Người dùng'
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'U'

  const hasAllCommunes = isAdmin || (user.commune_ids && user.commune_ids.includes('*'))
  const communeLabels: string[] =
    user.communes && user.communes.length > 0
      ? user.communes.map((c) => c.name || c.commune_id || '').filter(Boolean)
      : (user.commune_ids || []).filter((c) => c !== '*')

  const genderLabel = user.gender ? GENDER_LABELS[user.gender] || '-' : '-'
  const identityTypeLabel = user.identity_type
    ? IDENTITY_TYPE_LABELS[user.identity_type] || '-'
    : '-'

  // So sánh thay đổi cho chế độ sửa hồ sơ của admin
  const initialFullName = (user.full_name || '').trim()
  const initialDob = user.date_of_birth ? user.date_of_birth.slice(0, 10) : ''
  const initialGender = user.gender || ''
  const initialPhone = (user.phone_number || '').trim()
  const initialAddress = (user.address || '').trim()
  const initialIdentityType = user.identity_type || ''
  const initialIdentityNumber = (user.identity_number || '').trim()

  const trimmedFullName = fullName.trim()
  const trimmedDob = dateOfBirth.trim()
  const trimmedPhone = phoneNumber.trim()
  const trimmedAddress = address.trim()
  const trimmedIdentityNumber = identityNumber.trim()

  const nameChanged = trimmedFullName !== initialFullName
  const dobChanged = Boolean(trimmedDob) && trimmedDob !== initialDob
  const genderChanged = Boolean(gender) && gender !== initialGender
  const phoneChanged = Boolean(trimmedPhone) && trimmedPhone !== initialPhone
  const addressChanged = Boolean(trimmedAddress) && trimmedAddress !== initialAddress
  const identityTypeChanged = Boolean(identityType) && identityType !== initialIdentityType
  const identityNumberChanged =
    Boolean(trimmedIdentityNumber) && trimmedIdentityNumber !== initialIdentityNumber

  const hasProfileChanges =
    nameChanged ||
    dobChanged ||
    genderChanged ||
    phoneChanged ||
    addressChanged ||
    identityTypeChanged ||
    identityNumberChanged

  const handleStartEditProfile = () => {
    syncProfileFormFromUser(user)
    setIsEditingProfile(true)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (isProfileSubmitting || !hasProfileChanges || !user.user_id) return

    const nextErrors: Record<string, string> = {}
    if (!trimmedFullName) {
      nextErrors.fullName = 'Họ và tên không được để trống'
    }
    if (trimmedPhone && !VIETNAM_PHONE_REGEX.test(trimmedPhone.replace(/^\+84/, '0'))) {
      nextErrors.phoneNumber =
        'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (10 chữ số, VD: 0901234567)'
    }

    setProfileErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload: UpdateUserRequest = {}
    if (nameChanged) payload.full_name = trimmedFullName
    if (dobChanged) payload.date_of_birth = trimmedDob
    if (genderChanged && gender) payload.gender = gender
    if (phoneChanged) payload.phone_number = trimmedPhone
    if (addressChanged) payload.address = trimmedAddress
    if (identityTypeChanged && identityType) payload.identity_type = identityType
    if (identityNumberChanged) payload.identity_number = trimmedIdentityNumber

    setIsProfileSubmitPending(true)
    dispatch(updateUserRequest({ id: user.user_id, data: payload }))
  }

  const handleConfirmChangeEmail = (newEmail: string) => {
    if (!user.user_id || isEmailSubmitting) return
    setIsEmailSubmitPending(true)
    dispatch(changeUserEmailRequest({ id: user.user_id, data: { email: newEmail } }))
  }

  const handleAvatarMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const items = Array.from(
      avatarMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])'
      ) ?? []
    )
    if (items.length === 0) return
    e.preventDefault()
    const currentIndex = items.findIndex((item) => item === document.activeElement)
    if (e.key === 'Home') {
      items[0].focus()
      return
    }
    if (e.key === 'End') {
      items[items.length - 1].focus()
      return
    }
    const delta = e.key === 'ArrowDown' ? 1 : -1
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + delta + items.length) % items.length
    items[nextIndex].focus()
  }

  const handlePickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Chỉ chấp nhận ảnh JPEG hoặc PNG.')
      return
    }
    setAvatarError(null)
    setIsPreparing(true)
    try {
      const resized = await convertToJpeg(file, 0.85, AVATAR_MAX_EDGE)
      if (resized.size > MAX_AVATAR_BYTES) {
        setAvatarError('Ảnh quá lớn, vui lòng chọn ảnh khác.')
        return
      }
      dispatch(uploadAvatarRequest(resized))
    } catch {
      setAvatarError('Không đọc được ảnh này, vui lòng chọn ảnh khác.')
    } finally {
      setIsPreparing(false)
    }
  }

  const profileInputClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:opacity-50'

  const secondaryFooterButtonClass =
    'px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => {
          if (!isModalBusy) onClose()
        }}
        className={`fixed inset-0 animate-in fade-in duration-200 ${
          isAdmin ? 'bg-slate-900/30 backdrop-blur-md' : 'bg-slate-900/50 backdrop-blur-xs'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Hồ sơ cá nhân"
        className={`relative shadow-2xl border w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${
          isAdmin
            ? 'bg-white/85 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[28px] border-white/80 dark:border-slate-800 shadow-primary/30'
            : 'bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Header cố định gọn 1 hàng: avatar + danh tính + nút đóng */}
        <div className="shrink-0 relative z-20 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
          <button
            type="button"
            disabled={isModalBusy}
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 pr-8">
            <div ref={avatarContainerRef} className="relative shrink-0">
              <UserAvatar
                avatarUrl={user.avatar_url}
                initials={initials}
                alt={displayName}
                className={`w-14 h-14 rounded-full ${
                  isAdmin
                    ? 'bg-gradient-to-br from-secondary to-primary'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                } text-white text-xl font-bold flex items-center justify-center ring-2 ring-slate-100 dark:ring-slate-800`}
              />
              {isAvatarBusy && (
                <div className="absolute inset-0 rounded-full bg-white/70 dark:bg-slate-900/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600 dark:text-slate-300" />
                </div>
              )}
              <button
                ref={avatarMenuButtonRef}
                type="button"
                disabled={isAvatarBusy}
                aria-haspopup="menu"
                aria-expanded={isAvatarMenuOpen}
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className="disabled:opacity-50 absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 hover:bg-slate-700 dark:hover:bg-slate-600 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title="Đổi ảnh đại diện (JPEG hoặc PNG)"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePickAvatar}
                className="hidden"
              />

              {isAvatarMenuOpen && (
                <div
                  ref={avatarMenuRef}
                  role="menu"
                  aria-label="Tùy chọn ảnh đại diện"
                  onKeyDown={handleAvatarMenuKeyDown}
                  className="absolute left-0 top-full mt-2 z-30 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 text-left animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isAvatarBusy}
                    onClick={() => {
                      setIsAvatarMenuOpen(false)
                      avatarMenuButtonRef.current?.focus()
                      fileRef.current?.click()
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Tải ảnh mới</span>
                  </button>
                  {user.avatar_url && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isAvatarBusy}
                      onClick={() => {
                        setIsAvatarMenuOpen(false)
                        setIsRemoveConfirmOpen(true)
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:bg-rose-50 dark:focus-visible:bg-rose-950/50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Gỡ ảnh đại diện</span>
                    </button>
                  )}
                  <p className="mt-1 pt-1.5 px-3.5 pb-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    JPEG hoặc PNG, tối đa 1 MB
                  </p>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white break-words leading-snug">
                {displayName}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  @{user.username || user.user_id}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                >
                  <Shield className="w-3 h-3" />
                  {roleName}
                </span>
              </div>
            </div>
          </div>

          {avatarError && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {avatarError}
            </p>
          )}
        </div>

        {/* Thanh tab cố định */}
        <div
          role="tablist"
          aria-label="Mục hồ sơ cá nhân"
          className="shrink-0 flex items-center gap-1 px-6 pt-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30"
        >
          <button
            ref={infoTabRef}
            id="profile-tab-info"
            type="button"
            role="tab"
            aria-selected={activeTab === 'info'}
            aria-controls="profile-panel-info"
            tabIndex={activeTab === 'info' ? 0 : -1}
            onClick={() => setActiveTab('info')}
            onKeyDown={handleTabKeyDown}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition inline-flex items-center gap-1.5 cursor-pointer rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activeTab === 'info'
                ? 'border-primary text-primary dark:text-secondary dark:border-secondary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Thông tin
          </button>
          <button
            ref={securityTabRef}
            id="profile-tab-security"
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            aria-controls="profile-panel-security"
            tabIndex={activeTab === 'security' ? 0 : -1}
            onClick={() => setActiveTab('security')}
            onKeyDown={handleTabKeyDown}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition inline-flex items-center gap-1.5 cursor-pointer rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activeTab === 'security'
                ? 'border-primary text-primary dark:text-secondary dark:border-secondary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Bảo mật
          </button>
        </div>

        {/* Thân modal cuộn được */}
        <div ref={bodyScrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {/* Tab Thông tin */}
          {activeTab === 'info' && (
            <div
              id="profile-panel-info"
              role="tabpanel"
              aria-labelledby="profile-tab-info"
              className="space-y-4 text-sm"
            >
              {!isAdmin && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Thông tin do Quản trị viên quản lý</span>
                </div>
              )}

              {isAdmin && isEditingProfile ? (
                <form
                  id="profile-edit-form"
                  noValidate
                  onSubmit={handleSaveProfile}
                  className="space-y-4"
                >
                  {/* Nhóm Tài khoản (Họ và tên sửa được; Username, Email cố định) */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tài khoản
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div>
                        <label
                          htmlFor="profile-edit-fullname"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Họ và tên <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="profile-edit-fullname"
                          type="text"
                          value={fullName}
                          disabled={isProfileSubmitting}
                          aria-invalid={Boolean(profileErrors.fullName) || undefined}
                          aria-describedby={
                            profileErrors.fullName ? 'profile-edit-fullname-error' : undefined
                          }
                          onChange={(e) => {
                            setFullName(e.target.value)
                            if (profileErrors.fullName) {
                              setProfileErrors((prev) => ({ ...prev, fullName: '' }))
                            }
                          }}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                            profileErrors.fullName
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-primary/20 focus:border-primary'
                          }`}
                        />
                        {profileErrors.fullName && (
                          <p
                            id="profile-edit-fullname-error"
                            className="text-rose-600 dark:text-rose-400 mt-1 text-xs"
                          >
                            {profileErrors.fullName}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                          Tên đăng nhập
                        </span>
                        <input
                          type="text"
                          disabled
                          value={user.username || '-'}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                          Email
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={user.email || '-'}
                            className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed truncate"
                          />
                          <button
                            type="button"
                            disabled={isProfileSubmitting || isEmailSubmitting}
                            onClick={() => setIsChangeEmailOpen(true)}
                            className="px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          >
                            Đổi email
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Nhóm Thông tin cá nhân (6 trường sửa được, lưới 2 cột giống EditUserModal) */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Thông tin cá nhân
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div>
                        <label
                          htmlFor="profile-edit-dob"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Ngày sinh
                        </label>
                        <input
                          id="profile-edit-dob"
                          type="date"
                          value={dateOfBirth}
                          disabled={isProfileSubmitting}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className={profileInputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-edit-gender"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Giới tính
                        </label>
                        <select
                          id="profile-edit-gender"
                          value={gender}
                          disabled={isProfileSubmitting}
                          onChange={(e) =>
                            setGender(
                              e.target.value as NonNullable<UpdateUserRequest['gender']> | ''
                            )
                          }
                          className={`${profileInputClass} cursor-pointer`}
                        >
                          <option value="" className="dark:bg-slate-900">
                            -- Chọn giới tính --
                          </option>
                          {(
                            Object.entries(GENDER_LABELS) as [
                              NonNullable<UpdateUserRequest['gender']>,
                              string,
                            ][]
                          ).map(([k, label]) => (
                            <option key={k} value={k} className="dark:bg-slate-900">
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="profile-edit-phone"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Số điện thoại
                        </label>
                        <input
                          id="profile-edit-phone"
                          type="tel"
                          value={phoneNumber}
                          disabled={isProfileSubmitting}
                          aria-invalid={Boolean(profileErrors.phoneNumber) || undefined}
                          aria-describedby={
                            profileErrors.phoneNumber ? 'profile-edit-phone-error' : undefined
                          }
                          onChange={(e) => {
                            setPhoneNumber(e.target.value)
                            if (profileErrors.phoneNumber) {
                              setProfileErrors((prev) => ({ ...prev, phoneNumber: '' }))
                            }
                          }}
                          placeholder="Ví dụ: 0901234567"
                          className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                            profileErrors.phoneNumber
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-primary/20 focus:border-primary'
                          }`}
                        />
                        {profileErrors.phoneNumber && (
                          <p
                            id="profile-edit-phone-error"
                            className="text-rose-600 dark:text-rose-400 mt-1 text-xs"
                          >
                            {profileErrors.phoneNumber}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="profile-edit-address"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Địa chỉ
                        </label>
                        <input
                          id="profile-edit-address"
                          type="text"
                          value={address}
                          disabled={isProfileSubmitting}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Nhập địa chỉ liên hệ"
                          className={profileInputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-edit-identity-type"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Loại giấy tờ
                        </label>
                        <select
                          id="profile-edit-identity-type"
                          value={identityType}
                          disabled={isProfileSubmitting}
                          onChange={(e) =>
                            setIdentityType(
                              e.target.value as NonNullable<UpdateUserRequest['identity_type']> | ''
                            )
                          }
                          className={`${profileInputClass} cursor-pointer`}
                        >
                          <option value="" className="dark:bg-slate-900">
                            -- Chọn loại giấy tờ --
                          </option>
                          {(
                            Object.entries(IDENTITY_TYPE_LABELS) as [
                              NonNullable<UpdateUserRequest['identity_type']>,
                              string,
                            ][]
                          ).map(([k, label]) => (
                            <option key={k} value={k} className="dark:bg-slate-900">
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="profile-edit-identity-number"
                          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          Số giấy tờ
                        </label>
                        <input
                          id="profile-edit-identity-number"
                          type="text"
                          value={identityNumber}
                          disabled={isProfileSubmitting}
                          onChange={(e) => setIdentityNumber(e.target.value)}
                          placeholder="Nhập số giấy tờ"
                          className={profileInputClass}
                        />
                      </div>
                    </div>
                  </section>
                </form>
              ) : (
                <>
                  {/* Nhóm Tài khoản */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tài khoản
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Họ và tên
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words mt-0.5">
                            {user.full_name || '-'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <AtSign className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Tên đăng nhập
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono break-all mt-0.5">
                            {user.username || '-'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Email
                          </dt>
                          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                              {user.email || '-'}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                disabled={isEmailSubmitting}
                                onClick={() => setIsChangeEmailOpen(true)}
                                className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-primary dark:text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                Đổi email
                              </button>
                            )}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Chức vụ
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {roleName || '-'}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  {/* Nhóm Phạm vi */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Phạm vi
                    </h4>
                    <dl className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            {hasAllCommunes || communeLabels.length > 1
                              ? 'Địa bàn quản lý'
                              : 'Xã phụ trách'}
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {hasAllCommunes ? (
                              <span className="inline-flex items-center gap-1.5 text-primary dark:text-secondary">
                                <Globe className="w-3.5 h-3.5" />
                                Toàn bộ địa bàn
                              </span>
                            ) : communeLabels.length > 0 ? (
                              communeLabels.join(', ')
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 italic text-xs font-normal">
                                Chưa được phân công. Liên hệ Quản trị viên.
                              </span>
                            )}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  {/* Nhóm Thông tin cá nhân */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Thông tin cá nhân
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Ngày sinh
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {formatDateOfBirth(user.date_of_birth)}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Giới tính
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {genderLabel}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Số điện thoại
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                            {user.phone_number || '-'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <Home className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Địa chỉ
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words mt-0.5">
                            {user.address || '-'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <IdCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Loại giấy tờ
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {identityTypeLabel}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 min-w-0">
                        <IdCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Số giấy tờ
                          </dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono break-all mt-0.5">
                            {user.identity_number || '-'}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>
                </>
              )}
            </div>
          )}

          {/* Tab Bảo mật: form đổi mật khẩu (giữ nguyên dữ liệu khi chuyển tab) */}
          {activeTab === 'security' && (
            <div
              id="profile-panel-security"
              role="tabpanel"
              aria-labelledby="profile-tab-security"
            >
              <form
                id="profile-password-form"
                noValidate
                onSubmit={handleSubmit(onSubmitChangePassword)}
                className="space-y-4 text-sm"
              >
                {changeError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{changeError}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="profile-old-password"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      id="profile-old-password"
                      type={showOldPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={isChanging}
                      aria-invalid={Boolean(errors.oldPassword) || undefined}
                      aria-describedby={
                        errors.oldPassword ? 'profile-old-password-error' : undefined
                      }
                      onKeyDown={trackCapsLock}
                      onKeyUp={trackCapsLock}
                      {...register('oldPassword')}
                      className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                        errors.oldPassword
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-primary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword((v) => !v)}
                      aria-label={showOldPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {showOldPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.oldPassword && (
                    <p
                      id="profile-old-password-error"
                      className="mt-1 text-xs text-rose-600 dark:text-rose-400"
                    >
                      {errors.oldPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-new-password"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={isChanging}
                      aria-invalid={Boolean(errors.newPassword) || undefined}
                      aria-describedby={
                        errors.newPassword ? 'profile-new-password-error' : undefined
                      }
                      onKeyDown={trackCapsLock}
                      onKeyUp={trackCapsLock}
                      placeholder={`Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`}
                      {...register('newPassword')}
                      className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                        errors.newPassword
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-primary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p
                      id="profile-new-password-error"
                      className="mt-1 text-xs text-rose-600 dark:text-rose-400"
                    >
                      {errors.newPassword.message}
                    </p>
                  )}

                  <PasswordStrengthMeter password={newPasswordValue} />

                  {capsLockActive && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
                      <span>Caps Lock đang bật</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-confirm-password"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    Nhập lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="profile-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={isChanging}
                      aria-invalid={Boolean(errors.confirmPassword) || undefined}
                      aria-describedby={
                        errors.confirmPassword ? 'profile-confirm-password-error' : undefined
                      }
                      onKeyDown={trackCapsLock}
                      onKeyUp={trackCapsLock}
                      {...register('confirmPassword')}
                      className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                        errors.confirmPassword
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-primary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      id="profile-confirm-password-error"
                      className="mt-1 text-xs text-rose-600 dark:text-rose-400"
                    >
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <ul
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2.5 text-sm"
                  aria-label="Yêu cầu mật khẩu"
                >
                  <PasswordRuleItem met={lengthMet}>
                    Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
                  </PasswordRuleItem>
                  <PasswordRuleItem met={differsFromOldMet}>
                    Khác mật khẩu hiện tại
                  </PasswordRuleItem>
                  <PasswordRuleItem met={matchMet}>Hai ô nhập khớp nhau</PasswordRuleItem>
                  <PasswordRuleItem
                    met={hasAllCharacterTypes(newPasswordValue)}
                    className="sm:col-span-2"
                  >
                    Khuyến nghị: chữ hoa, chữ thường, số và ký tự đặc biệt
                  </PasswordRuleItem>
                </ul>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sau khi đổi, các thiết bị khác có thể phải đăng nhập lại bằng mật khẩu mới.
                </p>
              </form>
            </div>
          )}
        </div>

        {/* Hành động cố định */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-end gap-2 shrink-0">
          {isAdmin && isEditingProfile && activeTab === 'info' ? (
            <>
              <button
                type="button"
                disabled={isProfileSubmitting}
                onClick={handleCancelEditProfile}
                className={secondaryFooterButtonClass}
              >
                Hủy
              </button>
              <button
                type="submit"
                form="profile-edit-form"
                disabled={isProfileSubmitting || !hasProfileChanges}
                className="px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {isProfileSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </>
          ) : activeTab === 'security' ? (
            <>
              <button
                type="button"
                disabled={isModalBusy}
                onClick={onClose}
                className={secondaryFooterButtonClass}
              >
                Đóng
              </button>
              <button
                type="submit"
                form="profile-password-form"
                disabled={isChanging}
                className="px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {isChanging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Cập nhật mật khẩu</span>
                  </>
                )}
              </button>
            </>
          ) : isAdmin && activeTab === 'info' && !isEditingProfile ? (
            <>
              <button
                type="button"
                disabled={isModalBusy}
                onClick={onClose}
                className={secondaryFooterButtonClass}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isEmailSubmitting}
                onClick={handleStartEditProfile}
                className="px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Sửa hồ sơ</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isModalBusy}
              onClick={onClose}
              className={secondaryFooterButtonClass}
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <ChangeEmailModal
          isOpen={isChangeEmailOpen}
          currentEmail={user.email}
          username={user.username}
          isSubmitting={isEmailSubmitting}
          onClose={() => setIsChangeEmailOpen(false)}
          onSubmit={handleConfirmChangeEmail}
        />
      )}

      {isRemoveConfirmOpen && (
        <ConfirmModal
          title="Gỡ ảnh đại diện?"
          message="Ảnh đại diện sẽ được gỡ và thay bằng chữ viết tắt tên. Bạn có thể tải ảnh mới bất cứ lúc nào."
          confirmLabel="Gỡ ảnh"
          tone="danger"
          busy={isAvatarSubmitting}
          onConfirm={() => {
            if (!isAvatarSubmitting) dispatch(removeAvatarRequest())
          }}
          onCancel={() => setIsRemoveConfirmOpen(false)}
        />
      )}
    </div>
  )
}

export default ProfileModal
