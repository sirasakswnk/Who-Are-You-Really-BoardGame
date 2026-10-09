import { describe, expect, it } from 'vitest';
import { createSnapshotMerger, decodePrivate, decodePublic, pendingResolved } from '../../lib/client/roomSnapshot';
import { actionContext, type ClientCommand } from '../../lib/game/commands';
import { clientSnapshot } from '../helpers/clientSnapshot';
import { firebaseRoundTrip } from '../helpers/firebaseSerialization';

describe('Coherent public/private synchronization', () => {
  it('ignores a late API response after realtime advanced the game', () => {
    const merge = createSnapshotMerger('ABC234', 'host');
    const old = clientSnapshot('ROLE_INTRO', 1), next = clientSnapshot('ANSWERING', 2);
    merge.pair(old); merge.public(next.public); merge.private(next.private);
    merge.pair(old);
    expect(merge.snapshot?.public.phase).toBe('ANSWERING');
    expect(merge.snapshot?.public.revision).toBe(2);
  });
  it.each(['public', 'private'] as const)('stages an early %s event without displaying mixed contexts', first => {
    const merge = createSnapshotMerger('ABC234', 'host');
    const old = clientSnapshot('ANSWERING', 1), next = clientSnapshot('ANSWER_REVEAL', 2);
    const previous = merge.pair(old);
    merge[first](next[first]);
    expect(merge.snapshot).toBe(previous);
    expect(merge.waiting).toBe(true);
    const second = first === 'public' ? 'private' : 'public';
    merge[second](next[second]);
    expect(merge.waiting).toBe(false);
    expect(merge.snapshot?.public.phase).toBe('ANSWER_REVEAL');
    expect(merge.snapshot?.private.phase).toBe('ANSWER_REVEAL');
  });
  it.each(['matchId', 'roundId', 'clueIndex', 'phase'] as const)('never combines different %s', field => {
    const merge = createSnapshotMerger('ABC234', 'host');
    const old = clientSnapshot(), next = clientSnapshot('ANSWERING', 2);
    Object.assign(next.private, { [field]: field === 'clueIndex' ? 1 : field === 'phase' ? 'DECIDING' : 'other' });
    merge.pair(old); merge.private(next.private);
    expect(merge.waiting).toBe(true);
    expect(merge.snapshot?.private).toEqual(old.private);
  });
  it('updates own private flags without requiring a public or opponent revision change', () => {
    const merge = createSnapshotMerger('ABC234', 'host'), original = clientSnapshot('DECIDING', 5);
    merge.pair(original);
    merge.private({ ...original.private, revision: 6, decisionSubmitted: true });
    expect(merge.snapshot?.public.revision).toBe(5);
    expect(merge.snapshot?.private.decisionSubmitted).toBe(true);
    merge.pair(original);
    expect(merge.snapshot?.private.decisionSubmitted).toBe(true);
  });
  it('rejects equal-revision changes and older secret flags', () => {
    const merge = createSnapshotMerger('ABC234', 'host'), original = clientSnapshot();
    merge.pair(original);
    merge.private({ ...original.private, decisionSubmitted: true });
    expect(merge.snapshot?.private.decisionSubmitted).toBe(false);
  });
  it('keeps rematch identity and rejects the previous match arriving later', () => {
    const merge = createSnapshotMerger('ABC234', 'host'), original = clientSnapshot('MATCH_RESULT', 8), next = clientSnapshot('LOBBY', 9);
    next.public.matchId = next.private.matchId = 'fresh-match';
    merge.pair(original); merge.pair(next); merge.pair(original);
    expect(merge.snapshot?.public.matchId).toBe('fresh-match');
    expect(merge.snapshot?.private.role).toBeNull();
  });
  it('uses actor membership from the public view rather than stale API seat metadata', () => {
    const merge = createSnapshotMerger('ABC234', 'guest'), view = clientSnapshot();
    expect(merge.pair({ ...view, seat: 0, isHost: true })?.seat).toBe(1);
    expect(merge.snapshot?.isHost).toBe(false);
    expect(createSnapshotMerger('ABC234', 'outsider').pair(view)).toBeNull();
    expect(createSnapshotMerger('XYZ789', 'host').pair(view)).toBeNull();
  });
  it('normalizes RTDB nulls and sparse players while retaining false and zero', () => {
    const view = clientSnapshot('LOBBY'); view.public.players[1] = null; view.public.scenario = null;
    const merge = createSnapshotMerger('ABC234', 'host');
    expect(merge.pair(firebaseRoundTrip(view))).toEqual(view);
  });
  it('rejects malformed private data instead of resetting submitted flags to false', () => {
    const view = clientSnapshot();
    expect(decodePrivate({ ...view.private, decisionSubmitted: undefined })).toBeNull();
    expect(decodePrivate({ ...view.private, guess: 'invented' })).toBeNull();
    expect(decodePublic({ ...view.public, players: ['wrong'] }, 'ABC234')).toBeNull();
    expect(decodePublic({ ...view.public, roundSummary: { roles: [] } }, 'ABC234')).toBeNull();
  });
  it.each([
    ['ROLE_INTRO', 'ROLE_ACK', 'roleAcknowledged'], ['ANSWERING', 'SUBMIT_ANSWER', 'answerSubmitted'],
    ['ANSWER_REVEAL', 'REVEAL_ACK', 'revealAcknowledged'], ['DECIDING', 'SUBMIT_DECISION', 'decisionSubmitted'],
    ['ROUND_REVEAL', 'NEXT_ROUND_READY', 'nextRoundReady'], ['MATCH_RESULT', 'REMATCH_REQUEST', 'rematchRequested'],
  ] as const)('recognizes resumed %s submissions', (phase, type, flag) => {
    const snapshot = clientSnapshot(phase);
    const action = { type, optionId: 'a', decision: { type: 'continue' } } as ClientCommand;
    const envelope = { ...actionContext(snapshot.public), action };
    expect(pendingResolved(snapshot, envelope)).toBe(false);
    snapshot.private[flag] = true;
    expect(pendingResolved(snapshot, envelope)).toBe(true);
  });
});
