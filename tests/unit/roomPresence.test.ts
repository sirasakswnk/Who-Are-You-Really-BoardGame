import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomPresence, onlineMembers, type PresenceAdapter } from '../../lib/client/roomPresence';
import { deferred } from '../helpers/clientSnapshot';

const instances: RoomPresence[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => { instances.splice(0).forEach(instance => instance.dispose()); vi.useRealTimers(); });
function harness(arm?: () => Promise<void>, write?: () => Promise<void>) {
  let connected!: (value: boolean) => void, value!: (value: unknown) => void, failed!: () => void;
  const events: string[] = [], connectedOff = vi.fn(), watchOff = vi.fn();
  const connections: Array<ReturnType<PresenceAdapter['connection']>> = [];
  const adapter: PresenceAdapter = {
    connected(callback) { connected = callback; return connectedOff; },
    watch(callback, error) { value = callback; failed = error; return watchOff; },
    connection(id) {
      const connection = {
        arm: vi.fn(async () => { events.push(`arm:${id}`); await arm?.(); }),
        set: vi.fn(async () => { events.push(`set:${id}`); await write?.(); }),
        remove: vi.fn(async () => { events.push(`remove:${id}`); }),
        cancel: vi.fn(async () => { events.push(`cancel:${id}`); }),
      }; connections.push(connection); return connection;
    },
  };
  let count = 0; const notify = vi.fn(), instance = new RoomPresence(adapter, notify, () => `tab-${++count}`);
  instances.push(instance); instance.start();
  return { instance, connections, events, notify, connectedOff, watchOff, connected: (v: boolean) => connected(v),
    value: (v: unknown) => value(v), failed: () => failed() };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
describe('F05 per-connection presence and cleanup races', () => {
  it('counts a uid online while any one of its two tabs is online', () => {
    expect(onlineMembers({ host: { a: true, b: true }, guest: { c: true } })).toEqual({ host: true, guest: true });
    expect(onlineMembers({ host: { b: true } }).host).toBe(true);
    expect(onlineMembers({ host: {} }).host).toBe(false); expect(onlineMembers(null)).toEqual({});
  });
  it('does not treat malformed connection values as online', () => {
    expect(onlineMembers({ host: { a: false, b: 'true', c: { online: true } }, guest: true })).toEqual({ host: false, guest: false });
  });
  it('awaits disconnect registration before publishing online', async () => {
    const arm = deferred<void>(), h = harness(() => arm.promise); h.connected(true);
    expect(h.events).toEqual(['arm:tab-1']); arm.resolve(); await flush();
    expect(h.events).toEqual(['arm:tab-1', 'set:tab-1']);
  });
  it('does not publish online if disconnect registration fails and retries with a new id', async () => {
    let fail = true; const h = harness(async () => { if (fail) throw new Error('permission'); }); h.connected(true); await flush();
    expect(h.connections[0].set).not.toHaveBeenCalled(); expect(h.notify.mock.calls.at(-1)?.[0].known).toBe(false);
    fail = false; await vi.advanceTimersByTimeAsync(1500); expect(h.events).toContain('set:tab-2');
  });
  it('reconnects with a new connection id and ignores old stream callbacks', async () => {
    const h = harness(); h.connected(true); await flush(); h.value({ host: { a: true } });
    h.connected(false); expect(h.notify.mock.calls.at(-1)?.[0].known).toBe(false);
    const count = h.notify.mock.calls.length; h.value({ host: { a: true } }); expect(h.notify).toHaveBeenCalledTimes(count);
    h.connected(true); await flush(); expect(h.events).toContain('arm:tab-2'); expect(h.events).toContain('set:tab-2');
    expect(h.watchOff).toHaveBeenCalledOnce();
  });
  it('does not publish online when disposed while disconnect registration is pending', async () => {
    const arm = deferred<void>(), h = harness(() => arm.promise); h.connected(true); h.instance.dispose();
    arm.resolve(); await flush(); expect(h.connections[0].set).not.toHaveBeenCalled();
    expect(h.connections[0].remove).toHaveBeenCalled(); expect(h.connectedOff).toHaveBeenCalledOnce();
  });
  it('removes a late successful write after unmount without touching another tab', async () => {
    const write = deferred<void>(), h = harness(undefined, () => write.promise); h.connected(true); await flush();
    h.instance.dispose(); const count = vi.mocked(h.connections[0].remove).mock.calls.length;
    write.resolve(); await flush(); expect(vi.mocked(h.connections[0].remove).mock.calls.length).toBeGreaterThan(count);
    expect(h.events.filter(event => event.startsWith('remove:')).every(event => event === 'remove:tab-1')).toBe(true);
  });
  it('keeps onDisconnect armed until a queued offline removal succeeds', async () => {
    const h = harness(); h.connected(true); await flush(); const removal = deferred<void>();
    vi.mocked(h.connections[0].remove).mockImplementation(() => removal.promise); h.instance.dispose();
    expect(h.connections[0].cancel).not.toHaveBeenCalled(); removal.resolve(); await flush();
    expect(h.connections[0].cancel).toHaveBeenCalledOnce();
  });
  it('treats denied presence reads as unknown rather than offline and clears retry timers on disposal', async () => {
    const h = harness(async () => { throw new Error('rules'); }); h.connected(true); h.failed(); await flush();
    expect(h.notify.mock.calls.at(-1)?.[0]).toMatchObject({ known: false, error: expect.any(String) });
    h.instance.dispose(); await vi.advanceTimersByTimeAsync(60_000); expect(h.connections).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });
});
