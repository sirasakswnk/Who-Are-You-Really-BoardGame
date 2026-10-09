import type { RoomRecord } from '../server/roomRecord';
import type { ClientCommand, ActionEnvelope } from '../game/commands';
import { ROLE_IDS } from '../game/types';

export type PublicView = RoomRecord['public'] & { revision: number };
export type PrivateView = RoomRecord['private'][string] & { revision: number };
export interface RoomSnapshot { public: PublicView; private: PrivateView; seat: 0 | 1; isHost: boolean }
const phases = ['LOBBY', 'ROLE_INTRO', 'ANSWERING', 'ANSWER_REVEAL', 'DECIDING', 'ROUND_REVEAL', 'MATCH_RESULT', 'ABANDONED', 'CLOSED'];
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const revision = (value: unknown) => value === undefined ? 0 : Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
function context(value: Record<string, unknown>) {
  return typeof value.matchId === 'string' && !!value.matchId && typeof value.phase === 'string' && phases.includes(value.phase) &&
    Number.isInteger(value.clueIndex) && Number(value.clueIndex) >= 0 && Number(value.clueIndex) <= 3 &&
    (typeof value.roundId === 'string' || (value.roundId == null && ['LOBBY', 'CLOSED'].includes(String(value.phase))));
}
function tuple<T>(value: unknown, fallback: T): [T, T] {
  const entries = value && typeof value === 'object' ? value as Record<string, T> : {};
  return [entries[0] ?? fallback, entries[1] ?? fallback];
}
function list<T>(value: unknown): T[] {
  return value && typeof value === 'object' ? Object.entries(value).sort(([a], [b]) => Number(a) - Number(b)).map(([, item]) => item as T) : [];
}
function evidence(value: unknown): RoomRecord['public']['revealedEvidence'] | null {
  if (value != null && typeof value !== 'object') return null;
  const items = list<Record<string, unknown>>(value);
  const result = [];
  for (const [index, item] of items.entries()) {
    if (!object(item) || item.clueIndex !== index || index > 3 || typeof item.scenarioId !== 'string' || !item.scenarioId ||
        !Number.isSafeInteger(item.scenarioVersion) || Number(item.scenarioVersion) < 1 || typeof item.prompt !== 'string') return null;
    const answers = tuple<unknown>(item.answers, null);
    if (answers.some(answer => typeof answer !== 'string')) return null;
    result.push({ clueIndex: index, scenarioId: item.scenarioId, scenarioVersion: Number(item.scenarioVersion), prompt: item.prompt, answers: answers as [string, string] });
  }
  return result;
}
function summary(value: unknown): RoomRecord['public']['roundSummary'] | undefined {
  if (value == null) return null;
  const item = object(value);
  if (!item || !Number.isInteger(item.roundIndex) || Number(item.roundIndex) < 0 || Number(item.roundIndex) > 3) return undefined;
  const roles = tuple<string | null>(item.roles, null);
  const guesses = tuple<string | null>(item.guesses, null), indices = tuple<number | null>(item.guessClueIndex, null);
  const scores = tuple<number>(item.scores, -1), reason = tuple<string>(item.reason, '');
  if (roles.some(role => !ROLE_IDS.includes(role as typeof ROLE_IDS[number])) || guesses.some(role => role !== null && !ROLE_IDS.includes(role as typeof ROLE_IDS[number])) ||
      indices.some(index => index !== null && (!Number.isInteger(index) || index < 0 || index > 3)) ||
      scores.some(score => !Number.isSafeInteger(score) || score < 0 || score > 5) || reason.some(text => typeof text !== 'string')) return undefined;
  const details = item.evidence == null ? undefined : evidence(item.evidence);
  if (details === null) return undefined;
  return { roundIndex: item.roundIndex, roles, guesses, guessClueIndex: indices, scores, reason,
    ...(details ? { evidence: details } : {}) } as NonNullable<RoomRecord['public']['roundSummary']>;
}
export function decodePublic(value: unknown, code: string): PublicView | null {
  const data = object(value);
  if (!data || data.code !== code || !context(data) || revision(data.revision) === null ||
      !Number.isInteger(data.roundIndex) || Number(data.roundIndex) < 0 || Number(data.roundIndex) > 3) return null;
  const players = tuple<RoomRecord['public']['players'][number]>(data.players, null);
  if (players.some((player, seat) => player !== null && (!object(player) || typeof player.uid !== 'string' || player.seat !== seat ||
      typeof player.isHost !== 'boolean' || typeof player.ready !== 'boolean' || typeof player.displayName !== 'string' || typeof player.avatarId !== 'string'))) return null;
  const scores = tuple<number>(data.matchScores, 0), rematch = tuple<boolean>(data.rematchRequests, false);
  if (scores.some(score => !Number.isSafeInteger(score) || score < 0) || rematch.some(flag => typeof flag !== 'boolean')) return null;
  const scenario = data.scenario == null ? null : object(data.scenario);
  if (data.scenario != null && (!scenario || typeof scenario.prompt !== 'string' || !Array.isArray(scenario.options) ||
      scenario.options.some(option => !object(option) || typeof option.id !== 'string' || typeof option.label !== 'string'))) return null;
  const revealed = list<RoomRecord['public']['revealedAnswers'][number]>(data.revealedAnswers);
  if (revealed.some(item => !object(item) || !Number.isInteger(item.clueIndex) || !Array.isArray(item.answers) || item.answers.some(answer => typeof answer !== 'string'))) return null;
  const roundSummary = summary(data.roundSummary);
  if (roundSummary === undefined) return null;
  const details = evidence(data.revealedEvidence);
  if (!details || details.some(entry => entry.clueIndex > Number(data.clueIndex))) return null;
  if (data.roundHistory != null && typeof data.roundHistory !== 'object') return null;
  const history = list(data.roundHistory).map(summary);
  const maxHistory = ['ROUND_REVEAL', 'MATCH_RESULT', 'ABANDONED', 'CLOSED'].includes(String(data.phase)) ? Number(data.roundIndex) + 1 : Number(data.roundIndex);
  if (history.length > maxHistory || history.some((entry, index) => !entry || entry.roundIndex !== index)) return null;
  const ending = data.termination == null ? null : object(data.termination);
  if (data.termination != null && (!ending || (ending.seat !== 0 && ending.seat !== 1) || typeof ending.displayName !== 'string')) return null;
  if (data.phase === 'ABANDONED' && !ending) return null;
  return {
    ...data, revision: revision(data.revision)!, roundId: data.roundId ?? null,
    players, matchScores: scores, rematchRequests: rematch, revealedAnswers: revealed,
    scenario: data.scenario ?? null, roundSummary, termination: ending, revealedEvidence: details,
    roundHistory: history.map(entry => ({ ...entry!, evidence: entry!.evidence ?? [] })),
  } as PublicView;
}
export function decodePrivate(value: unknown): PrivateView | null {
  const data = object(value);
  const flags = ['hasGuessed', 'roleAcknowledged', 'answerSubmitted', 'revealAcknowledged', 'decisionSubmitted', 'nextRoundReady', 'rematchRequested'];
  if (!data || !context(data) || revision(data.revision) === null || flags.some(flag => typeof data[flag] !== 'boolean')) return null;
  if ([data.role, data.guess].some(role => role != null && !ROLE_IDS.includes(role as typeof ROLE_IDS[number])) ||
      (data.committedAnswer != null && typeof data.committedAnswer !== 'string') ||
      (data.guessClueIndex != null && (!Number.isInteger(data.guessClueIndex) || Number(data.guessClueIndex) < 0 || Number(data.guessClueIndex) > 3))) return null;
  return {
    ...data, revision: revision(data.revision)!, roundId: data.roundId ?? null,
    role: data.role ?? null, guess: data.guess ?? null, guessClueIndex: data.guessClueIndex ?? null,
    committedAnswer: data.committedAnswer ?? null,
  } as PrivateView;
}
export function sameContext(a: Pick<PublicView, 'matchId' | 'roundId' | 'phase' | 'clueIndex'>, b: Pick<PrivateView, 'matchId' | 'roundId' | 'phase' | 'clueIndex'>): boolean {
  return a.matchId === b.matchId && a.roundId === b.roundId && a.phase === b.phase && a.clueIndex === b.clueIndex;
}

