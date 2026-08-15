import { ChatResponse } from '../types/chat';
import { apiConfig } from '../config/api';
import { API_ENDPOINTS } from '../constants';

export class ChatService {
  private apiUrl: string;
  private timeout: number;

  constructor(apiUrl: string = apiConfig.baseUrl, timeout: number = apiConfig.timeout) {
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  async sendMessage(chatId: string, message: string): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const query = new URLSearchParams({ message_query: message });

    try {
      const response = await fetch(
        `${this.apiUrl}${API_ENDPOINTS.CHAT_MESSAGE(chatId)}?${query.toString()}`,
        {
        method: 'POST',
        signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.chat_id || !data.ai_message || !Array.isArray(data.chat_history_messages)) {
        throw new Error('Invalid response format: missing chat response fields');
      }
      
      return {
        chatId: data.chat_id,
        message: data.ai_message,
        history: data.chat_history_messages,
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
