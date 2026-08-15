import { apiConfig } from '../config/api';
import { API_ENDPOINTS, FILE_UPLOAD_CONFIG } from '../constants';
import { DocumentRecord, IndexedDocumentUpload } from '../types/document';
import { validateFile } from '../utils';

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

  async listDocuments(): Promise<DocumentRecord[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.DOCUMENTS}`, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async uploadDocument(file: File): Promise<DocumentRecord> {
    const validation = this.validateDocument(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.DOCUMENTS}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

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
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.UPLOAD_AND_INDEX}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
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

  async deleteDocument(documentId: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.DOCUMENTS}/${documentId}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }
}

export const documentService = new DocumentService();
