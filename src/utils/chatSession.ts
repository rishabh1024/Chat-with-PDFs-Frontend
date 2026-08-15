const CHAT_ID_STORAGE_KEY = 'chat_id';

export const getOrCreateChatId = (): string => {
  const existingChatId = window.localStorage.getItem(CHAT_ID_STORAGE_KEY);

  if (existingChatId) {
    return existingChatId;
  }

  const chatId = crypto.randomUUID();
  window.localStorage.setItem(CHAT_ID_STORAGE_KEY, chatId);
  return chatId;
};
