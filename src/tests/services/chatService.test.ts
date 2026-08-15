import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatService } from '../../services/chatService'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch
const chatId = '123e4567-e89b-12d3-a456-426614174000'
const apiResponse = {
  chat_id: chatId,
  ai_message: 'AI response',
  chat_history_messages: ['Hello', 'AI response'],
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
    it('sends message to correct endpoint with proper payload', async () => {
      const mockResponse = {
        ok: true,
        json: async () => apiResponse,
      }
      mockFetch.mockResolvedValue(mockResponse)

      await chatService.sendMessage(chatId, 'Hello, AI!')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/chat/conversation/${chatId}/messages/?message_query=Hello%2C+AI%21`,
        {
          method: 'POST',
          signal: expect.any(AbortSignal),
        }
      )
    })

    it('returns successful response with message', async () => {
      const mockResponse = {
        ok: true,
        json: async () => apiResponse,
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await chatService.sendMessage(chatId, 'Test message')

      expect(result).toEqual({
        chatId,
        message: 'AI response',
        history: ['Hello', 'AI response'],
        success: true,
      })
    })

    it('encodes special characters in the message query', async () => {
      const mockResponse = {
        ok: true,
        json: async () => apiResponse,
      }
      mockFetch.mockResolvedValue(mockResponse)

      await chatService.sendMessage(chatId, 'What is 2 + 2?')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('message_query=What+is+2+%2B+2%3F'),
        expect.any(Object)
      )
    })

    it('throws error for HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(chatService.sendMessage(chatId, 'Test message')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
    })

    it('throws error for invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: 'no message field' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(chatService.sendMessage(chatId, 'Test message')).rejects.toThrow(
        'Invalid response format: missing chat response fields'
      )
    })

    it('handles timeout correctly', async () => {
      const chatServiceWithShortTimeout = new ChatService('http://localhost:8000', 100)
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(
        chatServiceWithShortTimeout.sendMessage(chatId, 'Test message')
      ).rejects.toThrow('Request timeout - please try again')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(chatService.sendMessage(chatId, 'Test message')).rejects.toThrow(
        'Network error'
      )
    })

    it('handles unknown errors', async () => {
      mockFetch.mockRejectedValue('String error')

      await expect(chatService.sendMessage(chatId, 'Test message')).rejects.toThrow(
        'Unknown error occurred'
      )
    })

    it('handles empty response text on error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => { throw new Error('No response body') },
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(chatService.sendMessage(chatId, 'Test message')).rejects.toThrow(
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
      const mockResponse = {
        ok: true,
        json: async () => ({ ...apiResponse, ai_message: 'response from new API' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      chatService.setApiUrl('http://newapi.com')
      await chatService.sendMessage(chatId, 'Test message')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://newapi.com/chat/conversation/${chatId}/messages/?message_query=Test+message`,
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
      const mockResponse = {
        ok: true,
        json: async () => ({ ...apiResponse, ai_message: 'response' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await customService.sendMessage(chatId, 'test')

      expect(mockFetch).toHaveBeenCalledWith(
        `http://custom.api/chat/conversation/${chatId}/messages/?message_query=test`,
        expect.any(Object)
      )
    })
  })
})
