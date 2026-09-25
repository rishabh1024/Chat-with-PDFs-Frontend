import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test-utils/testing-library-utils'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../../../components/layout'
import { documentService } from '../../../services/documentService'
import { Conversation } from '../../../types/chat'

vi.mock('../../../services/documentService', () => ({
  documentService: {
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
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
  })

  it('renders sidebar with tabs', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByLabelText('Chat with PDFs')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
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

  it('calls onNewChat when New Chat is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'New Chat' }))

    expect(defaultProps.onNewChat).toHaveBeenCalled()
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
