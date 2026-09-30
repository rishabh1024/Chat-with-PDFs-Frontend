import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AuthProvider } from '../auth/AuthContext';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const signInWithPassword = vi.fn();
const unsubscribe = vi.fn();
const listConversations = vi.fn();
let authStateChangeCallback: ((event: string, session: unknown) => void) | null = null;

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('../services/conversationService', () => ({
  conversationService: {
    listConversations: (...args: unknown[]) => listConversations(...args),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    listMessages: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../components/chat/ChatContainer', () => ({
  default: ({ conversationId }: { conversationId: string | null }) => (
    <div>
      Chat container
      <span data-testid="active-conversation">{conversationId ?? 'new-chat'}</span>
    </div>
  ),
}));

describe('App auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSession.mockResolvedValue({ data: { session: null } });
    listConversations.mockResolvedValue([]);
    authStateChangeCallback = null;
    onAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
  });

  it('shows the login page when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.queryByText('Chat container')).not.toBeInTheDocument();
  });

  it('shows the chat app when a session exists', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          user: { id: '1', email: 'user@example.com' },
        },
      },
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(await screen.findByText('Chat container')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Sign in to continue')).not.toBeInTheDocument();
    });
  });

  it('opens New Chat after a fresh credential login', async () => {
    const user = userEvent.setup();
    const conversation = {
      id: 'conversation-1',
      userId: '1',
      title: 'Previous chat',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T11:00:00.000Z',
    };
    getSession.mockResolvedValue({ data: { session: null } });
    listConversations.mockResolvedValue([conversation]);
    window.localStorage.setItem('active_conversation_id', conversation.id);

    const signedInSession = {
      access_token: 'fresh-token',
      user: { id: '1', email: 'user@example.com' },
    };
    signInWithPassword.mockImplementation(async () => {
      authStateChangeCallback?.('SIGNED_IN', signedInSession);
      return { data: { session: signedInSession }, error: null };
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await user.type(await screen.findByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByTestId('active-conversation')).toHaveTextContent('new-chat');
    expect(listConversations).toHaveBeenCalled();
    expect(window.localStorage.getItem('active_conversation_id')).toBeNull();
  });

  it('opens New Chat when getSession resolves after sign-in would have restored the old chat', async () => {
    const user = userEvent.setup();
    let resolveGetSession: (value: { data: { session: unknown } }) => void = () => {};
    getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveGetSession = resolve;
      })
    );

    const conversation = {
      id: 'conversation-1',
      userId: '1',
      title: 'Previous chat',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T11:00:00.000Z',
    };
    listConversations.mockResolvedValue([conversation]);
    window.localStorage.setItem('active_conversation_id', conversation.id);

    const signedInSession = {
      access_token: 'fresh-token',
      user: { id: '1', email: 'user@example.com' },
    };
    signInWithPassword.mockImplementation(async () => {
      authStateChangeCallback?.('SIGNED_IN', signedInSession);
      return { data: { session: signedInSession }, error: null };
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    act(() => {
      authStateChangeCallback?.('INITIAL_SESSION', null);
    });

    await user.type(await screen.findByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByTestId('active-conversation')).toHaveTextContent('new-chat');

    resolveGetSession({
      data: {
        session: {
          access_token: 'stale-token',
          user: { id: '1', email: 'user@example.com' },
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-conversation')).toHaveTextContent('new-chat');
    });
  });

  it('restores the active conversation after a page refresh with a persisted session', async () => {
    const conversation = {
      id: 'conversation-1',
      userId: '1',
      title: 'Previous chat',
      createdAt: '2026-09-29T10:00:00.000Z',
      updatedAt: '2026-09-29T11:00:00.000Z',
    };
    const restoredSession = {
      access_token: 'restored-token',
      user: { id: '1', email: 'user@example.com' },
    };
    getSession.mockResolvedValue({ data: { session: restoredSession } });
    listConversations.mockResolvedValue([conversation]);
    window.localStorage.setItem('active_conversation_id', conversation.id);
    onAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      queueMicrotask(() => {
        callback('INITIAL_SESSION', restoredSession);
      });
      return { data: { subscription: { unsubscribe } } };
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(await screen.findByTestId('active-conversation')).toHaveTextContent(
      conversation.id
    );
  });
});
