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

/**
 * Called to attempt a session refresh after a 401/403. Should resolve with a
 * fresh access token, or null if the session truly can't be renewed.
 */
let refreshAccessToken: (() => Promise<string | null>) | null = null;

/** Shared in-flight refresh so concurrent 401/403 responses reuse one Supabase rotation. */
let refreshInFlight: Promise<string | null> | null = null;

/** Avoid multiple sign-out callbacks when several requests fail auth together. */
let unauthorizedSignOutScheduled = false;

export class NotAuthenticatedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  if (token) {
    unauthorizedSignOutScheduled = false;
  }
};

export const getAccessToken = (): string | null => accessToken;

export const setOnUnauthorized = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
  if (handler === null) {
    unauthorizedSignOutScheduled = false;
  }
};

export const setRefreshAccessToken = (
  handler: (() => Promise<string | null>) | null
): void => {
  refreshAccessToken = handler;
  if (handler === null) {
    refreshInFlight = null;
    unauthorizedSignOutScheduled = false;
  }
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

const withAuthHeader = (headers: HeadersInit | undefined, token: string): Headers => {
  const merged = new Headers(headers);
  merged.set('Authorization', `Bearer ${token}`);
  return merged;
};

const getRefreshedToken = async (): Promise<string | null> => {
  if (!refreshAccessToken) {
    return null;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

const notifyUnauthorizedOnce = (): void => {
  if (unauthorizedSignOutScheduled || !onUnauthorized) {
    return;
  }
  unauthorizedSignOutScheduled = true;
  onUnauthorized();
};

/**
 * fetch wrapper that signs the user out on 401/403 from protected APIs.
 *
 * A freshly-issued Supabase token can occasionally be rejected by the
 * backend on the very first request after login (e.g. backend-side clock
 * skew or a brief JWKS/secret-validation race) even though the session is
 * genuinely valid. Before treating a 401/403 as a real sign-out, refresh
 * the Supabase session and retry the request once — if that still fails,
 * it's a real auth failure and we sign out as before.
 */
export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  const newToken = await getRefreshedToken();
  if (newToken) {
    const retryResponse = await fetch(input, {
      ...init,
      headers: withAuthHeader(init?.headers, newToken),
    });

    if (retryResponse.status !== 401 && retryResponse.status !== 403) {
      return retryResponse;
    }

    if (retryResponse.status === 401) {
      notifyUnauthorizedOnce();
    }
    return retryResponse;
  }

  notifyUnauthorizedOnce();
  return response;
};
