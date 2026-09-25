import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test-utils/testing-library-utils'
import userEvent from '@testing-library/user-event'
import ChatContainer from '../../../components/chat/ChatContainer'
import { chatService } from '../../../services/chatService'
import { conversationService } from '../../../services/conversationService'
import { documentService } from '../../../services/documentService'
import { Conversation } from '../../../types/chat'

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'token' },
    user: {
      id: 'user-1',
      email: 'alex@example.com',
      user_metadata: { name: 'Alex Rivera', full_name: 'Alex Rivera' },
    },
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('../../../services/chatService', () => ({
  chatService: {
    sendMessage: vi.fn(),
  },
}))

vi.mock('../../../services/conversationService', () => ({
  conversationService: {
    createConversation: vi.fn(),
    listMessages: vi.fn(),
  },
}))

vi.mock('../../../services/documentService', () => ({
  documentService: {
    uploadAndIndex: vi.fn(),
  },
}))

const conversationId = '123e4567-e89b-12d3-a456-426614174000'
const createdConversation: Conversation = {
  id: conversationId,
  userId: '223e4567-e89b-12d3-a456-426614174000',
  title: 'Hello, AI!',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const defaultProps = {
  conversationId: conversationId as string | null,
  conversationTitle: 'Existing Chat' as string | null,
  onConversationCreated: vi.fn(),
  onConversationUpdated: vi.fn(),
}

describe('ChatContainer', () => {
  const mockSendMessage = vi.mocked(chatService.sendMessage)
  const mockCreateConversation = vi.mocked(conversationService.createConversation)
  const mockListMessages = vi.mocked(conversationService.listMessages)
  const mockUploadAndIndex = vi.mocked(documentService.uploadAndIndex)

  beforeEach(() => {
    mockSendMessage.mockClear()
    mockCreateConversation.mockReset()
    mockListMessages.mockReset()
    mockListMessages.mockResolvedValue([])
    mockUploadAndIndex.mockReset()
    defaultProps.onConversationCreated.mockClear()
    defaultProps.onConversationUpdated.mockClear()
  })

  it('renders the chat interface correctly for an existing conversation', async () => {
    render(<ChatContainer {...defaultProps} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Existing Chat' })).toBeInTheDocument()
    expect(screen.getByText('Powered by FastAPI')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Message AI Assistant...')).toBeInTheDocument()
    expect(await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')).toBeInTheDocument()
    expect(mockListMessages).toHaveBeenCalledWith(conversationId)
  })

  it('loads and displays messages for a selected conversation', async () => {
    mockListMessages.mockResolvedValue([
      {
        id: 'm1',
        content: 'Saved user message',
        role: 'user',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'm2',
        content: 'Saved AI reply',
        role: 'assistant',
        timestamp: new Date('2026-01-01T00:01:00.000Z'),
      },
    ])

    render(<ChatContainer {...defaultProps} />)

    expect(await screen.findByText('Saved user message')).toBeInTheDocument()
    expect(screen.getByText('Saved AI reply')).toBeInTheDocument()
  })

  it('displays welcome message for a draft conversation', () => {
    render(
      <ChatContainer
        {...defaultProps}
        conversationId={null}
        conversationTitle={null}
      />
    )

    expect(screen.getByText('Hello Alex')).toBeInTheDocument()
    expect(screen.getByText('Start a conversation by typing a message below. I\'m here to assist you with any questions or tasks.')).toBeInTheDocument()
  })

  it('creates a conversation on first draft send then sends the message', async () => {
    const user = userEvent.setup()
    mockCreateConversation.mockResolvedValue(createdConversation)
    mockSendMessage.mockResolvedValue({
      conversationId,
      message: 'Hello! How can I help you?',
      success: true,
    })

    render(
      <ChatContainer
        {...defaultProps}
        conversationId={null}
        conversationTitle={null}
      />
    )

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Hello, AI!')
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalledWith('Hello, AI!')
    })
    expect(mockSendMessage).toHaveBeenCalledWith(conversationId, 'Hello, AI!')
    expect(defaultProps.onConversationCreated).toHaveBeenCalledWith(createdConversation)
  })

  it('allows user to type and send a message in an existing conversation', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      conversationId,
      message: 'Hello! How can I help you?',
      success: true,
    })

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Hello, AI!')
    await user.click(sendButton)

    expect(mockCreateConversation).not.toHaveBeenCalled()
    expect(mockSendMessage).toHaveBeenCalledWith(conversationId, 'Hello, AI!')
  })

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      conversationId,
      message: 'Response from AI',
      success: true,
    })

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')

    await user.type(textarea, 'Test message{enter}')

    expect(mockSendMessage).toHaveBeenCalledWith(conversationId, 'Test message')
  })

  it('prevents sending empty messages', async () => {
    const user = userEvent.setup()
    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.click(sendButton)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('shows loading state while sending message', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockImplementation(() => new Promise(resolve =>
      setTimeout(() => resolve({
        conversationId,
      message: 'Response',
        success: true,
      }), 100)
    ))

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Test message')
    await user.click(sendButton)

    expect(sendButton).toBeDisabled()
  })

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockRejectedValue(new Error('API Error'))

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Test message')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText(/API Error/)).toBeInTheDocument()
    })
  })

  it('allows dismissing error messages', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockRejectedValue(new Error('Test error'))

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Test message')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })

    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)

    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument()
  })

  it('validates message length', async () => {
    const user = userEvent.setup()
    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    const longMessage = 'a'.repeat(4001)
    fireEvent.change(textarea, { target: { value: longMessage } })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Message too long/)).toBeInTheDocument()
    })

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('displays user and AI messages correctly', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      conversationId,
      message: 'AI response message',
      success: true,
    })

    render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'User message')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('User message')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('AI response message')).toBeInTheDocument()
    })

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getAllByText('AI Assistant').length).toBeGreaterThan(0)
  })

  it('keeps in-session messages when switching conversations', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      conversationId,
      message: 'AI response message',
      success: true,
    })
    mockListMessages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { rerender } = render(<ChatContainer {...defaultProps} />)
    await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')

    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith(conversationId)
    })

    await user.type(screen.getByPlaceholderText('Message AI Assistant...'), 'User message')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(screen.getByText('AI response message')).toBeInTheDocument()
    })

    rerender(
      <ChatContainer
        {...defaultProps}
        conversationId="other-chat"
        conversationTitle="Other Chat"
      />
    )

    await waitFor(() => {
      expect(mockListMessages).toHaveBeenCalledWith('other-chat')
    })
    expect(screen.queryByText('User message')).not.toBeInTheDocument()
    expect(await screen.findByText('Messages for this chat will appear here. Send a message to continue the conversation.')).toBeInTheDocument()

    rerender(<ChatContainer {...defaultProps} />)

    expect(screen.getByText('User message')).toBeInTheDocument()
    expect(screen.getByText('AI response message')).toBeInTheDocument()
  })

  it('opens the attachment picker from the composer', async () => {
    const user = userEvent.setup()
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(<ChatContainer {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attach document' }))

    expect(inputClick).toHaveBeenCalled()
    inputClick.mockRestore()
  })

  it('uploads, displays, and removes an indexed attachment', async () => {
    const user = userEvent.setup()
    const file = new File(['document'], 'profile.pdf', { type: 'application/pdf' })
    mockUploadAndIndex.mockResolvedValue({
      documentId: 'document-1',
      fileHash: 'hash-1',
      uploadStatus: 'Success',
      uploadError: null,
      indexingStatus: { vectorStore: 'Indexed' },
    })
    render(<ChatContainer {...defaultProps} />)

    await user.upload(screen.getByTestId('chat-attachment-input'), file)

    expect(mockUploadAndIndex).toHaveBeenCalledWith(file)
    expect(await screen.findByText('profile.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Uploaded and indexed/)).toHaveTextContent('Indexed')

    await user.click(screen.getByRole('button', { name: 'Remove attachment' }))
    expect(screen.queryByText('profile.pdf')).not.toBeInTheDocument()
  })

  it('shows progress while an attachment is uploading', async () => {
    const user = userEvent.setup()
    const file = new File(['document'], 'profile.pdf', { type: 'application/pdf' })
    let finishUpload!: (value: Awaited<ReturnType<typeof documentService.uploadAndIndex>>) => void
    mockUploadAndIndex.mockImplementation(() => new Promise(resolve => {
      finishUpload = resolve
    }))
    render(<ChatContainer {...defaultProps} />)

    await user.upload(screen.getByTestId('chat-attachment-input'), file)

    expect(screen.getByRole('button', { name: 'Uploading attachment' })).toBeDisabled()

    finishUpload({
      documentId: 'document-1',
      fileHash: 'hash-1',
      uploadStatus: 'Success',
      uploadError: null,
      indexingStatus: { vectorStore: 'Indexed' },
    })

    expect(await screen.findByText('profile.pdf')).toBeInTheDocument()
  })

  it('shows an inline error when attachment upload fails', async () => {
    const user = userEvent.setup()
    const file = new File(['document'], 'profile.pdf', { type: 'application/pdf' })
    mockUploadAndIndex.mockRejectedValue(new Error('Indexing service unavailable'))
    render(<ChatContainer {...defaultProps} />)

    await user.upload(screen.getByTestId('chat-attachment-input'), file)

    expect(await screen.findByText('Indexing service unavailable')).toBeInTheDocument()
    expect(screen.queryByText('profile.pdf')).not.toBeInTheDocument()
  })

  it('allows new line with Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<ChatContainer {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Message AI Assistant...')

    await user.type(textarea, 'Line 1')
    fireEvent.keyPress(textarea, { key: 'Enter', code: 'Enter', shiftKey: true, charCode: 13 })
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } })

    expect(textarea).toHaveValue('Line 1\nLine 2')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })
})


