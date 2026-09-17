import { Message } from '../types/chat';
import { generateUniqueId } from './index';

const asRole = (value: unknown): Message['role'] | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  if (normalized === 'user' || normalized === 'human') return 'user';
  if (normalized === 'assistant' || normalized === 'ai' || normalized === 'bot') {
    return 'assistant';
  }
  return null;
};

const readContent = (item: Record<string, unknown>): string | null => {
  for (const key of ['content', 'message_content', 'text', 'message']) {
    const value = item[key];
    if (typeof value === 'string') return value;
  }
  return null;
};

const readTimestamp = (item: Record<string, unknown>): Date => {
  for (const key of ['created_at', 'timestamp', 'createdAt']) {
    const value = item[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
};

/**
 * Normalize GET /conversations/{id}/messages payloads.
 * Prefers ConversationMessagesResponse `{ messages: ChatMessage[] }`;
 * also accepts a bare array, string items, or role/content objects.
 */
export const mapApiMessages = (payload: unknown): Message[] => {
  let items: unknown[] = [];

  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.messages)) {
      items = record.messages;
    } else if (Array.isArray(record.chat_history_messages)) {
      items = record.chat_history_messages;
    } else {
      throw new Error('Invalid response format: expected a list of messages');
    }
  } else {
    throw new Error('Invalid response format: expected a list of messages');
  }

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: generateUniqueId(),
        content: item,
        // Plain string lists are treated as user/assistant alternating, starting with user.
        role: index % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(),
      };
    }

    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const content = readContent(record);
      const role =
        asRole(record.role) ??
        asRole(record.type) ??
        asRole(record.sender) ??
        (index % 2 === 0 ? 'user' : 'assistant');

      if (content === null) {
        throw new Error('Invalid response format: message missing content');
      }

      const id =
        typeof record.id === 'string' && record.id.trim().length > 0
          ? record.id
          : generateUniqueId();

      return {
        id,
        content,
        role,
        timestamp: readTimestamp(record),
      };
    }

    throw new Error('Invalid response format: unrecognized message item');
  });
};
