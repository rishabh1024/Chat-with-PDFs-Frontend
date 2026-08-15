// Application constants
export const APP_CONFIG = {
  MAX_MESSAGE_LENGTH: 3990,
  DEFAULT_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  HEALTH_CHECK_INTERVAL: 30000,
} as const;

export const UI_CONSTANTS = {
  TEXTAREA_MIN_HEIGHT: 48,
  TEXTAREA_MAX_HEIGHT: 200,
  SIDEBAR_WIDTH: 256,
} as const;

export const API_ENDPOINTS = {
  CHAT_MESSAGE: (chatId: string) => `/chat/conversation/${chatId}/messages/`,
  UPLOAD_AND_INDEX: '/upload_and_index',
  HEALTH: '/health',
  DOCUMENTS: '/documents',
} as const;

export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  ACCEPTED_EXTENSIONS: '.pdf,.txt,.doc,.docx',
} as const;
