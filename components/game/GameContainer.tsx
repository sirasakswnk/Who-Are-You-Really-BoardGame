'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, ensureAnonymousAuth, rtdb } from '@/lib/firebase/client';
import { ref, onValue } from 'firebase/database';
import { RoomSession, INITIAL_SESSION, type SessionState } from '@/lib/client/roomSession';
import { createRoomApi } from '@/lib/client/roomApi';
import type { ClientCommand } from '@/lib/game/commands';
import type { ActionStorage } from '@/lib/client/pendingAction';
import GameHeader from './GameHeader';
import LobbyView from './LobbyView';
import RoleIntroView from './RoleIntroView';
import AnsweringView from './AnsweringView';
import AnswerRevealView from './AnswerRevealView';
import DecidingView from './DecidingView';
import RoundRevealView from './RoundRevealView';
import MatchResultView from './MatchResultView';
import RulesModal from './RulesModal';
import AbandonedView from './AbandonedView';
import RoomConnectionStatus from './RoomConnectionStatus';
import { RoomLoadingView, RoomConnectionErrorView } from './RoomAccessViews';
import RoomRecoveryBanner from './RoomRecoveryBanner';
import { RoomPresence, firebasePresence, UNKNOWN_PRESENCE, type PresenceState } from '@/lib/client/roomPresence';
import { RoundNotes, type SuspicionNotes } from '@/lib/client/roundNotes';

