/** A document previously uploaded and indexed by the user (GET /upload/documents). */
export interface DocumentRecord {
  id: string;
  name: string;
  uploadDate: string;
}

export interface IndexedDocumentUpload {
  documentId: string;
  fileHash: string;
  uploadStatus: 'Success' | 'Failed';
  uploadError: string | null;
  indexingStatus: Record<string, string>;
}

/** A single status update from GET /upload/index_status/{document_id}/events (SSE). */
export interface DocumentIndexStatusEvent {
  documentId: string;
  status: string;
  message?: string;
  updatedAt?: string;
}
