'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROLE_IDS, ROLES } from '@/lib/game/types';
import type { DecisionAction, RoleId, Scenario } from '@/lib/game/types';
import type { NoteTag, SuspicionNotes } from '@/lib/client/roundNotes';
import GameHeader from '@/components/game/GameHeader';
import LobbyView from '@/components/game/LobbyView';
import RoleIntroView from '@/components/game/RoleIntroView';
import AnsweringView from '@/components/game/AnsweringView';
import AnswerRevealView from '@/components/game/AnswerRevealView';
import DecidingView from '@/components/game/DecidingView';
import RoundRevealView from '@/components/game/RoundRevealView';
import MatchResultView from '@/components/game/MatchResultView';
import AbandonedView from '@/components/game/AbandonedView';
import RoomConnectionStatus from '@/components/game/RoomConnectionStatus';
import { RoomLoadingView, RoomConnectionErrorView } from '@/components/game/RoomAccessViews';
import RulesModal from '@/components/game/RulesModal';
import HomePreview from './HomePreview';
import UtilityPreview from './UtilityPreview';
import { createPreviewSnapshot, PREVIEW_SCREENS } from './fixtures';
import type { PreviewOptions, PreviewState } from './fixtures';
import styles from './preview.module.css';

const STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'ก่อนส่งคำตอบ / พร้อมกด' },
  { value: 'waiting', label: 'ส่งแล้ว / รอเพื่อน' },
  { value: 'blocked', label: 'ปุ่มถูกปิดชั่วคราว' },
  { value: 'guessed', label: 'เคยทายบทบาทแล้ว' },
];

const HOME_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'หน้าแรกปกติ' },
  { value: 'waiting', label: 'กำลังสร้างห้อง' },
  { value: 'blocked', label: 'ออฟไลน์' },
];

const ROOM_LOADING_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'กำลังเชื่อมต่อห้อง' },
  { value: 'waiting', label: 'กำลังเปิดแฟ้มคดี' },
];

const ROOM_ERROR_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'เชื่อมต่อไม่ได้' },
  { value: 'waiting', label: 'มีคำขอออกจากห้องค้างอยู่' },
  { value: 'blocked', label: 'คำขอเดิมกำลังดำเนินการ' },
];

const ROOM_RECOVERY_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'ปัญหาการเชื่อมต่อ' },
  { value: 'waiting', label: 'คำขอเดิมยังรอยืนยัน' },
  { value: 'blocked', label: 'กำลังตรวจคำขอเดิม / ปุ่มถูกปิด' },
];

const LEAVE_CONFIRM_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'active', label: 'ระหว่างเล่นเกม' },
  { value: 'waiting', label: 'ก่อนเริ่มเกม' },
  { value: 'guessed', label: 'หลังจบเกม / เกมยุติ' },
  { value: 'blocked', label: 'มีคำขอดำเนินการอยู่ / ปุ่มออกถูกปิด' },
];

const NOT_FOUND_STATES: Array<{ value: PreviewState; label: string }> = [{ value: 'active', label: 'ไม่พบหน้านี้' }];

function readIndex(value: string | null) {
  return value && /^[1-4]$/.test(value) ? Number(value) - 1 : 0;
}

