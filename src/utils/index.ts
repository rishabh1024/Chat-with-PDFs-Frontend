// Utility functions
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const validateMessage = (message: string): { isValid: boolean; error?: string } => {
  if (!message.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 4000) {
    return { isValid: false, error: 'Message too long (max 4000 characters)' };
  }
  
  return { isValid: true };
};

export const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const validateFile = (
  file: File,
  allowedTypes: readonly string[],
  maxSize: number
): { isValid: boolean; error?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Unsupported file type. Please upload a PDF, TXT, or Word document.' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large. Maximum size is 10 MB.' };
  }

  return { isValid: true };
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
