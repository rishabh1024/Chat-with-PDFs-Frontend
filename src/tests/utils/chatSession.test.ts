import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredActiveConversationId,
  resolveActiveConversationId,
  setStoredActiveConversationId,
} from '../../utils/chatSession';

describe('chatSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('getStoredActiveConversationId / setStoredActiveConversationId', () => {
    it('returns null when nothing is stored', () => {
      expect(getStoredActiveConversationId()).toBeNull();
    });

    it('stores and retrieves an active conversation id', () => {
      setStoredActiveConversationId('chat-123');
      expect(getStoredActiveConversationId()).toBe('chat-123');
      expect(window.localStorage.getItem('active_conversation_id')).toBe('chat-123');
    });

    it('clears the stored id when set to null', () => {
      setStoredActiveConversationId('chat-123');
      setStoredActiveConversationId(null);
      expect(getStoredActiveConversationId()).toBeNull();
      expect(window.localStorage.getItem('active_conversation_id')).toBeNull();
    });
  });

  describe('resolveActiveConversationId', () => {
    const conversations = [
      {
        id: 'older',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'newer',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ];

    it('returns the stored id when it exists in the list', () => {
      setStoredActiveConversationId('older');
      expect(resolveActiveConversationId(conversations)).toBe('older');
    });

    it('falls back to the most recently updated conversation', () => {
      setStoredActiveConversationId('missing');
      expect(resolveActiveConversationId(conversations)).toBe('newer');
    });

    it('returns null when there are no conversations', () => {
      setStoredActiveConversationId('anything');
      expect(resolveActiveConversationId([])).toBeNull();
    });
  });
});
