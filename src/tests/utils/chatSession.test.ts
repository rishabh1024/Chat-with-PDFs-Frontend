import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateChatId } from '../../utils/chatSession';

describe('getOrCreateChatId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an existing chat id from localStorage', () => {
    window.localStorage.setItem('chat_id', 'existing-chat-id');

    expect(getOrCreateChatId()).toBe('existing-chat-id');
  });

  it('generates and stores a chat id when one does not exist', () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    expect(getOrCreateChatId()).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(window.localStorage.getItem('chat_id')).toBe(
      '123e4567-e89b-12d3-a456-426614174000'
    );

    randomUUID.mockRestore();
  });
});