/** Independent view revisions; never compare or expose the server revision. */
export function createSnapshotMerger(code: string, uid: string) {
  let publicView: PublicView | null = null, privateView: PrivateView | null = null;
  let snapshot: RoomSnapshot | null = null;
  function combine() {
    if (!publicView || !privateView || !sameContext(publicView, privateView)) return snapshot;
    const seat = publicView.players.findIndex(player => player?.uid === uid);
    if (seat !== 0 && seat !== 1) return snapshot;
    if (snapshot?.public === publicView && snapshot.private === privateView) return snapshot;
    snapshot = { public: publicView, private: privateView, seat, isHost: publicView.players[seat]!.isHost };
    return snapshot;
  }
  return {
    public(value: unknown) {
      const incoming = decodePublic(value, code);
      if (incoming && (!publicView || incoming.revision > publicView.revision)) publicView = incoming;
      return combine();
    },
    private(value: unknown) {
      const incoming = decodePrivate(value);
      if (incoming && (!privateView || incoming.revision > privateView.revision)) privateView = incoming;
      return combine();
    },
    pair(value: unknown) {
      const data = object(value), pub = decodePublic(data?.public, code), priv = decodePrivate(data?.private);
      if (!pub || !priv || !sameContext(pub, priv) || !pub.players.some(player => player?.uid === uid)) return null;
      if (!publicView || pub.revision > publicView.revision) publicView = pub;
      if (!privateView || priv.revision > privateView.revision) privateView = priv;
      return combine();
    },
    get snapshot() { return snapshot; },
    get removed() { return !!snapshot && !!publicView && !publicView.players.some(player => player?.uid === uid); },
    get waiting() { return !publicView || !privateView || !sameContext(publicView, privateView) || !publicView.players.some(player => player?.uid === uid); },
  };
}