export default function GamePreview({ scenarios }: { scenarios: Scenario[] }) {
  const searchParams = useSearchParams();
  const phase = PREVIEW_SCREENS.find(item => item.phase === searchParams.get('phase')?.toUpperCase())?.phase ?? 'ROLE_INTRO';
  const isHome = phase === 'HOME';
  const isRoomAccess = phase === 'ROOM_LOADING' || phase === 'ROOM_ERROR';
  const isUtility = phase === 'ROOM_RECOVERY' || phase === 'LEAVE_CONFIRM' || phase === 'NOT_FOUND';
  const fixedOptions = isHome || isRoomAccess || isUtility;
  const availableStates = isHome ? HOME_STATES : phase === 'ROOM_LOADING' ? ROOM_LOADING_STATES : phase === 'ROOM_ERROR' ? ROOM_ERROR_STATES
    : phase === 'ROOM_RECOVERY' ? ROOM_RECOVERY_STATES : phase === 'LEAVE_CONFIRM' ? LEAVE_CONFIRM_STATES : phase === 'NOT_FOUND' ? NOT_FOUND_STATES : STATES;
  const role = ROLE_IDS.find(id => id === searchParams.get('role')) ?? 'alien';
  const state = availableStates.find(item => item.value === searchParams.get('state'))?.value ?? 'active';
  const roundIndex = readIndex(searchParams.get('round'));
  const clueIndex = readIndex(searchParams.get('clue'));
  const seat = searchParams.get('seat') === '2' ? 1 : 0;
  const [resetVersion, setResetVersion] = useState(0);
  const screenKey = `${phase}:${role}:${state}:${roundIndex}:${clueIndex}:${seat}:${resetVersion}`;

  function updateOption(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    window.history.replaceState(null, '', `/preview?${params.toString()}`);
  }

  return (
    <div className={styles.root}>
      <details className={styles.toolbar} open>
        <summary className={styles.summary}>
          <span><strong>UI Preview</strong><span className={styles.badge}>ข้อมูลตัวอย่าง</span></span>
          <span className={styles.foldHint}>แสดง / ซ่อนตัวเลือก</span>
        </summary>
        <div className={styles.controls}>
          <p className={styles.description}>เลือกหน้าที่ต้องการดูได้ทันที ปุ่มบนหน้าตัวอย่างจำลองสถานะบนหน้านี้เท่านั้น</p>
          <div className={styles.controlGrid}>
            <label>หน้าที่ต้องการดู
              <select value={phase} onChange={event => updateOption('phase', event.target.value)}>
                {PREVIEW_SCREENS.map(item => <option key={item.phase} value={item.phase}>{item.label}</option>)}
              </select>
            </label>
            <label>บทบาทของคุณ
              <select disabled={fixedOptions} value={role} onChange={event => updateOption('role', event.target.value)}>
                {ROLE_IDS.map(id => <option key={id} value={id}>{ROLES[id].name}</option>)}
              </select>
            </label>
            <label>มุมมองผู้เล่น
              <select disabled={fixedOptions} value={seat + 1} onChange={event => updateOption('seat', event.target.value)}>
                <option value="1">มะลิ — เจ้าห้อง</option>
                <option value="2">ต้น — เพื่อน</option>
              </select>
            </label>
            <label>สถานะตัวอย่าง
              <select value={state} onChange={event => updateOption('state', event.target.value)}>
                {availableStates.filter(item => item.value !== 'guessed' || phase === 'DECIDING' || phase === 'LEAVE_CONFIRM' || state === 'guessed').map(item =>
                  <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>รอบที่
              <select disabled={fixedOptions} value={roundIndex + 1} onChange={event => updateOption('round', event.target.value)}>
                {[1, 2, 3, 4].map(index => <option key={index} value={index}>รอบที่ {index}</option>)}
              </select>
            </label>
            <label>สถานการณ์ที่
              <select disabled={fixedOptions} value={clueIndex + 1} onChange={event => updateOption('clue', event.target.value)}>
                {[1, 2, 3, 4].map(index => <option key={index} value={index}>ข้อที่ {index}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.toolActions}>
            <button className={styles.toolButton} onClick={() => setResetVersion(version => version + 1)}>รีเซ็ตตัวอย่าง</button>
            <span>URL จะจำตัวเลือกไว้ เปิดลิงก์เดิมเพื่อดูหน้าเดิมได้</span>
          </div>
        </div>
      </details>
      {isHome ? <HomePreview key={screenKey} state={state} />
        : phase === 'ROOM_LOADING' || phase === 'ROOM_ERROR' ? <RoomAccessPreview key={screenKey} screen={phase} state={state} />
        : phase === 'ROOM_RECOVERY' || phase === 'LEAVE_CONFIRM' || phase === 'NOT_FOUND' ? <UtilityPreview key={screenKey} screen={phase} state={state} scenarios={scenarios} />
        : <PreviewScreen key={screenKey} options={{ phase, role, state, roundIndex, clueIndex, seat }} scenarios={scenarios} />}
    </div>
  );
}

function RoomAccessPreview({ screen, state }: { screen: 'ROOM_LOADING' | 'ROOM_ERROR'; state: PreviewState }) {
  const [notice, setNotice] = useState('');
  return (
    <div className={`room-page-layout ${styles.gameFrame}`}>
      {screen === 'ROOM_LOADING' ? <RoomLoadingView roomCode={state === 'waiting' ? undefined : 'DEMOUI'} /> : (
        <RoomConnectionErrorView roomCode="DEMOUI" message="เชื่อมต่อบัญชีผู้เล่นไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่"
          onRetry={() => setNotice('จำลองการลองเชื่อมต่อใหม่แล้ว')}
          onBackToHome={() => setNotice('จำลองการกลับหน้าหลักแล้ว')}>
          {(state === 'waiting' || state === 'blocked') && <button className="btn btn-primary room-pending-leave" disabled={state === 'blocked'}
            onClick={() => setNotice('จำลองการลองคำขอออกจากห้องเดิมแล้ว')}>ลองคำขอออกจากห้องเดิม</button>}
        </RoomConnectionErrorView>
      )}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </div>
  );
}

function PreviewScreen({ options, scenarios }: { options: PreviewOptions; scenarios: Scenario[] }) {
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [guess, setGuess] = useState<RoleId | null>(null);
  const [ready, setReady] = useState(options.state === 'waiting');
  const [notes, setNotes] = useState<SuspicionNotes>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const snapshot = createPreviewSnapshot(options, scenarios, { submitted, answer, guess, ready });
  const { public: pub, private: own, seat, isHost } = snapshot;
  const blocked = options.state === 'blocked';
  const acknowledge = async () => { setSubmitted(true); };
  const previewLeave = () => setNotice('นี่คือหน้าตัวอย่าง ยังอยู่ใน preview และไม่มีห้องจริงให้ปิด');

  async function submitDecision(decision: DecisionAction) {
    if (decision.type === 'guess') setGuess(decision.roleId);
    setSubmitted(true);
  }

  function toggleNote(role: RoleId, tag: NoteTag) {
    setNotes(previous => {
      const next = { ...previous };
      if (next[role] === tag) delete next[role];
      else next[role] = tag;
      return next;
    });
  }

  return (
    <div className={`room-page-layout ${styles.gameFrame}`}>
      <div className="game-screen-wrapper">
        <GameHeader roomCode={pub.code} phase={pub.phase} roundIndex={pub.roundIndex} clueIndex={pub.clueIndex}
          myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
          mySeat={seat} scores={pub.matchScores} onOpenRules={() => setRulesOpen(true)} onLeaveRoom={previewLeave} />
        <div className="room-sync-status" role="status">ตัวอย่างสถานะ: เชื่อมต่อห้องแล้ว</div>
        <RoomConnectionStatus snapshot={snapshot}
          presence={{ known: true, online: { 'preview-host': true, 'preview-guest': true }, error: null }} />
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <main className="game-main-content">
          {pub.phase === 'LOBBY' && <LobbyView roomCode={pub.code} players={pub.players} mySeat={seat} isHost={isHost}
            actionBlocked={blocked} onToggleReady={async value => { setReady(value); }}
            onStartMatch={async () => { setNotice('พร้อมเริ่มแล้ว เลือกหน้า “รับบทบาทลับ” จากแถบตัวเลือกเพื่อดูต่อ'); }}
            onOpenRules={() => setRulesOpen(true)} />}
          {pub.phase === 'ROLE_INTRO' && <RoleIntroView myRole={own.role} roundIndex={pub.roundIndex}
            actionBlocked={blocked} hasAcknowledged={own.roleAcknowledged} onAcknowledgeRole={acknowledge} />}
          {pub.phase === 'ANSWERING' && <AnsweringView scenario={pub.scenario} clueIndex={pub.clueIndex}
            myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
            actionBlocked={blocked} myCommittedAnswer={own.committedAnswer} opponentHasAnswered={false}
            onSubmitAnswer={async optionId => { setAnswer(optionId); setSubmitted(true); }} />}
          {pub.phase === 'ANSWER_REVEAL' && <AnswerRevealView scenario={pub.scenario} clueIndex={pub.clueIndex}
            myRole={own.role} roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
            actionBlocked={blocked} hasAcknowledged={own.revealAcknowledged} mySeat={seat} players={pub.players}
            revealedAnswers={pub.revealedAnswers} evidence={pub.revealedEvidence} onAcknowledgeReveal={acknowledge} />}
          {pub.phase === 'DECIDING' && <DecidingView clueIndex={pub.clueIndex} myRole={own.role}
            mySeat={seat} evidence={pub.revealedEvidence}
            roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
            actionBlocked={blocked} hasSubmitted={own.decisionSubmitted} hasGuessed={own.hasGuessed}
            myGuessedRole={own.guess} myGuessedClueIndex={own.guessClueIndex}
            scratchpad={notes} onToggleNote={toggleNote} onSubmitDecision={submitDecision} />}
          {pub.phase === 'ROUND_REVEAL' && <RoundRevealView roundSummary={pub.roundSummary} roundIndex={pub.roundIndex}
            actionBlocked={blocked} hasAcknowledged={own.nextRoundReady} mySeat={seat} players={pub.players}
            matchScores={pub.matchScores} onNextRoundReady={acknowledge} />}
          {pub.phase === 'MATCH_RESULT' && <MatchResultView players={pub.players} mySeat={seat}
            actionBlocked={blocked} matchScores={pub.matchScores} roundHistory={pub.roundHistory}
            rematchRequests={pub.rematchRequests} onRequestRematch={acknowledge} onBackToHome={previewLeave} />}
          {pub.phase === 'ABANDONED' && <AbandonedView displayName={pub.termination?.displayName ?? 'เพื่อน'}
            busy={blocked} onLeave={previewLeave} />}
        </main>
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </div>
  );
}
