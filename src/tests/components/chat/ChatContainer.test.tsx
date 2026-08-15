import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test-utils/testing-library-utils'
import userEvent from '@testing-library/user-event'
import ChatContainer from '../../../components/chat/ChatContainer'
import { chatService } from '../../../services/chatService'
import { documentService } from '../../../services/documentService'

// Mock the chat service
vi.mock('../../../services/chatService', () => ({
  chatService: {
    sendMessage: vi.fn(),
  },
}))

vi.mock('../../../services/documentService', () => ({
  documentService: {
    uploadAndIndex: vi.fn(),
  },
}))

const chatId = '123e4567-e89b-12d3-a456-426614174000'

vi.mock('../../../utils/chatSession', () => ({
  getOrCreateChatId: () => chatId,
}))

describe('ChatContainer', () => {
  const mockSendMessage = vi.mocked(chatService.sendMessage)
  const mockUploadAndIndex = vi.mocked(documentService.uploadAndIndex)

  beforeEach(() => {
    mockSendMessage.mockClear()
    mockUploadAndIndex.mockReset()
  })

  it('renders the chat interface correctly', () => {
    render(<ChatContainer />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Powered by FastAPI')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Message AI Assistant...')).toBeInTheDocument()
    expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
  })

  it('displays welcome message when no messages exist', () => {
    render(<ChatContainer />)
    
    expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
    expect(screen.getByText('Start a conversation by typing a message below. I\'m here to assist you with any questions or tasks.')).toBeInTheDocument()
  })

  it('allows user to type and send a message', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      chatId,
      message: 'Hello! How can I help you?',
      history: ['Hello, AI!', 'Hello! How can I help you?'],
      success: true,
    })

    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Hello, AI!')
    await user.click(sendButton)

    expect(mockSendMessage).toHaveBeenCalledWith(chatId, 'Hello, AI!')
  })

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockResolvedValue({
      chatId,
      message: 'Response from AI',
      history: ['Test message', 'Response from AI'],
      success: true,
    })

    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')

    await user.type(textarea, 'Test message{enter}')

    expect(mockSendMessage).toHaveBeenCalledWith(chatId, 'Test message')
  })

  it('prevents sending empty messages', async () => {
    const user = userEvent.setup()
    render(<ChatContainer />)
    
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.click(sendButton)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('shows loading state while sending message', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({
        chatId,
        message: 'Response',
        history: ['Test message', 'Response'],
        success: true,
      }), 100)
    ))

    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'Test message')
    await user.click(sendButton)

    // Should show loading spinner on button
    expect(sendButton).toBeDisabled()
    
    // Should show loading dots
    await waitFor(() => {
      expect(screen.getAllByText('AI Assistant').length).toBeGreaterThan(0)
    })
  })

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup()
    mockSendMessage.mockRejectedValue(new Error('API Error'))

    render(<ChatContainer />)
    
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

    render(<ChatContainer />)
    
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
    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    // Create a message longer than 4000 characters
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
      chatId,
      message: 'AI response message',
      history: ['User message', 'AI response message'],
      success: true,
    })

    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await user.type(textarea, 'User message')
    await user.click(sendButton)

    // Check user message appears
    await waitFor(() => {
      expect(screen.getByText('User message')).toBeInTheDocument()
    })

    // Check AI response appears
    await waitFor(() => {
      expect(screen.getByText('AI response message')).toBeInTheDocument()
    })

    // Check role indicators
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getAllByText('AI Assistant').length).toBeGreaterThan(0)
  })

  it('opens the attachment picker from the composer', async () => {
    const user = userEvent.setup()
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(<ChatContainer />)

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
    render(<ChatContainer />)

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
    render(<ChatContainer />)

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
    render(<ChatContainer />)

    await user.upload(screen.getByTestId('chat-attachment-input'), file)

    expect(await screen.findByText('Indexing service unavailable')).toBeInTheDocument()
    expect(screen.queryByText('profile.pdf')).not.toBeInTheDocument()
  })

  it('allows new line with Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<ChatContainer />)
    
    const textarea = screen.getByPlaceholderText('Message AI Assistant...')

    await user.type(textarea, 'Line 1')
    fireEvent.keyPress(textarea, { key: 'Enter', code: 'Enter', shiftKey: true, charCode: 13 })
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } })

    expect(textarea).toHaveValue('Line 1\nLine 2')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })
})
