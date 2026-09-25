import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setAccessToken } from '../../config/api'
import { ConversationService } from '../../services/conversationService'

const mockFetch = vi.fn()
global.fetch = mockFetch

const conversationId = '123e4567-e89b-12d3-a456-426614174000'
const userId = '223e4567-e89b-12d3-a456-426614174000'

const apiConversation = {
  id: conversationId,
  user_id: userId,
  title: 'Test Chat',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

describe('ConversationService', () => {
  let conversationService: ConversationService

  beforeEach(() => {
    setAccessToken('test-access-token')
    conversationService = new ConversationService('http://localhost:8000', 5000)
    mockFetch.mockClear()
  })

  afterEach(() => {
    setAccessToken(null)
    vi.clearAllTimers()
  })

  describe('listConversations', () => {
    it('fetches conversations from the all endpoint and maps fields', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: [apiConversation] }),
      })

      const result = await conversationService.listConversations()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/conversations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        })
      )
      expect(result).toEqual([
        {
          id: conversationId,
          userId,
          title: 'Test Chat',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ])
    })

    it('throws for invalid list response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      })

      await expect(conversationService.listConversations()).rejects.toThrow(
        'Invalid response format: missing conversations array'
      )
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(conversationService.listConversations()).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
    })
  })

  describe('createConversation', () => {
    it('posts a title and maps the created conversation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiConversation,
      })

      const result = await conversationService.createConversation('Hello world')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ title: 'Hello world' }),
          signal: expect.any(AbortSignal),
        })
      )
      expect(result.id).toBe(conversationId)
      expect(result.title).toBe('Test Chat')
    })

    it('defaults title to New Conversation when omitted', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...apiConversation, title: 'New Conversation' }),
      })

      await conversationService.createConversation()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/conversations',
        expect.objectContaining({
          body: JSON.stringify({ title: 'New Conversation' }),
        })
      )
    })

    it('throws for invalid create response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: conversationId }),
      })

      await expect(conversationService.createConversation('Hi')).rejects.toThrow(
        'Invalid response format: missing conversation fields'
      )
    })
  })

  describe('listMessages', () => {
    it('fetches from the messages list endpoint and maps a wrapped message list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          conversation_id: conversationId,
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'ai', content: 'Hi there' },
          ],
        }),
      })

      const result = await conversationService.listMessages(conversationId)

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/conversations/${conversationId}/messages`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        })
      )
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ content: 'Hello', role: 'user' })
      expect(result[1]).toMatchObject({ content: 'Hi there', role: 'assistant' })
    })

    it('maps role/content objects', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { role: 'user', content: 'Question' },
          { role: 'assistant', content: 'Answer' },
        ],
      })

      const result = await conversationService.listMessages(conversationId)

      expect(result[0]).toMatchObject({ content: 'Question', role: 'user' })
      expect(result[1]).toMatchObject({ content: 'Answer', role: 'assistant' })
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      })

      await expect(conversationService.listMessages(conversationId)).rejects.toThrow(
        'HTTP 500: Server Error'
      )
    })
  })

  describe('deleteConversation', () => {
    it('deletes by conversation id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      })

      await conversationService.deleteConversation(conversationId)

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/conversations/${conversationId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(conversationService.deleteConversation(conversationId)).rejects.toThrow(
        'HTTP 404: Not Found'
      )
    })
  })
})
