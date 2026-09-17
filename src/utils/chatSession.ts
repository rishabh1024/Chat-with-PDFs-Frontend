const ACTIVE_CONVERSATION_STORAGE_KEY = 'active_conversation_id';

export const getStoredActiveConversationId = (): string | null => {
  return window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
};

export const setStoredActiveConversationId = (id: string | null): void => {
  if (id === null) {
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id);
};

export const resolveActiveConversationId = (
  conversations: { id: string; updatedAt: string }[]
): string | null => {
  const storedId = getStoredActiveConversationId();

  if (storedId && conversations.some((conversation) => conversation.id === storedId)) {
    return storedId;
  }

  if (conversations.length === 0) {
    return null;
  }

  const mostRecent = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];

  return mostRecent.id;
};
