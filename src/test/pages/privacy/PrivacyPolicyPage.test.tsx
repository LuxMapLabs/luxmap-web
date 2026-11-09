import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPolicyPage } from '../../../pages/privacy/PrivacyPolicyPage'

describe('PrivacyPolicyPage', () => {
  it('hiển thị tiêu đề và email liên hệ dạng mailto', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Chính sách quyền riêng tư' })).toBeTruthy()
    const mail = screen.getByRole('link', { name: /luxmap\.noreply@gmail\.com/ })
    expect(mail.getAttribute('href')).toBe('mailto:luxmap.noreply@gmail.com')
  })
})
