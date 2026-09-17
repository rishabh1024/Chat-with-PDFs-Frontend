import { useCallback, useEffect, useState } from 'react';
import ChatContainer from './components/chat/ChatContainer';
import { Sidebar, ErrorBoundary } from './components/layout';
import { conversationService } from './services/conversationService';
import { Conversation } from './types/chat';
import {
  resolveActiveConversationId,
  setStoredActiveConversationId,
} from './utils/chatSession';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    setStoredActiveConversationId(id);
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const data = await conversationService.listConversations();
      setConversations(data);
      selectConversation(resolveActiveConversationId(data));
    } catch (error) {
      setConversationsError(
        error instanceof Error ? error.message : 'Failed to load conversations'
      );
    } finally {
      setConversationsLoading(false);
    }
  }, [selectConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewChat = () => {
    selectConversation(null);
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setConversations((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)]);
    selectConversation(conversation.id);
  };

  const handleConversationUpdated = (conversation: Conversation) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === conversation.id);
      const merged: Conversation = existing
        ? {
            ...existing,
            ...conversation,
            title: conversation.title ?? existing.title,
            userId: conversation.userId || existing.userId,
            createdAt: existing.createdAt,
          }
        : conversation;
      const withoutCurrent = prev.filter((c) => c.id !== conversation.id);
      return [merged, ...withoutCurrent];
    });
  };

  const handleDeleteConversation = async (id: string) => {
    setDeletingConversationId(id);
    setConversationsError(null);

    try {
      await conversationService.deleteConversation(id);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          const nextId = resolveActiveConversationId(remaining);
          selectConversation(nextId);
        }
        return remaining;
      });
    } catch (error) {
      setConversationsError(
        error instanceof Error ? error.message : 'Failed to delete conversation'
      );
    } finally {
      setDeletingConversationId(null);
    }
  };

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  return (
    <ErrorBoundary>
      <div className="h-screen bg-gray-50 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          conversations={conversations}
          conversationsLoading={conversationsLoading}
          conversationsError={conversationsError}
          activeConversationId={activeConversationId}
          deletingConversationId={deletingConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <svg className="w-5 h-5 text-gray-700 hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-800">AI Chat Assistant</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {sidebarOpen ? 'Sidebar Open' : 'Sidebar Closed'}
              </span>
            </div>
          </div>

          <div className="flex-1">
            <ChatContainer
              conversationId={activeConversationId}
              conversationTitle={activeConversation?.title ?? null}
              onConversationCreated={handleConversationCreated}
              onConversationUpdated={handleConversationUpdated}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export { App as default };
