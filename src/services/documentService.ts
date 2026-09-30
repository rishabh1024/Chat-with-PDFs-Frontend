import { apiConfig, apiFetch, getAuthHeaders } from '../config/api';
import { API_ENDPOINTS, FILE_UPLOAD_CONFIG } from '../constants';
import { DocumentIndexStatusEvent, DocumentRecord, IndexedDocumentUpload } from '../types/document';
import { validateFile } from '../utils';

/** Error thrown by API calls that includes the HTTP status code, when known. */
export class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

const requestFailedMessage = (status: number): string => `Request failed (HTTP ${status})`;

/** Extracts the JSON payload from a single `data: {...}` SSE frame, if present. */
const parseSseFrame = (frame: string): Record<string, unknown> | null => {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');

  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const normalizeSseBuffer = (buffer: string): string => buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const emitParsedStatusEvent = (
  rawFrame: string,
  documentId: string,
  onEvent: (event: DocumentIndexStatusEvent) => void
): void => {
  const parsed = parseSseFrame(rawFrame);
  if (parsed && typeof parsed.status === 'string') {
    onEvent({
      documentId: typeof parsed.document_id === 'string' ? parsed.document_id : documentId,
      status: parsed.status,
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      updatedAt: typeof parsed.updated_at === 'string' ? parsed.updated_at : undefined,
    });
  }
};

interface UploadedDocumentResponse {
  document_id: string;
  document_name: string;
  created_at: string;
}

const normalizeDocument = (document: UploadedDocumentResponse): DocumentRecord => ({
  id: document.document_id,
  name: document.document_name,
  uploadDate: document.created_at,
});

const uploadTimeMs = (uploadDate: string): number | null => {
  const ms = new Date(uploadDate).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * /upload/documents can contain multiple rows for the same document_id
 * (e.g. the same file content uploaded more than once, which hashes to the
 * same id). Collapse those down to a single entry — the most recently
 * uploaded one — so the UI (and per-document status subscriptions) only
 * ever deals with one record per unique document.
 */
const dedupeDocumentsById = (documents: DocumentRecord[]): DocumentRecord[] => {
  const latestIndexById = new Map<string, number>();

  documents.forEach((doc, index) => {
    const existingIndex = latestIndexById.get(doc.id);
    const newTime = uploadTimeMs(doc.uploadDate);

    if (existingIndex === undefined) {
      latestIndexById.set(doc.id, index);
      return;
    }

    const existingTime = uploadTimeMs(documents[existingIndex].uploadDate);

    if (existingTime === null && newTime !== null) {
      latestIndexById.set(doc.id, index);
    } else if (existingTime !== null && newTime !== null && newTime > existingTime) {
      latestIndexById.set(doc.id, index);
    }
  });

  const keepIndices = new Set(latestIndexById.values());
  return documents.filter((_, index) => keepIndices.has(index));
};

export class DocumentService {
  private apiUrl: string;
  private timeout: number;

  constructor(apiUrl: string = apiConfig.baseUrl, timeout: number = apiConfig.timeout) {
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  validateDocument(file: File): { isValid: boolean; error?: string } {
    return validateFile(
      file,
      FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES,
      FILE_UPLOAD_CONFIG.MAX_FILE_SIZE
    );
  }

  /** GET /upload/documents — list documents already uploaded and indexed by the user. */
  async listDocuments(): Promise<DocumentRecord[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await apiFetch(`${this.apiUrl}${API_ENDPOINTS.LIST_DOCUMENTS}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(requestFailedMessage(response.status));
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeDocument) : [];
      return dedupeDocumentsById(normalized);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** POST /upload/ — upload a file and kick off indexing in one step. */
  async uploadAndIndex(file: File): Promise<IndexedDocumentUpload> {
    const validation = this.validateDocument(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const formData = new FormData();
    formData.append('input_file', file);

    try {
      const response = await apiFetch(`${this.apiUrl}${API_ENDPOINTS.UPLOAD_AND_INDEX}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(requestFailedMessage(response.status));
      }

      const data = await response.json();

      if (
        !data.document_id ||
        !data.file_hash ||
        !data.upload_status ||
        typeof data.document_indexing_status !== 'object'
      ) {
        throw new Error('Invalid upload response format');
      }

      return {
        documentId: data.document_id,
        fileHash: data.file_hash,
        uploadStatus: data.upload_status,
        uploadError: data.upload_error ?? null,
        indexingStatus: data.document_indexing_status,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET /upload/index_status/{document_id}/events — subscribes to the live indexing
   * status stream (SSE) for a document. Returns an unsubscribe function.
   */
  subscribeToIndexStatus(
    documentId: string,
    onEvent: (event: DocumentIndexStatusEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await apiFetch(
          `${this.apiUrl}${API_ENDPOINTS.INDEX_STATUS_EVENTS(documentId)}`,
          {
            method: 'GET',
            headers: getAuthHeaders({ Accept: 'text/event-stream' }),
            signal: controller.signal,
          }
        );

        if (!response.ok || !response.body) {
          throw new HttpStatusError(response.status, requestFailedMessage(response.status));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processBuffer = (finalFlush: boolean) => {
          buffer = normalizeSseBuffer(buffer);
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            emitParsedStatusEvent(frame, documentId, onEvent);
            boundary = buffer.indexOf('\n\n');
          }
          if (finalFlush && buffer.trim()) {
            emitParsedStatusEvent(buffer, documentId, onEvent);
            buffer = '';
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            processBuffer(true);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          processBuffer(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          onError?.(error);
        }
      }
    })();

    return () => controller.abort();
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }
}

export const documentService = new DocumentService();
