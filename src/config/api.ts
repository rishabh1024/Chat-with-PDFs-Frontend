export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

const getApiConfig = (): ApiConfig => {
  // Default configuration
  const defaultConfig: ApiConfig = {
    baseUrl: 'http://localhost:8000',
    timeout: 120000,
    retryAttempts: 3,
  };

  // Override with environment variables if available
  if (typeof window !== 'undefined') {
    // Client-side environment variables (if using Vite)
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const timeout = import.meta.env.VITE_API_TIMEOUT;
    const retryAttempts = import.meta.env.VITE_API_RETRY_ATTEMPTS;

    return {
      baseUrl: baseUrl || defaultConfig.baseUrl,
      timeout: timeout ? parseInt(timeout, 10) : defaultConfig.timeout,
      retryAttempts: retryAttempts ? parseInt(retryAttempts, 10) : defaultConfig.retryAttempts,
    };
  }

  return defaultConfig;
};

export const apiConfig = getApiConfig();
