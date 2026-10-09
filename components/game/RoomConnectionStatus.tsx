import type { PresenceState } from '@/lib/client/roomPresence';
import type { RoomSnapshot } from '@/lib/client/roomSnapshot';

export default function RoomConnectionStatus({ presence, snapshot }: { presence: PresenceState; snapshot: RoomSnapshot }) {
  const opponent = snapshot.public.players[snapshot.seat === 0 ? 1 : 0];
  if (!opponent || ['ABANDONED', 'CLOSED'].includes(snapshot.public.phase)) return null;
  const own = snapshot.private;
  const submitted = snapshot.public.phase === 'LOBBY' ? snapshot.public.players[snapshot.seat]?.ready
    : snapshot.public.phase === 'ROLE_INTRO' ? own.roleAcknowledged
    : snapshot.public.phase === 'ANSWERING' ? own.answerSubmitted
    : snapshot.public.phase === 'ANSWER_REVEAL' ? own.revealAcknowledged
    : snapshot.public.phase === 'DECIDING' ? own.decisionSubmitted
    : snapshot.public.phase === 'ROUND_REVEAL' ? own.nextRoundReady : own.rematchRequested;
  return <div className="room-sync-status" role="status" aria-live="polite">
    {presence.error || (!presence.known ? 'กำลังตรวจการเชื่อมต่อของคู่เล่น...'
      : presence.online[opponent.uid] ? `${opponent.displayName} ออนไลน์`
      : `${opponent.displayName} หลุดการเชื่อมต่อ กำลังรอให้กลับมา ที่นั่งยังถูกเก็บไว้`)}
    {submitted && <p>บันทึกสิ่งที่คุณส่งแล้ว กำลังรอให้ครบทั้งสองคน</p>}
  </div>;
}
