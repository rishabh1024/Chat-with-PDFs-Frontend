import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Conversation, Message, ChatState } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { conversationService } from '../../services/conversationService';
import { documentService } from '../../services/documentService';
import { FILE_UPLOAD_CONFIG } from '../../constants';
import { IndexedDocumentUpload } from '../../types/document';
import { generateUniqueId, validateMessage } from '../../utils';
import { getUserDisplayName } from '../../utils/userDisplayName';
import LogoMark from '../brand/LogoMark';
import MessageComponent from './Message';
import LoadingDots from './LoadingDots';

const DRAFT_CACHE_KEY = '__draft__';
const TITLE_MAX_LENGTH = 60;

interface ChatContainerProps {
  conversationId: string | null;
  conversationTitle: string | null;
  onConversationCreated: (conversation: Conversation) => void;
  onConversationUpdated: (conversation: Conversation) => void;
}

const buildTitleFromMessage = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed) return 'New Conversation';
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}...`;
};

const ChatContainer: React.FC<ChatContainerProps> = ({
  conversationId,
  conversationTitle,
  onConversationCreated,
  onConversationUpdated,
}) => {
  const { user } = useAuth();
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  const [inputValue, setInputValue] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{
    fileName: string;
    upload: IndexedDocumentUpload;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map());
  const previousConversationKeyRef = useRef<string>(DRAFT_CACHE_KEY);
  const messagesRef = useRef<Message[]>([]);

  const conversationCacheKey = conversationId ?? DRAFT_CACHE_KEY;
  const displayTitle = conversationId
    ? conversationTitle ?? 'New Conversation'
    : 'New Conversation';
  const greetingName = getUserDisplayName(user);

  useEffect(() => {
    messagesRef.current = chatState.messages;
  }, [chatState.messages]);

  useEffect(() => {
    const previousKey = previousConversationKeyRef.current;

    if (previousKey === conversationCacheKey) {
      return;
    }

    messageCacheRef.current.set(previousKey, messagesRef.current);

    // Discard unused draft when switching to a real conversation
    if (previousKey === DRAFT_CACHE_KEY && conversationId) {
      messageCacheRef.current.set(DRAFT_CACHE_KEY, []);
    }

    previousConversationKeyRef.current = conversationCacheKey;

    if (messageCacheRef.current.has(conversationCacheKey)) {
      setChatState((prev) => ({
        ...prev,
        messages: messageCacheRef.current.get(conversationCacheKey) ?? [],
        error: null,
        isLoading: false,
      }));
      return;
    }

    if (!conversationId) {
      messageCacheRef.current.set(DRAFT_CACHE_KEY, []);
      setChatState((prev) => ({
        ...prev,
        messages: [],
        error: null,
        isLoading: false,
      }));
      return;
    }

    let cancelled = false;
    setChatState((prev) => ({
      ...prev,
      messages: [],
      error: null,
      isLoading: true,
    }));

    conversationService
      .listMessages(conversationId)
      .then((messages) => {
        if (cancelled) return;
        messageCacheRef.current.set(conversationCacheKey, messages);
        setChatState((prev) => ({
          ...prev,
          messages,
          isLoading: false,
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        messageCacheRef.current.set(conversationCacheKey, []);
        setChatState((prev) => ({
          ...prev,
          messages: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load messages',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [conversationCacheKey, conversationId]);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, chatState.isLoading]);

  const persistMessages = (messages: Message[], cacheKey: string = conversationCacheKey) => {
    messageCacheRef.current.set(cacheKey, messages);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatState.isLoading) return;

    const validation = validateMessage(inputValue);
    if (!validation.isValid) {
      setChatState((prev) => ({
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

    const messagesWithUser = [...chatState.messages, userMessage];
    persistMessages(messagesWithUser);
    setChatState((prev) => ({
      ...prev,
      messages: messagesWithUser,
      isLoading: true,
      error: null,
    }));
    setInputValue('');

    try {
      let activeChatId = conversationId;
      let createdConversation: Conversation | null = null;

      if (!activeChatId) {
        createdConversation = await conversationService.createConversation(
          buildTitleFromMessage(userMessage.content)
        );
        activeChatId = createdConversation.id;
        persistMessages(messagesWithUser, activeChatId);
        messageCacheRef.current.set(DRAFT_CACHE_KEY, []);
        previousConversationKeyRef.current = activeChatId;
        onConversationCreated(createdConversation);
      }

      const response = await chatService.sendMessage(activeChatId, userMessage.content);
      const botMessage: Message = {
        id: generateUniqueId(),
        content: response.message || 'Sorry, I received an empty response.',
        role: 'assistant',
        timestamp: new Date(),
      };

      const messagesWithBot = [...messagesWithUser, botMessage];
      persistMessages(messagesWithBot, activeChatId);
      setChatState((prev) => ({
        ...prev,
        messages: messagesWithBot,
        isLoading: false,
      }));

      const now = new Date().toISOString();
      if (createdConversation) {
        onConversationUpdated({
          ...createdConversation,
          updatedAt: now,
        });
      } else if (conversationId) {
        onConversationUpdated({
          id: conversationId,
          userId: '',
          title: conversationTitle,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      setChatState((prev) => ({
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
    setChatState((prev) => ({ ...prev, error: null }));
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

  const isDraft = conversationId === null;
  const showSelectedEmptyPlaceholder =
    !isDraft && chatState.messages.length === 0 && !chatState.isLoading;

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{displayTitle}</h1>
          <p className="text-sm text-gray-600">
            {isDraft ? 'Start typing to create a new conversation' : 'Powered by FastAPI'}
          </p>
        </div>
      </div>

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

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {chatState.isLoading && chatState.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingDots />
              </div>
            ) : chatState.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-6">
                  <LogoMark size={56} />
                </div>
                {showSelectedEmptyPlaceholder ? (
                  <>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">{displayTitle}</h2>
                    <p className="text-gray-600 max-w-md">
                      Messages for this chat will appear here. Send a message to continue the conversation.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Hello {greetingName}
                    </h2>
                    <p className="text-gray-600 max-w-md">
                      Start a conversation by typing a message below. I&apos;m here to assist you with any questions or tasks.
                    </p>
                  </>
                )}
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
    </div>
  );
};

export default ChatContainer;
