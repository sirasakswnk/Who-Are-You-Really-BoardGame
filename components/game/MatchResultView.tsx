'use client';

import { useId, useState } from 'react';
import { PlayerSeat, RoundResult, getRoleInfo } from '@/lib/game/types';
import { determineMatchWinner } from '@/lib/game/scoring';
import RolePortrait from './RolePortrait';
import styles from './MatchResultView.module.css';

interface MatchResultViewProps {
  actionBlocked?: boolean;
  players: [PlayerSeat | null, PlayerSeat | null];
  mySeat: 0 | 1;
  matchScores: [number, number];
  roundHistory: RoundResult[];
  rematchRequests: [boolean, boolean];
  onRequestRematch: () => Promise<void>;
  onBackToHome: () => void;
  leaveBlocked?: boolean;
}

export default function MatchResultView({
  actionBlocked = false,
  players,
  mySeat,
  matchScores,
  roundHistory,
  rematchRequests,
  onRequestRematch,
  onBackToHome,
  leaveBlocked = false,
}: MatchResultViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const documentId = useId();

  const opponentSeat = mySeat === 0 ? 1 : 0;
  const opponent = players[opponentSeat];

  const myScore = matchScores[mySeat] ?? 0;
  const oppScore = matchScores[opponentSeat] ?? 0;

  const outcome = determineMatchWinner(matchScores);
  const isWinner = outcome.winner === mySeat;
  const isLoser = outcome.winner === opponentSeat;
  const isTie = outcome.isTie;

  const myRematch = rematchRequests[mySeat];
  const oppRematch = rematchRequests[opponentSeat];

  const handleRematch = async () => {
    if (actionBlocked || isSubmitting || myRematch) return;
    setIsSubmitting(true);
    try {
      await onRequestRematch();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`match-result-container ${styles.folder}`} aria-labelledby={`${documentId}-title`}>
      <span className={styles.tab} aria-hidden="true">แฟ้มปิดคดี</span>
      <span className={styles.spine} aria-hidden="true" />
      <svg className={styles.clip} viewBox="0 0 32 64" fill="none" aria-hidden="true">
        <path d="M10 47V14a8 8 0 0 1 16 0v36a11 11 0 0 1-22 0V21a5 5 0 0 1 10 0v29a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>

      <header className={styles.header}>
        <div className={styles.metadata}>
          <span className={styles.reportLabel}>รายงานฉบับสุดท้าย</span>
          <span className={styles.closedStamp}>ปิดคดีแล้ว</span>
        </div>
        <div className={`${styles.outcome} ${isWinner ? styles.win : isLoser ? styles.lose : styles.tie}`}>
          <svg className={styles.seal} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1.5" />
            <path d="M18 24h11l4 5h13v15H18V24Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="m26 36 4 4 9-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className={styles.outcomeText}>
            <h1 id={`${documentId}-title`} className={`match-headline ${styles.title}`}>
              {isWinner && 'คุณชนะ'}
              {isLoser && 'เพื่อนชนะ'}
              {isTie && 'เสมอ'}
            </h1>
            <p className={styles.caption}>
              {isWinner && `ชนะด้วยคะแนนนำ ${outcome.scoreDifference} แต้ม`}
              {isLoser && `เพื่อนชนะไป ${outcome.scoreDifference} แต้ม`}
              {isTie && 'ทั้งสองฝ่ายทำคะแนนรวมได้เท่ากันพอดี'}
            </p>
          </div>
        </div>
      </header>

      <section className={styles.scoreboard} aria-labelledby={`${documentId}-scores`}>
        <h2 id={`${documentId}-scores`} className={styles.scoreboardTitle}>คะแนนรวมทั้งเกม</h2>
        <div className={styles.scoreboardDisplay}>
          <div className={`${styles.scoreSide} ${styles.myScore}`}>
            <span className={styles.playerLabel}>คุณ</span>
            <strong className={`match-total-name ${styles.playerName}`}>{players[mySeat]?.displayName ?? 'คุณ'}</strong>
            <span className={`match-total-number ${styles.scoreNumber}`}>{myScore}</span>
            <span className={styles.scoreUnit}>คะแนน</span>
          </div>
          <span className={styles.scoreSeparator} aria-hidden="true">—</span>
          <div className={`${styles.scoreSide} ${styles.opponentScore}`}>
            <span className={styles.playerLabel}>เพื่อน</span>
            <strong className={`match-total-name ${styles.playerName}`}>{opponent?.displayName ?? 'เพื่อน'}</strong>
            <span className={`match-total-number ${styles.scoreNumber}`}>{oppScore}</span>
            <span className={styles.scoreUnit}>คะแนน</span>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        {oppRematch && !myRematch && (
          <div className={styles.incoming} role="status">
            {opponent?.displayName ?? 'เพื่อน'} ขอเล่นอีกครั้งแล้ว กด “เล่นอีกครั้ง” เพื่อตอบรับ
          </div>
        )}

        <div className={`result-actions-row ${styles.actions}`}>
          <button
            className={`rematch-btn ${styles.rematch} ${myRematch ? styles.requested : ''}`}
            onClick={handleRematch}
            disabled={myRematch || isSubmitting || actionBlocked}
          >
            {myRematch ? 'ส่งคำขอแล้ว' : isSubmitting ? 'กำลังส่งคำขอ…' : 'เล่นอีกครั้ง'}
          </button>

          <button className={`home-btn ${styles.home}`} disabled={leaveBlocked} onClick={onBackToHome}>
            กลับหน้าแรก
          </button>
        </div>
        {myRematch && <p className={`match-rematch-status ${styles.waiting}`} role="status">รอเพื่อนตอบรับการเล่นอีกครั้ง</p>}
      </div>

      <section className={`evidence-history-section ${styles.history}`} aria-labelledby={`${documentId}-history`}>
        <h2 id={`${documentId}-history`} className={styles.historyTitle}>สรุปผลการสืบสวนทั้ง 4 รอบ</h2>
        <p className={styles.historyHint}>แตะแต่ละรอบเพื่อเปิดบทบาท คำทาย และหลักฐาน</p>
        <div className={styles.columnLabels} aria-hidden="true">
          <span>แฟ้มประจำรอบ</span><span>คุณ</span><span>เพื่อน</span><span />
        </div>
        <div className={styles.roundList}>
          {roundHistory.map(round => (
            <details key={round.roundIndex} className={`match-round ${styles.round}`}>
              <summary className={styles.roundSummary}>
                <span className={styles.roundLabel}>รอบที่ {round.roundIndex + 1}</span>
                <span className={`match-round-score ${styles.roundScore} ${styles.myRoundScore}`}><span className={styles.srOnly}>คุณ </span>+{round.scores[mySeat]}</span>
                <span className={`match-round-score ${styles.roundScore} ${styles.opponentRoundScore}`}><span className={styles.srOnly}>เพื่อน </span>+{round.scores[opponentSeat]}</span>
                <svg className={styles.chevron} width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className={styles.roundContent}>
                <div className={styles.playerReports}>
                  {([mySeat, opponentSeat] as const).map(seat => (
                    <div key={seat} className={`${styles.playerReport} ${seat === mySeat ? styles.myReport : styles.opponentReport}`}>
                      <h3 className={styles.reportName}>{seat === mySeat ? 'คุณ' : 'เพื่อน'} · {players[seat]?.displayName ?? (seat === mySeat ? 'คุณ' : 'เพื่อน')}</h3>
                      <div className={styles.actualRole}>
                        <RolePortrait role={round.roles[seat]} className={styles.portrait} sizes="64px" />
                        <div className={styles.roleText}>
                          <span>บทบาทที่ได้รับ</span>
                          <strong className="match-round-role">{getRoleInfo(round.roles[seat]).name}</strong>
                        </div>
                      </div>
                      <p className={`match-round-guess ${styles.guess}`}>
                        {seat === mySeat ? 'คำทายของคุณ' : 'คำทายของเพื่อน'}: {round.guesses[seat] ? getRoleInfo(round.guesses[seat]!).name : 'ไม่ได้ทาย'}
                        {round.guessClueIndex[seat] !== null && ` หลังข้อที่ ${round.guessClueIndex[seat]! + 1}`}
                      </p>
                      <p className={`match-round-reason ${styles.reason}`}>{round.reason[seat]}</p>
                    </div>
                  ))}
                </div>
                <h3 className={styles.evidenceTitle}>หลักฐานที่เปิดเผยแล้ว</h3>
                {round.evidence?.length ? (
                  <div className={styles.evidenceList}>
                    {round.evidence.map(entry => (
                      <div className={`match-evidence ${styles.evidence}`} key={entry.clueIndex}>
                        <span className={styles.clueBadge}>ข้อ {entry.clueIndex + 1}</span>
                        <p className={`match-evidence-prompt ${styles.prompt}`}>{entry.prompt}</p>
                        <div className={styles.answer}>
                          <span className={styles.answerLabel}>คุณตอบ</span>
                          <p className="match-evidence-answer">{entry.answers[mySeat]}</p>
                        </div>
                        <div className={styles.answer}>
                          <span className={styles.answerLabel}>เพื่อนตอบ</span>
                          <p className="match-evidence-answer">{entry.answers[opponentSeat]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.legacyNote}>ห้องเดิมไม่ได้บันทึกข้อความหลักฐานของรอบนี้</p>}
              </div>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
