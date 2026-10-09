import type { DecisionAction } from './types';

/** Public commands contain choices only. Actor and game material are server-owned. */
export type ClientCommand =
  | { type: 'PLAYER_LEAVE' }
  | { type: 'PLAYER_READY'; ready: boolean }
  | { type: 'START_MATCH' }
  | { type: 'ROLE_ACK' }
  | { type: 'SUBMIT_ANSWER'; optionId: string }
  | { type: 'REVEAL_ACK' }
  | { type: 'SUBMIT_DECISION'; decision: DecisionAction }
  | { type: 'NEXT_ROUND_READY' }
  | { type: 'REMATCH_REQUEST' };

export interface ActionContext {
  actionId: string;
  matchId: string;
  roundId: string | null;
  clueIndex: number;
}
export interface ActionEnvelope extends ActionContext { action: ClientCommand }

/** UUID v4 also works for HTTP LAN previews without crypto.randomUUID. */
export function newActionId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function actionContext(view: Pick<ActionContext, 'matchId' | 'roundId' | 'clueIndex'>): ActionContext {
  return { actionId: newActionId(), matchId: view.matchId, roundId: view.roundId, clueIndex: view.clueIndex };
}
