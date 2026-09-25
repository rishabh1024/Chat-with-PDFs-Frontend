import type { User } from '@supabase/supabase-js';

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const readMetadataName = (metadata: Record<string, unknown>): string => {
  const candidates = [metadata.name, metadata.full_name, metadata.display_name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
};

/**
 * Greeting name from Supabase user metadata (`name` / `full_name`).
 * Does not fall back to email.
 */
export const getUserDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'there';

  const fromMetadata = readMetadataName(user.user_metadata ?? {});
  if (!fromMetadata) return 'there';

  return capitalize(fromMetadata.split(/\s+/)[0]);
};
