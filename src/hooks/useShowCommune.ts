import { useSelector } from 'react-redux'
import type { RootState } from '../redux/rootReducer'
import { isAdmin } from '../utils/roleUtils'

/**
 * Có cần hiển thị cột/dòng "Địa bàn" hay không.
 * Mỗi Manager chỉ phụ trách 1 xã nên địa bàn luôn giống nhau ở mọi dòng và không cần hiện;
 * chỉ hiện khi tài khoản thấy từ 2 xã trở lên (Admin / toàn hệ thống).
 */
export const useShowCommune = (): boolean => {
  const user = useSelector((state: RootState) => state.auth?.user)
  if (!user) return false
  if (isAdmin(user.role) || user.commune_ids?.includes('*')) return true
  return (user.commune_ids?.length ?? 0) > 1
}
