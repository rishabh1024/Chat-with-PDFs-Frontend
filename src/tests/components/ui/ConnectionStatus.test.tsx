import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../../../test-utils/testing-library-utils'
import ConnectionStatus from '../../../components/ui/ConnectionStatus'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders connection status indicator', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    })

    render(<ConnectionStatus />)

    expect(screen.getByText(/Checking/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  it('shows checking status initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => undefined))

    render(<ConnectionStatus />)

    expect(screen.getByText('Checking...')).toBeInTheDocument()
  })

  it('displays connected status when API is reachable', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    })

    render(<ConnectionStatus />)

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('displays disconnected status when API is unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<ConnectionStatus />)

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })
  })

  it('does not send an Authorization header on the health probe', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    render(<ConnectionStatus />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = init?.headers
    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
      expect(headers).not.toHaveProperty('Authorization')
    }
  })
})
