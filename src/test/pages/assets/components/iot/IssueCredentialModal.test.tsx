import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IssueCredentialModal } from '../../../../../pages/assets/components/iot/components/IssueCredentialModal'

describe('IssueCredentialModal', () => {
  it('resets generating after credential failure', () => {
    const onIssue = vi.fn((_id, _onSuccess, onError?: () => void) => onError?.())
    render(
      <IssueCredentialModal
        isOpen
        node={{
          node_id: 'NODE-1',
          cabinet_id: 'CAB-1',
          commune_id: 'COM-1',
          node_role: 'segment_controller',
          data_source: 'simulated',
          supports_remote_control: true,
          has_credential: false,
          relays: [],
          updated_at: null,
        }}
        onClose={vi.fn()}
        onIssue={onIssue}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tạo secret mới' }))
    expect(screen.getByRole('button', { name: 'Tạo secret mới' })).toBeEnabled()
  })
})
