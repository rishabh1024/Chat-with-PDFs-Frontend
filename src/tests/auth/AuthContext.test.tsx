import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../auth/AuthContext';
import { getAccessToken } from '../../config/api';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}));

const AuthProbe = () => {
  const { user, loading, signIn, signUp: register, signOut: logout } = useAuth();

  if (loading) {
    return <div>loading</div>;
  }

  return (
    <div>
      <div data-testid="user-email">{user?.email ?? 'none'}</div>
      <div data-testid="access-token">{getAccessToken() ?? 'none'}</div>
      <button type="button" onClick={() => signIn('a@b.com', 'secret1')}>
        Sign in
      </button>
      <button type="button" onClick={() => register('a@b.com', 'secret1', 'Alex Rivera')}>
        Sign up
      </button>
      <button type="button" onClick={() => logout()}>
        Sign out
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  it('restores a session on mount and syncs the access token', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-abc',
          user: { id: '1', email: 'user@example.com' },
        },
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByTestId('user-email')).toHaveTextContent('user@example.com');
    expect(screen.getByTestId('access-token')).toHaveTextContent('token-abc');
  });

  it('signs in with email and password', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await screen.findByTestId('user-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret1',
      });
    });
  });

  it('signs up with email, password, and name', async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await screen.findByTestId('user-email');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret1',
        options: {
          data: {
            full_name: 'Alex Rivera',
            name: 'Alex Rivera',
          },
        },
      });
    });
  });

  it('signs out and clears the access token', async () => {
    const user = userEvent.setup();
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-abc',
          user: { id: '1', email: 'user@example.com' },
        },
      },
    });
    signOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await screen.findByTestId('user-email');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(getAccessToken()).toBeNull();
    });
  });
});
