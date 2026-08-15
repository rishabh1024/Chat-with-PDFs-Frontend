import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatState } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { documentService } from '../../services/documentService';
import { FILE_UPLOAD_CONFIG } from '../../constants';
import { IndexedDocumentUpload } from '../../types/document';
import { generateUniqueId, validateMessage } from '../../utils';
import { getOrCreateChatId } from '../../utils/chatSession';
import MessageComponent from './Message';
import LoadingDots from './LoadingDots';

const ChatContainer: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  
  const [inputValue, setInputValue] = useState('');
  const [chatId] = useState(getOrCreateChatId);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{
    fileName: string;
    upload: IndexedDocumentUpload;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, chatState.isLoading]);
  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatState.isLoading) return;

    // Validate message using utility
    const validation = validateMessage(inputValue);
    if (!validation.isValid) {
      setChatState(prev => ({
        ...prev,
        error: validation.error || 'Invalid message',
      }));
      return;
    }

    const userMessage: Message = {
      id: generateUniqueId(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    setInputValue('');

    try {
      const response = await chatService.sendMessage(chatId, userMessage.content);
      const botMessage: Message = {
        id: generateUniqueId(),
        content: response.message || 'Sorry, I received an empty response.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, botMessage],
        isLoading: false,
      }));

    } catch (error) {
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearError = () => {
    setChatState(prev => ({ ...prev, error: null }));
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsUploadingAttachment(true);
    setAttachmentError(null);

    try {
      const upload = await documentService.uploadAndIndex(file);

      if (upload.uploadStatus === 'Failed') {
        throw new Error(upload.uploadError || 'File upload or indexing failed');
      }

      setAttachment({ fileName: file.name, upload });
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'Failed to upload and index file'
      );
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentError(null);
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-600">Powered by FastAPI</p>
        </div>
      </div>

      {/* Error Banner */}
      {chatState.error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-800 text-sm">
                  <strong>Error:</strong> {chatState.error}
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {chatState.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
                <p className="text-gray-600 max-w-md">
                  Start a conversation by typing a message below. I'm here to assist you with any questions or tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {chatState.messages.map((message) => (
                  <MessageComponent key={message.id} message={message} />
                ))}
                
                {chatState.isLoading && <LoadingDots />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white">
            <div className="px-4 py-4">
              {attachment && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-green-900">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-green-700">
                      Uploaded and indexed
                      {Object.keys(attachment.upload.indexingStatus).length > 0 && (
                        <> · {Object.values(attachment.upload.indexingStatus).join(', ')}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="text-sm text-green-800 hover:text-green-950"
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}

              {attachmentError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {attachmentError}
                </p>
              )}

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
                  onChange={handleAttachmentChange}
                  className="hidden"
                  data-testid="chat-attachment-input"
                />
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message AI Assistant..."
                  className="w-full resize-none border border-gray-300 rounded-xl px-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder-gray-500"
                  rows={1}
                  disabled={chatState.isLoading}
                  style={{
                    minHeight: '48px',
                    maxHeight: '200px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  disabled={isUploadingAttachment}
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={isUploadingAttachment ? 'Uploading attachment' : 'Attach document'}
                  title="Attach document"
                >
                  {isUploadingAttachment ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L5.758 10.758a6 6 0 108.484 8.484L20.5 13" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={chatState.isLoading || !inputValue.trim()}
                  aria-label="Send message"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                >
                  {chatState.isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Press Enter to send • Shift + Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>  );
};

export default ChatContainer;
