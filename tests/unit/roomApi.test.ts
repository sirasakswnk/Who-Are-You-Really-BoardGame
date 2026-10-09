import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoomApi, RoomApiError, type TokenUser } from '../../lib/client/roomApi';
import { deferred } from '../helpers/clientSnapshot';
afterEach(() => vi.useRealTimers());
const user = () => ({ uid: 'host', getIdToken: vi.fn(async (force?: boolean) => { void force; return 'current-token'; }) });

describe('Current auth tokens and recoverable API outcomes', () => {
  it('gets the current user token on every request', async () => {
    const current = user(), tokens: string[] = [];
    const transport: typeof fetch = async (_, init) => { tokens.push(new Headers(init?.headers).get('Authorization')!); return Response.json({ success: true }); };
    const request = createRoomApi(() => current, 'host', transport);
    await request('/room'); current.getIdToken.mockResolvedValue('renewed-token'); await request('/room');
    expect(tokens).toEqual(['Bearer current-token', 'Bearer renewed-token']);
  });
  it('refreshes once on 401 and preserves exact POST identity/payload', async () => {
    const current = user(), bodies: unknown[] = [], methods: unknown[] = [];
    current.getIdToken.mockImplementation(async force => force ? 'fresh' : 'old');
    const transport: typeof fetch = async (_, init) => {
      bodies.push(init?.body); methods.push(init?.method);
      return bodies.length === 1 ? Response.json({ error: 'Unauthorized' }, { status: 401 }) : Response.json({ success: true });
    };
    const body = { actionId: 'retained', action: { type: 'SUBMIT_ANSWER', optionId: 'a' } };
    expect(await createRoomApi(() => current, 'host', transport)('/action', body)).toEqual({ success: true });
    expect(current.getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(bodies).toEqual([JSON.stringify(body), JSON.stringify(body)]);
    expect(methods).toEqual(['POST', 'POST']);
  });
  it('does not loop when the refreshed token is still unauthorized', async () => {
    const current = user(), transport = vi.fn(async () => Response.json({}, { status: 401 }));
    await expect(createRoomApi(() => current, 'host', transport)('/room')).rejects.toMatchObject({ status: 401, retryable: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('does not send a retained action under a different actor', async () => {
    const transport = vi.fn();
    await expect(createRoomApi(() => ({ ...user(), uid: 'other' }), 'host', transport)('/action', {})).rejects.toMatchObject({ status: 401, retryable: false });
    expect(transport).not.toHaveBeenCalled();
  });
  it('rechecks identity after asynchronous token acquisition', async () => {
    const token = deferred<string>(), transport = vi.fn();
    let current: TokenUser = { uid: 'host', getIdToken: () => token.promise };
    const result = createRoomApi(() => current, 'host', transport)('/action', {});
    current = { ...current, uid: 'other' }; token.resolve('host-token');
    await expect(result).rejects.toMatchObject({ status: 401 }); expect(transport).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 410, 429, 503])('maps HTTP %s to a Thai recovery message', async status => {
    const current = user();
    const error = await createRoomApi(() => current, 'host', async () => new Response('internal non-json details', { status }))('/action', {}).catch(error => error);
    expect(error).toBeInstanceOf(RoomApiError);
    if (!(error instanceof RoomApiError)) throw new Error('Expected RoomApiError');
    expect(error.message).toMatch(/[\u0e00-\u0e7f]/);
    expect(error.message).not.toContain('internal');
    expect(error.retryable).toBe(status === 429 || status >= 500);
    expect(error.uncertain).toBe(status >= 500);
  });
  it('treats malformed successful POST responses as uncertain rather than confirmed', async () => {
    await expect(createRoomApi(user, 'host', async () => new Response('invalid-json'))('/action', {})).rejects.toMatchObject({ uncertain: true, retryable: true });
  });
  it('times out token acquisition and never starts a later POST', async () => {
    vi.useFakeTimers();
    const token = deferred<string>(), transport = vi.fn(), current = { uid: 'host', getIdToken: () => token.promise };
    const result = createRoomApi(() => current, 'host', transport, 10)('/action', {}).catch(error => error);
    await vi.advanceTimersByTimeAsync(10);
    expect(await result).toMatchObject({ uncertain: false, retryable: true });
    token.resolve('token'); await Promise.resolve(); expect(transport).not.toHaveBeenCalled();
  });
  it('times out after transport dispatch and retains uncertain write semantics', async () => {
    vi.useFakeTimers();
    const transport = vi.fn(() => new Promise<Response>(() => {}));
    const result = createRoomApi(user, 'host', transport, 10)('/action', {}).catch(error => error);
    await vi.advanceTimersByTimeAsync(10);
    expect(await result).toMatchObject({ uncertain: true });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('aborts in-flight requests on session cleanup', async () => {
    const lifetime = new AbortController(), transport = vi.fn(() => new Promise<Response>(() => {}));
    const result = createRoomApi(user, 'host', transport)('/room', undefined, lifetime.signal).catch(error => error);
    await Promise.resolve(); lifetime.abort();
    expect(await result).toBeInstanceOf(RoomApiError);
    expect(transport.mock.calls).toHaveLength(1);
  });
});
