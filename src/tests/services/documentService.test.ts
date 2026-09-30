import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setAccessToken } from '../../config/api'
import { DocumentService } from '../../services/documentService'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DocumentService', () => {
  let documentService: DocumentService

  beforeEach(() => {
    setAccessToken('test-access-token')
    documentService = new DocumentService('http://localhost:8000', 5000)
    mockFetch.mockClear()
  })

  afterEach(() => {
    setAccessToken(null)
  })

  describe('validateDocument', () => {
    it('accepts supported file types under the size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      expect(documentService.validateDocument(file)).toEqual({ isValid: true })
    })

    it('rejects unsupported file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' })

      expect(documentService.validateDocument(file).isValid).toBe(false)
    })

    it('rejects files over the size limit', () => {
      const largeContent = new Uint8Array(11 * 1024 * 1024)
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      expect(documentService.validateDocument(file).isValid).toBe(false)
    })
  })

  describe('listDocuments', () => {
    it('fetches documents from GET /upload/documents and maps the response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document_id: '1',
            document_name: 'test.pdf',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      })

      const result = await documentService.listDocuments()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/upload/documents',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        })
      )
      expect(result).toEqual([
        { id: '1', name: 'test.pdf', uploadDate: '2026-01-01T00:00:00.000Z' },
      ])
    })

    it('de-duplicates rows that share the same document_id, keeping the most recent one', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document_id: 'dup-1',
            document_name: 'first-upload.pdf',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            document_id: 'unique-1',
            document_name: 'other.pdf',
            created_at: '2026-01-01T12:00:00.000Z',
          },
          {
            document_id: 'dup-1',
            document_name: 'second-upload.pdf',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      })

      const result = await documentService.listDocuments()

      expect(result).toEqual([
        { id: 'unique-1', name: 'other.pdf', uploadDate: '2026-01-01T12:00:00.000Z' },
        { id: 'dup-1', name: 'second-upload.pdf', uploadDate: '2026-01-02T00:00:00.000Z' },
      ])
    })

    it('returns an empty array when the response is not an array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const result = await documentService.listDocuments()

      expect(result).toEqual([])
    })

    it('throws on HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(documentService.listDocuments()).rejects.toThrow('Request failed (HTTP 500)')
    })

    it('keeps a document when created_at is invalid until a newer valid row appears', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document_id: 'bad-date',
            document_name: 'orphan.pdf',
            created_at: 'not-a-date',
          },
          {
            document_id: 'bad-date',
            document_name: 'replacement.pdf',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      })

      const result = await documentService.listDocuments()

      expect(result).toEqual([
        { id: 'bad-date', name: 'replacement.pdf', uploadDate: '2026-01-02T00:00:00.000Z' },
      ])
    })

    it('retains the first row when all created_at values for an id are invalid', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document_id: 'bad-date',
            document_name: 'first.pdf',
            created_at: 'not-a-date',
          },
          {
            document_id: 'bad-date',
            document_name: 'second.pdf',
            created_at: 'also-invalid',
          },
        ],
      })

      const result = await documentService.listDocuments()

      expect(result).toEqual([
        { id: 'bad-date', name: 'first.pdf', uploadDate: 'not-a-date' },
      ])
    })
  })

  describe('subscribeToIndexStatus', () => {
    const createStreamResponse = (chunks: string[]) => {
      let index = 0
      const encoder = new TextEncoder()
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (index >= chunks.length) {
                return { done: true, value: undefined }
              }
              const value = encoder.encode(chunks[index])
              index += 1
              return { done: false, value }
            },
          }),
        },
      }
    }

    it('parses SSE frames delimited with CRLF', async () => {
      const onEvent = vi.fn()
      mockFetch.mockResolvedValue(
        createStreamResponse([
          'data: {"document_id":"1","status":"pending"}\r\n\r\n',
          'data: {"document_id":"1","status":"completed"}\r\n\r\n',
        ])
      )

      const unsubscribe = documentService.subscribeToIndexStatus('1', onEvent)
      await vi.waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(2)
      })
      unsubscribe()
    })

    it('parses a final frame without a trailing blank line', async () => {
      const onEvent = vi.fn()
      mockFetch.mockResolvedValue(
        createStreamResponse(['data: {"document_id":"1","status":"completed"}\r\n'])
      )

      const unsubscribe = documentService.subscribeToIndexStatus('1', onEvent)
      await vi.waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'completed' })
        )
      })
      unsubscribe()
    })
  })

  describe('uploadAndIndex', () => {
    it('uses the existing FastAPI upload endpoint and maps its response', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          document_id: 'document-1',
          file_hash: 'hash-1',
          upload_status: 'Success',
          upload_error: null,
          document_indexing_status: { vectorStore: 'Indexed' },
        }),
      })

      const result = await documentService.uploadAndIndex(file)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/upload/',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
          signal: expect.any(AbortSignal),
        })
      )
      const request = mockFetch.mock.calls[0][1]
      expect(request.body.get('input_file')).toBe(file)
      expect(result).toEqual({
        documentId: 'document-1',
        fileHash: 'hash-1',
        uploadStatus: 'Success',
        uploadError: null,
        indexingStatus: { vectorStore: 'Indexed' },
      })
    })

    it('rejects invalid files before making a request', async () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' })

      await expect(documentService.uploadAndIndex(file)).rejects.toThrow(
        'Unsupported file type'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects invalid response data', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ upload_status: 'Success' }),
      })

      await expect(documentService.uploadAndIndex(file)).rejects.toThrow(
        'Invalid upload response format'
      )
    })
  })
})
