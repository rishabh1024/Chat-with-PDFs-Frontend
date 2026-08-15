import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentService } from '../../services/documentService'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DocumentService', () => {
  let documentService: DocumentService

  beforeEach(() => {
    documentService = new DocumentService('http://localhost:8000', 5000)
    mockFetch.mockClear()
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
    it('fetches documents from the API', async () => {
      const mockDocuments = [
        {
          id: '1',
          name: 'test.pdf',
          type: 'PDF',
          size: '1.0 KB',
          uploadDate: '2026-01-01T00:00:00.000Z',
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockDocuments,
      })

      const result = await documentService.listDocuments()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/documents',
        {
          method: 'GET',
          signal: expect.any(AbortSignal),
        }
      )
      expect(result).toEqual(mockDocuments)
    })

    it('throws on HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(documentService.listDocuments()).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
    })
  })

  describe('uploadDocument', () => {
    it('uploads a valid file using multipart form data', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const uploadedDocument = {
        id: '1',
        name: 'test.pdf',
        type: 'PDF',
        size: '7 B',
        uploadDate: '2026-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => uploadedDocument,
      })

      const result = await documentService.uploadDocument(file)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/documents',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
          signal: expect.any(AbortSignal),
        })
      )
      expect(result).toEqual(uploadedDocument)
    })

    it('rejects invalid files before making a request', async () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' })

      await expect(documentService.uploadDocument(file)).rejects.toThrow(
        'Unsupported file type'
      )
      expect(mockFetch).not.toHaveBeenCalled()
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
        'http://localhost:8000/upload_and_index',
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

  describe('deleteDocument', () => {
    it('sends a delete request for the document id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      })

      await documentService.deleteDocument('doc-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/documents/doc-1',
        {
          method: 'DELETE',
          signal: expect.any(AbortSignal),
        }
      )
    })

    it('throws on HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Document not found',
      })

      await expect(documentService.deleteDocument('missing')).rejects.toThrow(
        'HTTP 404: Document not found'
      )
    })
  })
})
