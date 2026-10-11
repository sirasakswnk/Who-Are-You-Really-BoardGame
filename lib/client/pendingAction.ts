import { KNOWN_ROLE_IDS } from '../game/types';
import type { ActionEnvelope } from '../game/commands';

export type ActionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface PendingAction { version: 1; uid: string; code: string; envelope: ActionEnvelope }
const key = (code: string) => `wayr.pendingAction.v1:${code}`;
function valid(value: PendingAction, uid: string, code: string): boolean {
  const env = value?.envelope, action = env?.action;
  if (value?.version !== 1 || value.uid !== uid || value.code !== code || !env || !action ||
      typeof env.actionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.actionId) ||
      typeof env.matchId !== 'string' || !env.matchId || env.matchId.length > 128 ||
      !(env.roundId === null || (typeof env.roundId === 'string' && env.roundId.length <= 160)) ||
      !Number.isInteger(env.clueIndex) || env.clueIndex < 0 || env.clueIndex > 3) return false;
  switch (action.type) {
    case 'PLAYER_READY': return typeof action.ready === 'boolean';
    case 'SUBMIT_ANSWER': return typeof action.optionId === 'string' && !!action.optionId && action.optionId.length <= 128;
    case 'SUBMIT_DECISION': return !!action.decision && (['continue', 'ack'].includes(action.decision.type) ||
      (action.decision.type === 'guess' && KNOWN_ROLE_IDS.includes(action.decision.roleId)));
    case 'PLAYER_LEAVE': case 'START_MATCH': case 'ROLE_ACK': case 'REVEAL_ACK': case 'NEXT_ROUND_READY': case 'REMATCH_REQUEST': return true;
    default: return false;
  }
}
export function readPending(storage: ActionStorage | null, uid: string, code: string): PendingAction | null {
  try {
    const value = JSON.parse(storage?.getItem(key(code)) ?? 'null');
    if (valid(value, uid, code)) return value;
  } catch { /* Storage may be disabled or malformed. */ }
  clearPending(storage, code);
  return null;
}
export function savePending(storage: ActionStorage | null, pending: PendingAction): void {
  try { storage?.setItem(key(pending.code), JSON.stringify(pending)); } catch { /* Keep the live controller copy. */ }
}
export function clearPending(storage: ActionStorage | null, code: string): void {
  try { storage?.removeItem(key(code)); } catch { /* The live controller copy is authoritative for this tab. */ }
}
