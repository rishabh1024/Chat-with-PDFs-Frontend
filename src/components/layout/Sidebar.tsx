import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FILE_UPLOAD_CONFIG } from '../../constants';
import { documentService } from '../../services/documentService';
import { DocumentRecord } from '../../types/document';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'prompts' | 'documents' | 'tools'>('history');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data - replace with real data from your backend
  const chatHistory: ChatHistoryItem[] = [
    {
      id: '1',
      title: 'React Components Discussion',
      lastMessage: 'How do I create reusable components?',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      title: 'API Integration Help',
      lastMessage: 'Help me integrate FastAPI backend',
      timestamp: new Date(Date.now() - 7200000)
    },
    {
      id: '3',
      title: 'CSS Styling Questions',
      lastMessage: 'Best practices for Tailwind CSS',
      timestamp: new Date(Date.now() - 86400000)
    }
  ];

  const savedPrompts: SavedPrompt[] = [
    {
      id: '1',
      title: 'Code Review',
      content: 'Please review this code and suggest improvements for performance and readability.',
      category: 'Development'
    },
    {
      id: '2',
      title: 'Explain Concept',
      content: 'Explain this concept in simple terms with examples.',
      category: 'Learning'
    },
    {
      id: '3',
      title: 'Debug Code',
      content: 'Help me debug this code and identify the issue.',
      category: 'Development'
    }
  ];

  const tools: Tool[] = [
    {
      id: '1',
      name: 'Code Interpreter',
      description: 'Execute and analyze code snippets',
      icon: '🔧',
      isActive: true
    },
    {
      id: '2',
      name: 'Web Search',
      description: 'Search the web for current information',
      icon: '🔍',
      isActive: false
    },
    {
      id: '3',
      name: 'Image Generator',
      description: 'Generate images from text descriptions',
      icon: '🎨',
      isActive: false
    },
    {
      id: '4',
      name: 'Calculator',
      description: 'Perform mathematical calculations',
      icon: '🧮',
      isActive: true
    }
  ];

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
      const uploadedDocument = await documentService.uploadDocument(file);
      setDocuments((prev) => [uploadedDocument, ...prev]);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingDocumentId(documentId);
    setDocumentsError(null);

    try {
      await documentService.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const tabs = [
    { id: 'history', label: 'History', icon: '💬' },
    { id: 'prompts', label: 'Prompts', icon: '📝' },
    { id: 'documents', label: 'Docs', icon: '📄' },
    { id: 'tools', label: 'Tools', icon: '🛠️' }
  ];

  return (
    <>      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={onToggle}
        />
      )}
        {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '320px' }}>
          {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'history' | 'prompts' | 'documents' | 'tools')}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Chat History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Recent Chats</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm">
                  New Chat
                </button>
              </div>
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <h4 className="text-sm font-medium text-gray-900 truncate">{chat.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 truncate">{chat.lastMessage}</p>
                  <span className="text-xs text-gray-400 mt-2 block">{formatTimeAgo(chat.timestamp)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Saved Prompts Tab */}
          {activeTab === 'prompts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Saved Prompts</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm">
                  Add New
                </button>
              </div>
              {savedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{prompt.title}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{prompt.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prompt.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Documents Tab */}
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

              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h4>
                      <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                      <span className="text-xs text-gray-400">{formatTimeAgo(doc.uploadDate)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDocumentId === doc.id}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Delete document"
                    >
                      {deletingDocumentId === doc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Available Tools</h3>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{tool.icon}</span>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{tool.name}</h4>
                        <p className="text-xs text-gray-500">{tool.description}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${tool.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
