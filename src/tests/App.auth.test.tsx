import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../auth/AuthContext';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const unsubscribe = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../services/conversationService', () => ({
  conversationService: {
    listConversations: vi.fn().mockResolvedValue([]),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    listMessages: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../components/chat/ChatContainer', () => ({
  default: () => <div>Chat container</div>,
}));

describe('App auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
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
});
