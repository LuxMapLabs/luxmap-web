import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// jsdom has no canvas: the downscale itself is the browser's job, here we check what the modal does with its result.
vi.mock('../../utils/imageUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/imageUtils')>()),
  convertToJpeg: vi.fn(),
}))

import rootReducer from '../../redux/rootReducer'
import { ProfileModal } from '../../components/ProfileModal'
import { convertToJpeg, fitWithin } from '../../utils/imageUtils'
import type { CurrentUserResponse } from '../../types/auth/me'

const user = {
  user_id: 'U-1',
  username: 'engineer',
  full_name: 'Quản lý Một',
  email: 'manager@example.com',
  role: 'manager',
  commune_ids: ['COM-001'],
  communes: [{ commune_id: 'COM-001', name: 'Phường Long Bình' }],
  avatar_url: null,
} as unknown as CurrentUserResponse

const renderModal = () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  const view = render(
    <Provider store={store}>
      <ProfileModal isOpen onClose={vi.fn()} user={user} />
    </Provider>
  )
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
  return { store, input }
}

const pick = (input: HTMLInputElement, file: File) => fireEvent.change(input, { target: { files: [file] } })
const bytes = (count: number, name: string, type: string) => new File([new Uint8Array(count)], name, { type })

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.mocked(convertToJpeg).mockReset()
  })

  it('shows name and email read-only, with no separate edit mode', () => {
    renderModal()
    expect(screen.getByText('Họ và tên')).toBeInTheDocument()
    expect(screen.getAllByText('Quản lý Một').length).toBeGreaterThan(0)
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Chỉnh sửa hồ sơ')).not.toBeInTheDocument()
  })

  it('lists the role as a "Chức vụ" row next to the name', () => {
    renderModal()
    const term = screen.getByText('Chức vụ')
    expect(term.nextElementSibling).toHaveTextContent(/^Quản lý$/)
  })

  it('offers the avatar picker straight away, accepting JPEG and PNG', () => {
    const { input } = renderModal()
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeInTheDocument()
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
  })

  it('refuses formats other than JPEG and PNG without converting', () => {
    const { store, input } = renderModal()
    pick(input, bytes(3, 'a.gif', 'image/gif'))
    expect(screen.getByText('Chỉ chấp nhận ảnh JPEG hoặc PNG.')).toBeInTheDocument()
    expect(convertToJpeg).not.toHaveBeenCalled()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })

  it('downscales a photo over 1 MB to a 1024 px JPEG and uploads that', async () => {
    const small = bytes(150_000, 'photo.jpg', 'image/jpeg')
    vi.mocked(convertToJpeg).mockResolvedValue(small)
    const { store, input } = renderModal()

    pick(input, bytes(5 * 1024 * 1024, 'photo.png', 'image/png'))

    await waitFor(() => expect(store.getState().avatar.isSubmitting).toBe(true))
    expect(convertToJpeg).toHaveBeenCalledWith(expect.objectContaining({ name: 'photo.png' }), 0.85, 1024)
    expect(screen.queryByText(/Ảnh quá lớn|Không đọc được/)).not.toBeInTheDocument()
  })

  it('reports an image the browser cannot decode', async () => {
    vi.mocked(convertToJpeg).mockRejectedValue(new Error('decode'))
    const { store, input } = renderModal()
    pick(input, bytes(10, 'broken.png', 'image/png'))
    expect(await screen.findByText('Không đọc được ảnh này, vui lòng chọn ảnh khác.')).toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })

  it('refuses when the converted image is still over 1 MB', async () => {
    vi.mocked(convertToJpeg).mockResolvedValue(bytes(1024 * 1024 + 1, 'big.jpg', 'image/jpeg'))
    const { store, input } = renderModal()
    pick(input, bytes(10, 'big.png', 'image/png'))
    expect(await screen.findByText('Ảnh quá lớn, vui lòng chọn ảnh khác.')).toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })
})

describe('fitWithin', () => {
  it('scales the longest edge down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 })
  })

  it('never enlarges, and keeps the size without a limit', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(4000, 3000)).toEqual({ width: 4000, height: 3000 })
  })

  it('keeps a very thin image at least one pixel wide', () => {
    expect(fitWithin(10000, 1, 1024)).toEqual({ width: 1024, height: 1 })
  })
})
