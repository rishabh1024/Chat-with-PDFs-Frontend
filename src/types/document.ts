export interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  url?: string;
}

export interface DocumentUploadResponse {
  document: DocumentRecord;
  success: boolean;
}

export interface IndexedDocumentUpload {
  documentId: string;
  fileHash: string;
  uploadStatus: 'Success' | 'Failed';
  uploadError: string | null;
  indexingStatus: Record<string, string>;
}