export default function GameContainer({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_SESSION);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const sessionRef = useRef<RoomSession | null>(null);
  const [presenceState, setPresenceState] = useState<PresenceState>(UNKNOWN_PRESENCE);
  const presenceRef = useRef<RoomPresence | null>(null);
  const notesRef = useRef<RoundNotes | null>(null);
  const [notes, setNotes] = useState<SuspicionNotes>({});
  const resetExitedRoomOnHideRef = useRef(false);

  /* A cached room must not restore the completed departure UI on the next join. */
  useLayoutEffect(() => {
    return () => {
      if (!resetExitedRoomOnHideRef.current) return;
      resetExitedRoomOnHideRef.current = false;
      setSessionState(INITIAL_SESSION);
      setPresenceState(UNKNOWN_PRESENCE);
    };
  }, []);

  useEffect(() => {
    let active = true, expired = false;
    const cleanups: Array<() => void> = [];
    let session: RoomSession | null = null;
    let presence: RoomPresence | null = null;
    const timeout = setTimeout(() => {
      expired = true;
      if (active && !session) setSessionState({ ...INITIAL_SESSION, loading: false, connectionError: 'เชื่อมต่อบัญชีผู้เล่นไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่' });
    }, 12_000);
    async function initialize() {
      try {
        const user = await ensureAnonymousAuth();
        if (!active || expired) return;
        clearTimeout(timeout);
        let storage: ActionStorage | null = null;
        try { storage = window.sessionStorage; } catch { /* Keep pending requests in this tab's controller. */ }
        let notesStorage: ActionStorage | null = null;
        try { notesStorage = window.localStorage; } catch { /* Notes still survive phase changes in memory. */ }
        const notesController = new RoundNotes(notesStorage, user.uid, roomCode, value => { if (active) setNotes(value); });
        notesRef.current = notesController;
        cleanups.push(() => { if (notesRef.current === notesController) notesRef.current = null; });
        session = new RoomSession(roomCode, user.uid, createRoomApi(() => auth.currentUser, user.uid), storage,
          state => {
            if (!active) return;
            setSessionState(state);
            if (state.snapshot && !state.synchronizing) notesController.activate(state.snapshot.public);
            if (state.left) presence?.dispose();
            if (state.snapshot && !state.left && !presence) {
              try {
                presence = new RoomPresence(firebasePresence(rtdb, roomCode, user.uid),
                  value => { if (active) setPresenceState(value); });
                presenceRef.current = presence;
                presence.start();
              } catch { setPresenceState({ ...UNKNOWN_PRESENCE, error: 'ยังตรวจการเชื่อมต่อของคู่เล่นไม่ได้' }); }
            }
          });
        const controller = session;
        sessionRef.current = controller;
        controller.setOnline(navigator.onLine);
        for (const kind of ['public', 'private'] as const) {
          const path = kind === 'public' ? `rooms/${roomCode}/public` : `rooms/${roomCode}/private/${user.uid}`;
          try {
            cleanups.push(onValue(ref(rtdb, path), snapshot => {
              if (snapshot.exists()) controller.receive(kind, snapshot.val());
              else controller.realtimeError(kind);
            }, () => controller.realtimeError(kind)));
          } catch { controller.realtimeError(kind); }
        }
        try { cleanups.push(onValue(ref(rtdb, '.info/connected'), snapshot => controller.setConnected(snapshot.val() === true))); }
        catch { controller.setConnected(false); }
        const online = () => controller.setOnline(true);
        const offline = () => controller.setOnline(false);
        const focus = () => { if (document.visibilityState === 'visible') void controller.refreshFresh(); };
        const storedNotes = (event: StorageEvent) => {
          if (event.key === notesController.key || event.key === null) { notesController.reload(); void controller.refreshFresh(); }
        };
        window.addEventListener('online', online); window.addEventListener('offline', offline);
        window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
        window.addEventListener('storage', storedNotes);
        cleanups.push(() => {
          window.removeEventListener('online', online); window.removeEventListener('offline', offline);
          window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus);
          window.removeEventListener('storage', storedNotes);
        });
        await controller.start();
      } catch {
        if (active) setSessionState({ ...INITIAL_SESSION, loading: false, connectionError: 'ยืนยันบัญชีผู้เล่นไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่' });
      } finally { clearTimeout(timeout); }
    }
    void initialize();
    return () => {
      active = false; clearTimeout(timeout);
      session?.dispose(); cleanups.forEach(cleanup => cleanup());
      presence?.dispose();
      if (presenceRef.current === presence) presenceRef.current = null;
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [roomCode, bootstrapAttempt]);

  useEffect(() => {
    if (sessionState.left) {
      resetExitedRoomOnHideRef.current = true;
      presenceRef.current?.dispose();
      router.replace('/');
    }
  }, [sessionState.left, router]);

  const send = async (action: ClientCommand) => { await sessionRef.current?.submit(action); };
  const refresh = async () => {
    if (sessionRef.current) await sessionRef.current.refreshFresh();
    else { setSessionState(INITIAL_SESSION); setBootstrapAttempt(attempt => attempt + 1); }
  };
  const leave = () => { void sessionRef.current?.leave(); };
  const snapshot = sessionState.snapshot;
  if (sessionState.loading || (snapshot && snapshot.public.code !== roomCode)) return (
    <RoomLoadingView roomCode={roomCode} />
  );
  if (!snapshot) return (
    <RoomConnectionErrorView roomCode={roomCode} message={sessionState.connectionError || 'กำลังตรวจสถานะห้อง'}
      onRetry={() => void refresh()} onBackToHome={() => router.push('/')}>
      {sessionState.pending?.envelope.action.type === 'PLAYER_LEAVE' && <button className="btn btn-primary room-pending-leave" disabled={sessionState.sending}
        onClick={() => void sessionRef.current?.retry()}>ลองคำขอออกจากห้องเดิม</button>}
    </RoomConnectionErrorView>
  );
  const { public: pub, private: own, seat, isHost } = snapshot;
  const blocked = sessionState.actionBlocked || (pub.phase === 'MATCH_RESULT' && pub.players.some(player => player === null));
  const viewKey = `${pub.matchId}:${pub.roundId}:${pub.phase}:${pub.clueIndex}`;
  return (
    <div className="game-screen-wrapper">
      <GameHeader roomCode={roomCode} phase={pub.phase} roundIndex={pub.roundIndex} clueIndex={pub.clueIndex}
        mySeat={seat} scores={pub.matchScores} leaveBlocked={sessionState.sending || sessionState.left}
        myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
        onOpenRules={() => setIsRulesOpen(true)} onLeaveRoom={leave} />
      <div className="room-sync-status" role="status" aria-live="polite">
        {sessionState.sending ? 'กำลังบันทึกและยืนยันคำขอ...'
          : sessionState.connectionError ? 'กำลังรอเชื่อมต่อและตรวจสถานะอีกครั้ง...'
          : sessionState.synchronizing ? 'กำลังซิงก์สถานะห้อง กรุณารอสักครู่...'
          : sessionState.realtime ? 'เชื่อมต่อห้องแล้ว' : 'อัปเดตสถานะผ่าน server'}
      </div>
      <RoomConnectionStatus presence={presenceState} snapshot={snapshot} />
      {(sessionState.connectionError || sessionState.actionError || (sessionState.pending && !sessionState.sending)) && (
        <RoomRecoveryBanner actions={<>
          <button className="btn btn-secondary" disabled={sessionState.sending} onClick={() => void refresh()}>ตรวจสถานะล่าสุด</button>
          {sessionState.pending && <button className="btn btn-primary" disabled={sessionState.sending}
            onClick={() => void sessionRef.current?.retry()}>ตรวจและลองคำขอเดิมอีกครั้ง</button>}
        </>}>
          {sessionState.connectionError && <p>{sessionState.connectionError}</p>}
          {sessionState.actionError && <p>{sessionState.actionError.message}</p>}
          {sessionState.pending && !sessionState.actionError && <p>ยังรอยืนยันคำขอเดิม กรุณาตรวจสถานะก่อนส่งคำขอใหม่</p>}
        </RoomRecoveryBanner>
      )}
      <main className="game-main-content" key={viewKey}>
        {pub.phase === 'ABANDONED' && <AbandonedView displayName={pub.termination?.displayName ?? 'คู่เล่น'}
          busy={sessionState.sending} onLeave={leave} />}
        {pub.phase === 'LOBBY' && <LobbyView roomCode={roomCode} players={pub.players} mySeat={seat} isHost={isHost}
          actionBlocked={blocked} onToggleReady={ready => send({ type: 'PLAYER_READY', ready })}
          onStartMatch={() => send({ type: 'START_MATCH' })} onOpenRules={() => setIsRulesOpen(true)} />}
        {pub.phase === 'ROLE_INTRO' && <RoleIntroView myRole={own.role} roundIndex={pub.roundIndex}
          actionBlocked={blocked} hasAcknowledged={own.roleAcknowledged} onAcknowledgeRole={() => send({ type: 'ROLE_ACK' })} />}
        {pub.phase === 'ANSWERING' && <AnsweringView scenario={pub.scenario} clueIndex={pub.clueIndex}
          myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
          actionBlocked={blocked} myCommittedAnswer={own.committedAnswer} opponentHasAnswered={false}
          onSubmitAnswer={optionId => send({ type: 'SUBMIT_ANSWER', optionId })} />}
        {pub.phase === 'ANSWER_REVEAL' && <AnswerRevealView scenario={pub.scenario} clueIndex={pub.clueIndex}
          myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
          actionBlocked={blocked} hasAcknowledged={own.revealAcknowledged} mySeat={seat} players={pub.players}
          revealedAnswers={pub.revealedAnswers} evidence={pub.revealedEvidence} onAcknowledgeReveal={() => send({ type: 'REVEAL_ACK' })} />}
        {pub.phase === 'DECIDING' && <DecidingView clueIndex={pub.clueIndex} myRole={own.role}
          roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
          actionBlocked={blocked} hasSubmitted={own.decisionSubmitted} hasGuessed={own.hasGuessed}
          myGuessedRole={own.guess} myGuessedClueIndex={own.guessClueIndex}
          scratchpad={notes} onToggleNote={(role, tag) => notesRef.current?.toggle(role, tag)}
          onSubmitDecision={decision => send({ type: 'SUBMIT_DECISION', decision })} />}
        {pub.phase === 'ROUND_REVEAL' && <RoundRevealView roundSummary={pub.roundSummary} roundIndex={pub.roundIndex}
          actionBlocked={blocked} hasAcknowledged={own.nextRoundReady} mySeat={seat} players={pub.players}
          matchScores={pub.matchScores} onNextRoundReady={() => send({ type: 'NEXT_ROUND_READY' })} />}
        {pub.phase === 'MATCH_RESULT' && <MatchResultView players={pub.players} mySeat={seat} matchScores={pub.matchScores}
          actionBlocked={blocked} leaveBlocked={sessionState.sending} roundHistory={pub.roundHistory} rematchRequests={pub.rematchRequests}
          onRequestRematch={() => send({ type: 'REMATCH_REQUEST' })} onBackToHome={leave} />}
      </main>
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
