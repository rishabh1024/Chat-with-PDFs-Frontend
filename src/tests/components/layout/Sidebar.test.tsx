import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test-utils/testing-library-utils'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../../../components/layout'
import { documentService } from '../../../services/documentService'

vi.mock('../../../services/documentService', () => ({
  documentService: {
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

const mockDocumentService = vi.mocked(documentService)

describe('Sidebar documents', () => {
  const defaultProps = {
    isOpen: true,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService.listDocuments.mockResolvedValue([])
  })

  it('renders sidebar with tabs', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('loads and displays documents when the documents tab is active', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        type: 'PDF',
        size: '2.4 MB',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(mockDocumentService.listDocuments).toHaveBeenCalled()
    })

    expect(screen.getByText('API Documentation.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF • 2.4 MB')).toBeInTheDocument()
  })

  it('shows empty state when no documents exist', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('No documents yet. Upload a PDF or document to get started.')).toBeInTheDocument()
    })
  })

  it('uploads a document when a file is selected', async () => {
    const user = userEvent.setup()
    mockDocumentService.uploadDocument.mockResolvedValue({
      id: '2',
      name: 'notes.pdf',
      type: 'PDF',
      size: '1.0 KB',
      uploadDate: '2026-01-02T00:00:00.000Z',
    })

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    const file = new File(['content'], 'notes.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(file)
    })

    expect(screen.getByText('notes.pdf')).toBeInTheDocument()
  })

  it('deletes a document when delete is clicked', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        type: 'PDF',
        size: '2.4 MB',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])
    mockDocumentService.deleteDocument.mockResolvedValue()

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('API Documentation.pdf')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith('1')
    })

    expect(screen.queryByText('API Documentation.pdf')).not.toBeInTheDocument()
  })
})