export function commandPhase(command: ClientCommand): PublicView['phase'] | null {
  switch (command.type) {
    case 'PLAYER_LEAVE': return null;
    case 'PLAYER_READY': case 'START_MATCH': return 'LOBBY';
    case 'ROLE_ACK': return 'ROLE_INTRO';
    case 'SUBMIT_ANSWER': return 'ANSWERING';
    case 'REVEAL_ACK': return 'ANSWER_REVEAL';
    case 'SUBMIT_DECISION': return 'DECIDING';
    case 'NEXT_ROUND_READY': return 'ROUND_REVEAL';
    case 'REMATCH_REQUEST': return 'MATCH_RESULT';
  }
}
/** State can prove the action is locked or the old context has completed. */
export function pendingResolved(snapshot: RoomSnapshot, envelope: ActionEnvelope): boolean {
  if (envelope.action.type === 'PLAYER_LEAVE') return false; // Only its committed receipt confirms removal.
  const { public: view, private: own } = snapshot;
  if (view.matchId !== envelope.matchId || view.roundId !== envelope.roundId ||
      view.clueIndex !== envelope.clueIndex || view.phase !== commandPhase(envelope.action)) return true;
  switch (envelope.action.type) {
    case 'PLAYER_READY': return view.players[snapshot.seat]?.ready === envelope.action.ready;
    case 'START_MATCH': return false;
    case 'ROLE_ACK': return own.roleAcknowledged;
    case 'SUBMIT_ANSWER': return own.answerSubmitted;
    case 'REVEAL_ACK': return own.revealAcknowledged;
    case 'SUBMIT_DECISION': return own.decisionSubmitted;
    case 'NEXT_ROUND_READY': return own.nextRoundReady;
    case 'REMATCH_REQUEST': return own.rematchRequested;
  }
}
