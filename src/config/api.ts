export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  token: string | null;
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
    token: null,
  };

  const baseUrl = normalizeEnvValue(import.meta.env.VITE_API_BASE_URL);
  const timeout = normalizeEnvValue(import.meta.env.VITE_API_TIMEOUT);
  const retryAttempts = normalizeEnvValue(import.meta.env.VITE_API_RETRY_ATTEMPTS);
  const token = normalizeEnvValue(import.meta.env.VITE_API_TOKEN);

  return {
    baseUrl: baseUrl || defaultConfig.baseUrl,
    timeout: timeout ? parseInt(timeout, 10) : defaultConfig.timeout,
    retryAttempts: retryAttempts
      ? parseInt(retryAttempts, 10)
      : defaultConfig.retryAttempts,
    token: token || defaultConfig.token,
  };
};

export const apiConfig = getApiConfig();

export const getAuthHeaders = (
  extra: Record<string, string> = {}
): Record<string, string> => {
  const headers: Record<string, string> = { ...extra };

  if (apiConfig.token) {
    headers.Authorization = `Bearer ${apiConfig.token}`;
  }

  return headers;
};
