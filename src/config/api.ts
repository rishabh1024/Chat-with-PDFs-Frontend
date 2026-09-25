export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getApiConfig = (): ApiConfig => {
  const defaultConfig: ApiConfig = {
    baseUrl: 'http://localhost:8000',
    timeout: 120000,
    retryAttempts: 3,
  };

  const baseUrl = normalizeEnvValue(import.meta.env.VITE_API_BASE_URL);
  const timeout = normalizeEnvValue(import.meta.env.VITE_API_TIMEOUT);
  const retryAttempts = normalizeEnvValue(import.meta.env.VITE_API_RETRY_ATTEMPTS);

  return {
    baseUrl: baseUrl || defaultConfig.baseUrl,
    timeout: timeout ? parseInt(timeout, 10) : defaultConfig.timeout,
    retryAttempts: retryAttempts
      ? parseInt(retryAttempts, 10)
      : defaultConfig.retryAttempts,
  };
};

export const apiConfig = getApiConfig();

/** Session access token bridge — AuthContext keeps this in sync with Supabase. */
let accessToken: string | null = null;

/** Called when an authenticated API request returns 401/403. */
let onUnauthorized: (() => void) | null = null;

export class NotAuthenticatedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

export const setOnUnauthorized = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

/**
 * Fail-closed: authenticated API calls must have a live session token.
 * Pass `{ optional: true }` only for public endpoints (e.g. health).
 */
export const getAuthHeaders = (
  extra: Record<string, string> = {},
  options: { optional?: boolean } = {}
): Record<string, string> => {
  const headers: Record<string, string> = { ...extra };

  if (!accessToken) {
    if (options.optional) {
      return headers;
    }
    throw new NotAuthenticatedError();
  }

  headers.Authorization = `Bearer ${accessToken}`;
  return headers;
};

/** fetch wrapper that signs the user out on 401/403 from protected APIs. */
export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  if (response.status === 401 || response.status === 403) {
    onUnauthorized?.();
  }

  return response;
};
