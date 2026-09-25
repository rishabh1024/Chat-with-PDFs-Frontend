import React, { FormEvent, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Logo from '../brand/Logo';

type AuthMode = 'login' | 'signup';

const MIN_PASSWORD_LENGTH = 8;

/** Avoid leaking Supabase enumeration details (e.g. "User already registered"). */
const toFriendlyAuthError = (err: unknown, mode: AuthMode): string => {
  const message = err instanceof Error ? err.message.toLowerCase() : '';

  if (
    message.includes('invalid login') ||
    message.includes('invalid credentials') ||
    message.includes('email not confirmed')
  ) {
    return 'Invalid email or password.';
  }

  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Unable to create account with that email. Try signing in instead.';
  }

  if (message.includes('password')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  return mode === 'login'
    ? 'Sign in failed. Check your email and password.'
    : 'Sign up failed. Please try again.';
};

const LoginSignupPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    if (!isLogin && !trimmedName) {
      setError('Name is required.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(trimmedEmail, password);
      } else {
        const { needsEmailConfirmation } = await signUp(
          trimmedEmail,
          password,
          trimmedName
        );
        if (needsEmailConfirmation) {
          setInfo('Check your email to confirm your account before signing in.');
          setMode('login');
        }
      }
    } catch (err) {
      setError(toFriendlyAuthError(err, mode));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <div className="flex justify-center">
          <Logo size={48} className="text-base" />
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">
          {isLogin ? 'Sign in to continue' : 'Create an account to get started'}
        </p>

        <div className="mt-6 flex rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isLogin ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              !isLogin ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {info && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginSignupPage;
