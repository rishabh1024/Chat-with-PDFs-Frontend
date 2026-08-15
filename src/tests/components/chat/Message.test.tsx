import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test-utils/testing-library-utils'
import MessageComponent from '../../../components/chat/Message'
import type { Message } from '../../../types/chat'

describe('Message Component', () => {
  const mockUserMessage: Message = {
    id: '1',
    content: 'Hello, AI!',
    role: 'user',
    timestamp: new Date('2025-05-25T10:00:00Z'),
  }

  const mockAssistantMessage: Message = {
    id: '2',
    content: 'Hello! How can I help you today?',
    role: 'assistant',
    timestamp: new Date('2025-05-25T10:01:00Z'),
  }

  it('renders user message correctly', () => {
    render(<MessageComponent message={mockUserMessage} />)
    
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText(/\d{1,2}:\d{2}/i)).toBeInTheDocument()
  })

  it('renders assistant message correctly', () => {
    render(<MessageComponent message={mockAssistantMessage} />)
    
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText(/\d{1,2}:\d{2}/i)).toBeInTheDocument()
  })

  it('applies correct styling for user messages', () => {
    render(<MessageComponent message={mockUserMessage} />)
    
    const messageContainer = screen.getByText('Hello, AI!').closest('.bg-primary-500')
    expect(messageContainer).toHaveClass('bg-primary-500', 'text-white')
  })

  it('applies correct styling for assistant messages', () => {
    render(<MessageComponent message={mockAssistantMessage} />)
    
    const messageContainer = screen.getByText('Hello! How can I help you today?').closest('.bg-gray-100')
    expect(messageContainer).toHaveClass('bg-gray-100', 'text-gray-900')
  })

  it('displays user avatar icon', () => {
    const { container } = render(<MessageComponent message={mockUserMessage} />)
    
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays assistant avatar icon', () => {
    const { container } = render(<MessageComponent message={mockAssistantMessage} />)
    
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks in message content', () => {
    const messageWithBreaks: Message = {
      id: '3',
      content: 'Line 1\n\nLine 2',
      role: 'user',
      timestamp: new Date(),
    }

    render(<MessageComponent message={messageWithBreaks} />)
    
    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText('Line 2')).toBeInTheDocument()
  })

  it('handles long messages correctly', () => {
    const longMessage: Message = {
      id: '4',
      content: 'This is a very long message that should wrap properly within the message bubble container and not overflow outside the boundaries.',
      role: 'assistant',
      timestamp: new Date(),
    }

    render(<MessageComponent message={longMessage} />)
    
    expect(screen.getByText(longMessage.content)).toBeInTheDocument()
  })

  it('formats timestamp correctly', () => {
    const specificTime = new Date('2025-05-25T14:30:00Z')
    const messageWithSpecificTime: Message = {
      id: '5',
      content: 'Test message',
      role: 'user',
      timestamp: specificTime,
    }

    const expectedTime = specificTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    render(<MessageComponent message={messageWithSpecificTime} />)
    
    expect(screen.getByText(expectedTime)).toBeInTheDocument()
  })

  it('handles empty message content', () => {
    const emptyMessage: Message = {
      id: '6',
      content: '',
      role: 'user',
      timestamp: new Date(),
    }

    render(<MessageComponent message={emptyMessage} />)
    
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('handles special characters in message content', () => {
    const specialCharsMessage: Message = {
      id: '7',
      content: 'Special chars: @#$%^&*()_+{}|:<>?[];\'",./`~',
      role: 'assistant',
      timestamp: new Date(),
    }

    render(<MessageComponent message={specialCharsMessage} />)
    
    expect(screen.getByText(/Special chars:/)).toBeInTheDocument()
    expect(screen.getByText(/@#\$%\^&\*/)).toBeInTheDocument()
  })

  it('renders bold markdown in assistant messages', () => {
    const markdownMessage: Message = {
      id: '8',
      content: 'He worked at **Amazon**.',
      role: 'assistant',
      timestamp: new Date(),
    }

    render(<MessageComponent message={markdownMessage} />)

    expect(screen.getByText('Amazon').tagName).toBe('STRONG')
    expect(screen.queryByText(/\*\*Amazon\*\*/)).not.toBeInTheDocument()
  })

  it('renders markdown lists in assistant messages', () => {
    const markdownMessage: Message = {
      id: '9',
      content: '1. **Amazon**\n2. **Omnipresent Robot Tech**',
      role: 'assistant',
      timestamp: new Date(),
    }

    render(<MessageComponent message={markdownMessage} />)

    expect(screen.getByText('Amazon').tagName).toBe('STRONG')
    expect(screen.getByText('Omnipresent Robot Tech').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders markdown links in assistant messages', () => {
    const markdownMessage: Message = {
      id: '10',
      content: 'See [docs](https://example.com/docs)',
      role: 'assistant',
      timestamp: new Date(),
    }

    render(<MessageComponent message={markdownMessage} />)

    const link = screen.getByRole('link', { name: 'docs' })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('still renders plain text without markdown normally', () => {
    render(<MessageComponent message={mockAssistantMessage} />)

    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
  })
})
