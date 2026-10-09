'use client';

import { useState } from 'react';
import { PlayerSeat, RoundResult, ROLES } from '@/lib/game/types';
import { determineMatchWinner } from '@/lib/game/scoring';

interface MatchResultViewProps {
  players: [PlayerSeat | null, PlayerSeat | null];
  mySeat: 0 | 1;
  matchScores: [number, number];
  roundHistory: RoundResult[];
  rematchRequests: [boolean, boolean];
  onRequestRematch: () => Promise<void>;
  onBackToHome: () => void;
}

export default function MatchResultView({
  players,
  mySeat,
  matchScores,
  roundHistory,
  rematchRequests,
  onRequestRematch,
  onBackToHome,
}: MatchResultViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      await onRequestRematch();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="match-result-container">
      {/* Victory / Defeat Banner */}
      <div className={`result-banner-box ${isWinner ? 'win' : isLoser ? 'lose' : 'tie'}`}>
        <div className="result-trophy-icon">
          {isWinner ? '🏆' : isLoser ? '🔍' : '🤝'}
        </div>
        <h1 className="result-headline">
          {isWinner && 'ยินดีด้วย! คุณคือนักสืบยอดเยี่ยม!'}
          {isLoser && 'รอบนี้เพื่อนจับทางคุณได้ดีกว่า!'}
          {isTie && 'ยอดนักสืบทั้งคู่! ผลการเล่นเสมอกัน!'}
        </h1>
        <div className="result-final-score">
          {myScore} : {oppScore}
        </div>
        <p className="result-sub-caption">
          {isWinner && `ชนะไปด้วยคะแนนนำห่าง ${outcome.scoreDifference} แต้ม`}
          {isLoser && `เพื่อนเฉือนชนะไป ${outcome.scoreDifference} แต้ม`}
          {isTie && 'ทั้งสองฝ่ายทำคะแนนรวมได้เท่ากันพอดี'}
        </p>
      </div>

      {/* 4 Rounds Breakdown Table */}
      <div className="round-breakdown-card">
        <h3 className="breakdown-title">สรุปผลการสืบสวนทั้ง 4 รอบ</h3>
        <div className="breakdown-table-wrap">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>รอบ</th>
                <th>บทของคุณ</th>
                <th>บทของเพื่อน</th>
                <th>คะแนนคุณ</th>
                <th>คะแนนเพื่อน</th>
              </tr>
            </thead>
            <tbody>
              {roundHistory.map((rh, idx) => {
                const myRoleName = ROLES[rh.roles[mySeat]].name;
                const oppRoleName = ROLES[rh.roles[opponentSeat]].name;
                const myPts = rh.scores[mySeat];
                const oppPts = rh.scores[opponentSeat];

                return (
                  <tr key={idx}>
                    <td className="round-num-cell">รอบที่ {idx + 1}</td>
                    <td>{myRoleName}</td>
                    <td>{oppRoleName}</td>
                    <td className={`pts-cell ${myPts > 0 ? 'pts-pos' : ''}`}>+{myPts}</td>
                    <td className={`pts-cell ${oppPts > 0 ? 'pts-pos' : ''}`}>+{oppPts}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="breakdown-total-row">
                <td colSpan={3}><strong>คะแนนรวมทั้งหมด</strong></td>
                <td className="total-cell">{myScore}</td>
                <td className="total-cell">{oppScore}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rematch Status / Buttons */}
      <div className="match-result-footer">
        {oppRematch && !myRematch && (
          <div className="rematch-incoming-alert">
            ⚡ {opponent?.displayName} ได้กดขอเล่นอีกรอบแล้ว! กดปุ่มด้านล่างเพื่อยอมรับ
          </div>
        )}

        <div className="result-actions-row">
          <button
            className={`btn ${myRematch ? 'btn-secondary' : 'btn-primary'} btn-lg rematch-btn`}
            onClick={handleRematch}
            disabled={myRematch || isSubmitting}
          >
            {myRematch ? 'ขอล้างตาแล้ว (รอเพื่อนตอบรับ...)' : 'ขอเล่นอีกรอบ (Rematch) 🔄'}
          </button>

          <button className="btn btn-secondary btn-lg home-btn" onClick={onBackToHome}>
            กลับหน้าแรก 🏠
          </button>
        </div>
      </div>
    </div>
  );
}
