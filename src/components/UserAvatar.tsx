import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../redux/rootReducer'
import { fetchAvatarRequest } from '../feature/avatar/avatarSlice'

interface UserAvatarProps {
  /** avatar_url từ backend (đường dẫn tương đối kèm ?v=), rỗng thì hiện chữ cái đầu */
  avatarUrl?: string | null
  /** Nội dung hiện khi chưa có ảnh: chữ cái đầu hoặc icon */
  initials: React.ReactNode
  alt?: string
  /** Class của khung ngoài (kích thước, bo góc, màu nền chữ cái đầu...) */
  className?: string
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ avatarUrl, initials, alt = '', className = '' }) => {
  const dispatch = useDispatch()
  const src = useSelector((state: RootState) => (avatarUrl ? state.avatar.images[avatarUrl] : undefined))

  useEffect(() => {
    if (avatarUrl) dispatch(fetchAvatarRequest(avatarUrl))
  }, [avatarUrl, dispatch])

  return (
    <div className={`overflow-hidden ${className}`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : initials}
    </div>
  )
}

export default UserAvatar
