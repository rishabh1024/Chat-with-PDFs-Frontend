import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  getAuthHeaders,
  NotAuthenticatedError,
  setAccessToken,
  setOnUnauthorized,
} from '../../config/api';

describe('api auth helpers', () => {
  beforeEach(() => {
    setAccessToken(null);
    setOnUnauthorized(null);
  });

  afterEach(() => {
    setAccessToken(null);
    setOnUnauthorized(null);
    vi.unstubAllGlobals();
  });

  it('throws when building auth headers without a token', () => {
    expect(() => getAuthHeaders()).toThrow(NotAuthenticatedError);
  });

  it('allows optional headers without a token', () => {
    expect(getAuthHeaders({ Accept: 'application/json' }, { optional: true })).toEqual({
      Accept: 'application/json',
    });
  });

  it('attaches bearer token when present', () => {
    setAccessToken('abc');
    expect(getAuthHeaders({ 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });

  it('invokes onUnauthorized for 401 responses', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 401, ok: false })
    );

    await apiFetch('http://localhost:8000/conversations');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('invokes onUnauthorized for 403 responses', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 403, ok: false })
    );

    await apiFetch('http://localhost:8000/conversations');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onUnauthorized for successful responses', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 200, ok: true })
    );

    await apiFetch('http://localhost:8000/conversations');

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
