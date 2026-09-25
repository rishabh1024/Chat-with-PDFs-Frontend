import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import LoginSignupPage from './components/auth/LoginSignupPage';
import Logo from './components/brand/Logo';
import ChatContainer from './components/chat/ChatContainer';
import { Sidebar, ErrorBoundary } from './components/layout';
import { conversationService } from './services/conversationService';
import { Conversation } from './types/chat';
import {
  resolveActiveConversationId,
  setStoredActiveConversationId,
} from './utils/chatSession';

function ChatApp() {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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
    // Only allow IDs from the authenticated user's loaded list (UI-level IDOR guard).
    if (!conversations.some((conversation) => conversation.id === id)) {
      return;
    }
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
    if (!conversations.some((conversation) => conversation.id === id)) {
      return;
    }

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

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setConversationsError(
        error instanceof Error ? error.message : 'Failed to sign out'
      );
    } finally {
      setSigningOut(false);
    }
  };

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  return (
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
            <Logo size={36} className="text-[13px]" />
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm text-gray-500 truncate max-w-[180px]" title={user.email}>
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-sm text-gray-700 hover:text-primary-600 disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Logout'}
            </button>
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
  );
}

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-600">Checking session…</p>
        </div>
      </ErrorBoundary>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <LoginSignupPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ChatApp />
    </ErrorBoundary>
  );
}

export { App as default };
