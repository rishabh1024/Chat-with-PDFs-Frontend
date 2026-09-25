import { ChatResponse } from '../types/chat';
import { apiConfig, apiFetch, getAuthHeaders } from '../config/api';
import { API_ENDPOINTS } from '../constants';

export class ChatService {
  private apiUrl: string;
  private timeout: number;

  constructor(apiUrl: string = apiConfig.baseUrl, timeout: number = apiConfig.timeout) {
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  async sendMessage(conversationId: string, message: string): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await apiFetch(
        `${this.apiUrl}${API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId)}`,
        {
          method: 'POST',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            message_content: message,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.conversation_id || typeof data.content !== 'string') {
        throw new Error('Invalid response format: missing chat response fields');
      }

      return {
        conversationId: data.conversation_id,
        message: data.content,
        success: true,
      };
    } catch (error) {
      console.error('Chat service error:', error);

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        throw new Error('Request timeout - please try again');
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Unknown error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }
}

export const chatService = new ChatService();
