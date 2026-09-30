import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  getAuthHeaders,
  NotAuthenticatedError,
  setAccessToken,
  setOnUnauthorized,
  setRefreshAccessToken,
} from '../../config/api';

describe('api auth helpers', () => {
  beforeEach(() => {
    setAccessToken(null);
    setOnUnauthorized(null);
    setRefreshAccessToken(null);
  });

  afterEach(() => {
    setAccessToken(null);
    setOnUnauthorized(null);
    setRefreshAccessToken(null);
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

  it('invokes onUnauthorized for 401 responses when the session cannot be refreshed', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    setRefreshAccessToken(vi.fn().mockResolvedValue(null));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 401, ok: false })
    );

    await apiFetch('http://localhost:8000/conversations');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('invokes onUnauthorized for 403 responses when the session cannot be refreshed', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    setRefreshAccessToken(vi.fn().mockResolvedValue(null));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 403, ok: false })
    );

    await apiFetch('http://localhost:8000/conversations');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not sign out when a refreshed token still gets 403', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    setRefreshAccessToken(vi.fn().mockResolvedValue('fresh-token'));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 403, ok: false })
      .mockResolvedValueOnce({ status: 403, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('http://localhost:8000/upload/index_status/doc/events');

    expect(response.status).toBe(403);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('shares one refresh across parallel 401 responses', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);

    const refreshAccessToken = vi.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('fresh-token'), 10);
        })
    );
    setRefreshAccessToken(refreshAccessToken);

    const fetchMock = vi.fn().mockImplementation(async () => ({ status: 401, ok: false }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      apiFetch('http://localhost:8000/a'),
      apiFetch('http://localhost:8000/b'),
    ]);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
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

  it('refreshes the session and retries once on 401 instead of signing out immediately', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);

    const refreshAccessToken = vi.fn().mockResolvedValue('fresh-token');
    setRefreshAccessToken(refreshAccessToken);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('http://localhost:8000/conversations', {
      headers: { Authorization: 'Bearer stale-token' },
    });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryCallInit = fetchMock.mock.calls[1][1];
    expect(new Headers(retryCallInit.headers).get('Authorization')).toBe('Bearer fresh-token');
    expect(response.status).toBe(200);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('signs out if the refreshed token still gets rejected', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    setRefreshAccessToken(vi.fn().mockResolvedValue('fresh-token'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 401, ok: false })
    );

    const response = await apiFetch('http://localhost:8000/conversations');

    expect(response.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('signs out immediately if the session cannot be refreshed', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    setRefreshAccessToken(vi.fn().mockResolvedValue(null));

    const fetchMock = vi.fn().mockResolvedValue({ status: 401, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('http://localhost:8000/conversations');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
