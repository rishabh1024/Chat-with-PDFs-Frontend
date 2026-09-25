import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { getUserDisplayName } from '../../utils/userDisplayName';

const asUser = (partial: Partial<User>): User => partial as User;

describe('getUserDisplayName', () => {
  it('returns "there" when user is missing', () => {
    expect(getUserDisplayName(null)).toBe('there');
    expect(getUserDisplayName(undefined)).toBe('there');
  });

  it('uses name from metadata', () => {
    expect(
      getUserDisplayName(
        asUser({
          email: 'other@example.com',
          user_metadata: { name: 'Jordan Lee' },
        })
      )
    ).toBe('Jordan');
  });

  it('falls back to full_name when name is missing', () => {
    expect(
      getUserDisplayName(
        asUser({
          email: 'other@example.com',
          user_metadata: { full_name: 'Sam Patel' },
        })
      )
    ).toBe('Sam');
  });

  it('does not use email when name metadata is missing', () => {
    expect(
      getUserDisplayName(
        asUser({
          email: 'alex.smith@example.com',
          user_metadata: {},
        })
      )
    ).toBe('there');
  });
});
