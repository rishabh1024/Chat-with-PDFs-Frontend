import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FILE_UPLOAD_CONFIG } from '../../constants';
import { documentService, HttpStatusError } from '../../services/documentService';
import { Conversation } from '../../types/chat';
import { DocumentIndexStatusEvent, DocumentRecord } from '../../types/document';
import Logo from '../brand/Logo';

const SUCCESS_STATUSES = new Set(['completed', 'success', 'indexed']);
const FAILED_STATUSES = new Set(['failed', 'error']);
const TERMINAL_STATUSES = new Set([...SUCCESS_STATUSES, ...FAILED_STATUSES]);
/** Synthetic status used when the index-status endpoint can't tell us anything (e.g. 404). */
const STATUS_UNAVAILABLE = 'unavailable';

const SIDEBAR_TABS = [
  { id: 'history', label: 'History', icon: '💬' },
  { id: 'documents', label: 'Docs', icon: '📄' },
] as const;

type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  activeConversationId: string | null;
  deletingConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  conversationsLoading,
  conversationsError,
  activeConversationId,
  deletingConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTabId>('history');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, DocumentIndexStatusEvent>>({});
  const documentSubscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimeAgo = (date: Date | string) => {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const data = await documentService.listDocuments();
      setDocuments(data);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  const clearDocumentSubscriptions = useCallback(() => {
    documentSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    documentSubscriptionsRef.current.clear();
  }, []);

  // Subscribe to live indexing status per document so the badge reflects
  // the real backend state instead of assuming everything is "Indexed".
  const subscribeToDocumentStatus = useCallback((documentId: string) => {
    if (documentSubscriptionsRef.current.has(documentId)) return;

    const unsubscribe = documentService.subscribeToIndexStatus(
      documentId,
      (event) => {
        setDocumentStatuses((prev) => ({ ...prev, [documentId]: event }));

        if (TERMINAL_STATUSES.has(event.status.toLowerCase())) {
          documentSubscriptionsRef.current.get(documentId)?.();
          documentSubscriptionsRef.current.delete(documentId);
        }
      },
      (error) => {
        const abort = documentSubscriptionsRef.current.get(documentId);
        abort?.();
        documentSubscriptionsRef.current.delete(documentId);

        const message =
          error instanceof HttpStatusError && error.status === 404
            ? 'Index status not found for this document'
            : 'Could not load index status';

        setDocumentStatuses((prev) => ({
          ...prev,
          [documentId]: { documentId, status: STATUS_UNAVAILABLE, message },
        }));
      }
    );

    documentSubscriptionsRef.current.set(documentId, unsubscribe);
  }, []);

  useEffect(() => {
    if (activeTab !== 'documents') {
      clearDocumentSubscriptions();
      return;
    }

    documents.forEach((doc) => subscribeToDocumentStatus(doc.id));

    return () => {
      clearDocumentSubscriptions();
    };
  }, [activeTab, documents, subscribeToDocumentStatus, clearDocumentSubscriptions]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsUploading(true);
    setDocumentsError(null);

    try {
      await documentService.uploadAndIndex(file);
      // The upload response doesn't include the canonical document record,
      // so refresh from GET /upload/documents to pick it up.
      await loadDocuments();
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewChat = () => {
    onNewChat();
    onToggle();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}
      <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '320px' }}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Logo size={36} className="text-[13px]" />
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title="Close sidebar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Recent Chats</h3>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  New Chat
                </button>
              </div>

              {conversationsError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {conversationsError}
                </p>
              )}

              {conversationsLoading && (
                <p className="text-xs text-gray-500">Loading conversations...</p>
              )}

              {!conversationsLoading && conversations.length === 0 && (
                <p className="text-xs text-gray-500">
                  No conversations yet. Start a new chat to get going.
                </p>
              )}

              {conversations.map((chat) => (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(chat.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectConversation(chat.id);
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeConversationId === chat.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {chat.title ?? 'New Conversation'}
                      </h4>
                      <span className="text-xs text-gray-400 mt-2 block">
                        {formatTimeAgo(chat.updatedAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteConversation(chat.id);
                      }}
                      disabled={deletingConversationId === chat.id}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Delete conversation"
                    >
                      {deletingConversationId === chat.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Documents</h3>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="text-primary-600 hover:text-primary-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {documentsError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {documentsError}
                </p>
              )}

              {documentsLoading && (
                <p className="text-xs text-gray-500">Loading documents...</p>
              )}

              {!documentsLoading && documents.length === 0 && (
                <p className="text-xs text-gray-500">
                  No documents yet. Upload a PDF or document to get started.
                </p>
              )}

              {documents.map((doc) => {
                const statusEvent = documentStatuses[doc.id];
                const normalizedStatus = statusEvent?.status?.toLowerCase();
                const isUnavailable = normalizedStatus === STATUS_UNAVAILABLE;
                const isFailed = normalizedStatus ? FAILED_STATUSES.has(normalizedStatus) : false;
                const isSuccess = normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false;

                const statusLabel = !statusEvent
                  ? 'Checking status…'
                  : isUnavailable
                    ? 'Index Status Not Available'
                    : isFailed
                      ? 'Failed'
                      : isSuccess
                        ? 'Indexed'
                        : 'Indexing…';

                const statusDotClass = !statusEvent
                  ? 'bg-gray-300'
                  : isUnavailable
                    ? 'bg-gray-400'
                    : isFailed
                      ? 'bg-red-500'
                      : isSuccess
                        ? 'bg-green-500'
                        : 'bg-amber-500';

                return (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h4>
                        <div className="mt-1 flex items-center gap-1.5" title={statusEvent?.message}>
                          <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                          <span className="text-xs text-gray-500">{statusLabel}</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatTimeAgo(doc.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Sidebar;
