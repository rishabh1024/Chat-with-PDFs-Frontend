import { describe, expect, it } from 'vitest';
import { mapApiMessages } from '../../utils/mapApiMessages';

describe('mapApiMessages', () => {
  it('maps a bare string array with alternating roles', () => {
    const messages = mapApiMessages(['one', 'two', 'three']);

    expect(messages.map((m) => ({ content: m.content, role: m.role }))).toEqual([
      { content: 'one', role: 'user' },
      { content: 'two', role: 'assistant' },
      { content: 'three', role: 'user' },
    ]);
  });

  it('maps wrapped messages with role/content', () => {
    const messages = mapApiMessages({
      messages: [
        { id: '1', role: 'human', content: 'Hi' },
        { id: '2', type: 'ai', content: 'Hello' },
      ],
    });

    expect(messages).toEqual([
      expect.objectContaining({ id: '1', role: 'user', content: 'Hi' }),
      expect.objectContaining({ id: '2', role: 'assistant', content: 'Hello' }),
    ]);
  });

  it('throws for invalid payloads', () => {
    expect(() => mapApiMessages({ nope: true })).toThrow(
      'Invalid response format: expected a list of messages'
    );
  });
});
