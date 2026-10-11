'use client';

import { useState } from 'react';
import type { Scenario } from '@/lib/game/types';
import NotFoundView from '@/components/NotFoundView';
import GameHeader from '@/components/game/GameHeader';
import AnsweringView from '@/components/game/AnsweringView';
import RoomRecoveryBanner from '@/components/game/RoomRecoveryBanner';
import LeaveRoomDialog from '@/components/game/LeaveRoomDialog';
import { createPreviewSnapshot, type PreviewState } from './fixtures';
import styles from './preview.module.css';

export type UtilityScreen = 'ROOM_RECOVERY' | 'LEAVE_CONFIRM' | 'NOT_FOUND';

export default function UtilityPreview({ screen, state, scenarios }: {
  screen: UtilityScreen;
  state: PreviewState;
  scenarios: Scenario[];
}) {
  const [notice, setNotice] = useState('');
  const [showLeave, setShowLeave] = useState(true);
  const blocked = state === 'blocked';
  const snapshot = createPreviewSnapshot({ phase: 'ANSWERING', role: 'alien', state: 'active', roundIndex: 0, clueIndex: 0, seat: 0 }, scenarios,
    { submitted: false, answer: null, guess: null, ready: false });
  const { public: pub, private: own } = snapshot;

  if (screen === 'NOT_FOUND') return <>
    <NotFoundView onBackToHome={() => setNotice('จำลองการกลับหน้าหลักแล้ว')} />
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </>;

  const leaveDescription = state === 'waiting' ? 'ที่นั่งของคุณจะว่าง และโอนเจ้าห้องให้ผู้เล่นที่เหลือ'
    : state === 'guessed' ? 'ออกจากห้องนี้และกลับหน้าหลัก'
    : 'หากออกจากห้อง เกมนี้จะยุติและไม่มีผู้ชนะเต็มเกม';
  const closeLeave = () => setShowLeave(false);

  return (
    <div className={`room-page-layout ${styles.gameFrame}`}>
      <div className="game-screen-wrapper">
        <GameHeader roomCode={pub.code} phase={pub.phase} roundIndex={pub.roundIndex} clueIndex={pub.clueIndex}
          mySeat={0} scores={pub.matchScores} onOpenRules={() => setNotice('นี่คือหน้าตัวอย่างใบรายงานและใบยืนยัน')}
          onLeaveRoom={() => setNotice('จำลองการออกจากห้องแล้ว')} />
        {screen === 'ROOM_RECOVERY' ? (
          <RoomRecoveryBanner actions={<>
            <button type="button" className="btn btn-secondary" disabled={blocked}
              onClick={() => setNotice('จำลองการตรวจสถานะล่าสุดแล้ว')}>ตรวจสถานะล่าสุด</button>
            {state !== 'active' && <button type="button" className="btn btn-primary" disabled={blocked}
              onClick={() => setNotice('จำลองการตรวจและลองคำขอเดิมแล้ว')}>ตรวจและลองคำขอเดิมอีกครั้ง</button>}
          </>}>
            {state === 'active' && <p>ขาดการเชื่อมต่อกับห้อง กรุณาตรวจสถานะล่าสุด</p>}
            {state === 'waiting' && <p>ยังรอยืนยันคำขอเดิม กรุณาตรวจสถานะก่อนส่งคำขอใหม่</p>}
            {blocked && <p>ยังยืนยันคำขอไม่สำเร็จ กำลังตรวจคำขอเดิมอีกครั้ง</p>}
          </RoomRecoveryBanner>
        ) : <>
          <button type="button" className={styles.toolButton} onClick={() => setShowLeave(true)}>ดูใบยืนยันออกจากห้อง</button>
          {showLeave && <LeaveRoomDialog description={leaveDescription} onClose={closeLeave}>
            <button type="button" className="btn btn-secondary" onClick={closeLeave}>ยกเลิก</button>
            <button type="button" className="btn btn-danger" disabled={blocked} onClick={() => {
              closeLeave();
              if (!blocked) setNotice('จำลองการออกจากห้องแล้ว');
            }}>ออกจากห้อง</button>
          </LeaveRoomDialog>}
        </>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <main className="game-main-content">
          <AnsweringView scenario={pub.scenario} clueIndex={pub.clueIndex} myRole={own.role}
            roleAcknowledged={own.roleAcknowledged} roleContextKey={`${pub.matchId}:${pub.roundId}`}
            actionBlocked={screen === 'ROOM_RECOVERY'} myCommittedAnswer={null} opponentHasAnswered={false}
            onSubmitAnswer={async () => { setNotice('นี่คือหน้าตัวอย่าง ยังไม่ได้ส่งคำตอบ'); }} />
        </main>
      </div>
    </div>
  );
}
