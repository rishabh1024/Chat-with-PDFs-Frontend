import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatService } from '../../services/chatService'

const mockFetch = vi.fn()
global.fetch = mockFetch
const conversationId = '123e4567-e89b-12d3-a456-426614174000'
const apiResponse = {
  conversation_id: conversationId,
  content: 'AI response',
}

describe('ChatService', () => {
  let chatService: ChatService

  beforeEach(() => {
    chatService = new ChatService('http://localhost:8000', 5000)
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('sendMessage', () => {
    it('posts to the messages endpoint with UserMessageRequest body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      })

      await chatService.sendMessage(conversationId, 'Hello, AI!')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/conversations/${conversationId}/messages`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            message_content: 'Hello, AI!',
          }),
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('returns successful response with message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      })

      const result = await chatService.sendMessage(conversationId, 'Test message')

      expect(result).toEqual({
        conversationId,
        message: 'AI response',
        success: true,
      })
    })

    it('throws error for HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(chatService.sendMessage(conversationId, 'Test message')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
    })

    it('throws error for invalid response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'no message field' }),
      })

      await expect(chatService.sendMessage(conversationId, 'Test message')).rejects.toThrow(
        'Invalid response format: missing chat response fields'
      )
    })

    it('handles timeout correctly', async () => {
      const chatServiceWithShortTimeout = new ChatService('http://localhost:8000', 100)
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(
        chatServiceWithShortTimeout.sendMessage(conversationId, 'Test message')
      ).rejects.toThrow('Request timeout - please try again')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(chatService.sendMessage(conversationId, 'Test message')).rejects.toThrow(
        'Network error'
      )
    })

    it('handles unknown errors', async () => {
      mockFetch.mockRejectedValue('String error')

      await expect(chatService.sendMessage(conversationId, 'Test message')).rejects.toThrow(
        'Unknown error occurred'
      )
    })

    it('handles empty response text on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => {
          throw new Error('No response body')
        },
      })

      await expect(chatService.sendMessage(conversationId, 'Test message')).rejects.toThrow(
        'HTTP 404: Unknown error'
      )
    })
  })

  describe('configuration methods', () => {
    it('allows setting new API URL', () => {
      chatService.setApiUrl('http://newapi.com')

      expect(chatService.getApiUrl()).toBe('http://newapi.com')
    })

    it('returns current API URL', () => {
      expect(chatService.getApiUrl()).toBe('http://localhost:8000')
    })

    it('uses new API URL for requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...apiResponse, content: 'response from new API' }),
      })

      chatService.setApiUrl('http://newapi.com')
      await chatService.sendMessage(conversationId, 'Test message')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://newapi.com/conversations/${conversationId}/messages`,
        expect.any(Object)
      )
    })
  })

  describe('constructor parameters', () => {
    it('uses default values when no parameters provided', () => {
      const defaultService = new ChatService()

      expect(defaultService.getApiUrl()).toBe('http://localhost:8000')
    })

    it('uses provided API URL and timeout', async () => {
      const customService = new ChatService('http://custom.api', 2000)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...apiResponse, content: 'response' }),
      })

      await customService.sendMessage(conversationId, 'test')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://custom.api/conversations/${conversationId}/messages`,
        expect.any(Object)
      )
    })
  })
})
