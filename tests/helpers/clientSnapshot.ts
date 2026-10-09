import type { RoomSnapshot } from '../../lib/client/roomSnapshot';
export function clientSnapshot(phase: RoomSnapshot['public']['phase'] = 'ANSWERING', revision = 1): RoomSnapshot {
  const matchId = 'match-test', roundId = phase === 'LOBBY' ? null : `${matchId}:round:0`;
  return {
    seat: 0, isHost: true,
    public: {
      revision, code: 'ABC234', phase, matchId, roundId, roundIndex: 0, clueIndex: 0,
      players: [
        { uid: 'host', seat: 0, isHost: true, ready: true, displayName: 'หนึ่ง', avatarId: 'cat' },
        { uid: 'guest', seat: 1, isHost: false, ready: true, displayName: 'สอง', avatarId: 'fox' },
      ], matchScores: [0, 0], rematchRequests: [false, false], revealedAnswers: [], revealedEvidence: [], roundHistory: [], roundSummary: null,
      scenario: { id: 's', version: 1, category: 'travel', prompt: 'เลือกการเดินทาง', options: [{ id: 'a', label: 'รถไฟ' }, { id: 'b', label: 'รถเมล์' }] }, termination: null,
    },
    private: {
      revision, matchId, roundId, phase, clueIndex: 0, role: phase === 'LOBBY' ? null : 'saver',
      guess: null, guessClueIndex: null, committedAnswer: null, hasGuessed: false,
      roleAcknowledged: false, answerSubmitted: false, revealAcknowledged: false,
      decisionSubmitted: false, nextRoundReady: false, rematchRequested: false,
    },
  };
}
export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
export function tabStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
