import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '../../../test-utils/testing-library-utils'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../../../components/layout'
import { documentService, HttpStatusError } from '../../../services/documentService'
import { Conversation } from '../../../types/chat'

vi.mock('../../../services/documentService', () => ({
  documentService: {
    listDocuments: vi.fn(),
    uploadAndIndex: vi.fn(),
    subscribeToIndexStatus: vi.fn(),
  },
  HttpStatusError: class HttpStatusError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'HttpStatusError'
      this.status = status
    }
  },
}))

const mockDocumentService = vi.mocked(documentService)

const conversations: Conversation[] = [
  {
    id: '1',
    userId: 'user-1',
    title: 'React Components Discussion',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T01:00:00.000Z',
  },
  {
    id: '2',
    userId: 'user-1',
    title: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const defaultProps = {
  isOpen: true,
  onToggle: vi.fn(),
  conversations,
  conversationsLoading: false,
  conversationsError: null as string | null,
  activeConversationId: '1' as string | null,
  deletingConversationId: null as string | null,
  onNewChat: vi.fn(),
  onSelectConversation: vi.fn(),
  onDeleteConversation: vi.fn(),
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService.listDocuments.mockResolvedValue([])
    mockDocumentService.subscribeToIndexStatus.mockReturnValue(() => {})
  })

  it('renders sidebar with tabs', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByLabelText('Chat with PDFs')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.queryByText('Prompts')).not.toBeInTheDocument()
    expect(screen.queryByText('Tools')).not.toBeInTheDocument()
  })

  it('lists conversations in the history tab', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByText('React Components Discussion')).toBeInTheDocument()
    expect(screen.getByText('New Conversation')).toBeInTheDocument()
  })

  it('shows empty state when no conversations exist', () => {
    render(<Sidebar {...defaultProps} conversations={[]} />)

    expect(screen.getByText('No conversations yet. Start a new chat to get going.')).toBeInTheDocument()
  })

  it('shows loading state for conversations', () => {
    render(<Sidebar {...defaultProps} conversations={[]} conversationsLoading />)

    expect(screen.getByText('Loading conversations...')).toBeInTheDocument()
  })

  it('shows conversation errors', () => {
    render(<Sidebar {...defaultProps} conversationsError="Failed to load conversations" />)

    expect(screen.getByText('Failed to load conversations')).toBeInTheDocument()
  })

  it('calls onNewChat and closes the sidebar when New Chat is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'New Chat' }))

    expect(defaultProps.onNewChat).toHaveBeenCalled()
    expect(defaultProps.onToggle).toHaveBeenCalled()
  })

  it('calls onSelectConversation when a chat is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByText('React Components Discussion'))

    expect(defaultProps.onSelectConversation).toHaveBeenCalledWith('1')
  })

  it('calls onDeleteConversation without selecting the chat', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(defaultProps.onDeleteConversation).toHaveBeenCalledWith('1')
    expect(defaultProps.onSelectConversation).not.toHaveBeenCalled()
  })

  it('loads documents and subscribes to their live index status', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])

    let capturedOnEvent: ((event: { documentId: string; status: string }) => void) | undefined
    mockDocumentService.subscribeToIndexStatus.mockImplementation((_id, onEvent) => {
      capturedOnEvent = onEvent
      return () => {}
    })

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(mockDocumentService.listDocuments).toHaveBeenCalled()
    })

    expect(screen.getByText('API Documentation.pdf')).toBeInTheDocument()
    expect(mockDocumentService.subscribeToIndexStatus).toHaveBeenCalledWith(
      '1',
      expect.any(Function),
      expect.any(Function)
    )

    // Before a status event arrives, we should not assume the document is indexed.
    expect(screen.getByText('Checking status…')).toBeInTheDocument()
    expect(screen.queryByText('Indexed')).not.toBeInTheDocument()

    act(() => {
      capturedOnEvent?.({ documentId: '1', status: 'completed' })
    })

    await waitFor(() => {
      expect(screen.getByText('Indexed')).toBeInTheDocument()
    })
  })

  it('shows "Indexing…" for an unrecognized live status instead of "Indexed"', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])

    mockDocumentService.subscribeToIndexStatus.mockImplementation((documentId, onEvent) => {
      onEvent({
        documentId,
        status: 'started',
        message: 'Indexing has started',
      })
      return () => {}
    })

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('Indexing…')).toBeInTheDocument()
    })
    expect(screen.queryByText('Indexed')).not.toBeInTheDocument()
  })

  it('shows an "Indexing…" badge while the backend status is pending (not "Indexed")', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])

    mockDocumentService.subscribeToIndexStatus.mockImplementation((documentId, onEvent) => {
      onEvent({
        documentId,
        status: 'pending',
        message: `Indexing is in progress for document: ${documentId}`,
      })
      return () => {}
    })

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('Indexing…')).toBeInTheDocument()
    })
    expect(screen.queryByText('Indexed')).not.toBeInTheDocument()
  })

  it('shows "Index Status Not Available" when the status endpoint 404s', async () => {
    const user = userEvent.setup()
    mockDocumentService.listDocuments.mockResolvedValue([
      {
        id: '1',
        name: 'API Documentation.pdf',
        uploadDate: '2026-01-01T00:00:00.000Z',
      },
    ])

    mockDocumentService.subscribeToIndexStatus.mockImplementation((_documentId, _onEvent, onError) => {
      onError?.(new HttpStatusError(404, 'HTTP 404: Not Found'))
      return () => {}
    })

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('Index Status Not Available')).toBeInTheDocument()
    })
    expect(screen.queryByText('Checking status…')).not.toBeInTheDocument()
    expect(screen.queryByText('Indexed')).not.toBeInTheDocument()
  })

  it('shows empty state when no documents exist', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByText('Docs'))

    await waitFor(() => {
      expect(screen.getByText('No documents yet. Upload a PDF or document to get started.')).toBeInTheDocument()
    })
  })

  it('uploads a document via uploadAndIndex and refreshes the document list', async () => {
    const user = userEvent.setup()
    mockDocumentService.uploadAndIndex.mockResolvedValue({
      documentId: 'doc-2',
      fileHash: 'hash-2',
      uploadStatus: 'Success',
      uploadError: null,
      indexingStatus: { vectorStore: 'Indexed' },
    })
    mockDocumentService.listDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          name: 'notes.pdf',
          uploadDate: '2026-01-02T00:00:00.000Z',
        },
      ])

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    const file = new File(['content'], 'notes.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockDocumentService.uploadAndIndex).toHaveBeenCalledWith(file)
    })

    await waitFor(() => {
      expect(mockDocumentService.listDocuments).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText('notes.pdf')).toBeInTheDocument()
  })

  it('shows an error when document upload fails', async () => {
    const user = userEvent.setup()
    mockDocumentService.uploadAndIndex.mockRejectedValue(new Error('Upload failed'))

    render(<Sidebar {...defaultProps} />)
    await user.click(screen.getByText('Docs'))

    const file = new File(['content'], 'notes.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })
})
