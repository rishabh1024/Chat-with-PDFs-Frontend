import { apiConfig, getAuthHeaders } from '../config/api';
import { API_ENDPOINTS } from '../constants';
import { Conversation, Message } from '../types/chat';
import { mapApiMessages } from '../utils/mapApiMessages';

interface ConversationApiResponse {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationListApiResponse {
  conversations: ConversationApiResponse[];
}

const mapConversation = (data: ConversationApiResponse): Conversation => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export class ConversationService {
  private apiUrl: string;
  private timeout: number;

  constructor(apiUrl: string = apiConfig.baseUrl, timeout: number = apiConfig.timeout) {
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  async listConversations(): Promise<Conversation[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.CONVERSATIONS_ALL}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: ConversationListApiResponse = await response.json();

      if (!data || !Array.isArray(data.conversations)) {
        throw new Error('Invalid response format: missing conversations array');
      }

      return data.conversations.map(mapConversation);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async createConversation(title?: string | null): Promise<Conversation> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.CONVERSATIONS}`, {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          title: title ?? 'New Conversation',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: ConversationApiResponse = await response.json();

      if (!data?.id || !data?.user_id || !data?.created_at || !data?.updated_at) {
        throw new Error('Invalid response format: missing conversation fields');
      }

      return mapConversation(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.apiUrl}${API_ENDPOINTS.CONVERSATION_MESSAGES_LIST(conversationId)}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return mapApiMessages(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${API_ENDPOINTS.CONVERSATION(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
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

export const conversationService = new ConversationService();
