'use client';

import { useState } from 'react';
import { PlayerSeat } from '@/lib/game/types';

interface LobbyViewProps {
  actionBlocked?: boolean;
  roomCode: string;
  players: [PlayerSeat | null, PlayerSeat | null];
  mySeat: 0 | 1;
  isHost: boolean;
  onToggleReady: (ready: boolean) => Promise<void>;
  onStartMatch: () => Promise<void>;
  onOpenRules: () => void;
}

export default function LobbyView({
  actionBlocked = false,
  roomCode,
  players,
  mySeat,
  isHost,
  onToggleReady,
  onStartMatch,
  onOpenRules,
}: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const me = players[mySeat];

  const myReady = me?.ready ?? false;
  const bothReady = Boolean(players[0]?.ready && players[1]?.ready);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${roomCode}`
    : `/?room=${roomCode}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleReadyClick = async () => {
    if (actionBlocked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onToggleReady(!myReady);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartClick = async () => {
    if (actionBlocked || isSubmitting || !isHost || !bothReady) return;
    setIsSubmitting(true);
    try {
      await onStartMatch();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lobby-container">
      {/* Investigation File Header */}
      <div className="lobby-hero">
        <div className="lobby-file-tag">
          <svg width="14" height="14" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }}>
            <use href="#ico-tag" />
          </svg>
          แฟ้มคดีใหม่: รหัสห้อง
        </div>
        <div className="lobby-code-display">
          <span className="lobby-code-chars">{roomCode}</span>
          <button
            className="btn btn-secondary btn-sm lobby-copy-btn"
            onClick={handleCopyInvite}
            aria-label="คัดลอกลิงก์ชวนเพื่อน"
          >
            {copied ? 'คัดลอกแล้ว! ✓' : 'คัดลอกลิงก์ 📋'}
          </button>
        </div>
        <p className="lobby-subtitle">
          ส่งรหัสนี้หรือแชร์ลิงก์ให้เพื่อนเพื่อเริ่มการสืบสวนตัวตน (เล่น 2 คน)
        </p>
      </div>

      {/* Two Player Desks */}
      <div className="lobby-seats-grid">
        {/* Seat 0 */}
        <div className={`lobby-seat-card ${players[0] ? 'occupied' : 'empty'} ${mySeat === 0 ? 'is-me' : ''}`}>
          <div className="seat-badge-row">
            <span className="seat-role-tag">นักสืบคนที่ 1 (หัวหน้าห้อง 👑)</span>
            {players[0]?.ready ? (
              <span className="status-badge ready">พร้อมแล้ว ✓</span>
            ) : (
              <span className="status-badge waiting">กำลังเตรียมตัว...</span>
            )}
          </div>
          <div className="seat-avatar-wrap">
            {players[0] ? (
              <svg className="seat-avatar-svg" width="64" height="64" viewBox="0 0 80 80">
                <use href={`#av-${players[0].avatarId}`} />
              </svg>
            ) : (
              <div className="seat-avatar-placeholder">?</div>
            )}
          </div>
          <div className="seat-player-name">
            {players[0]?.displayName ?? 'รอผู้เล่น...'}
            {mySeat === 0 && <span className="seat-you-tag">(คุณ)</span>}
          </div>
        </div>

        {/* Seat 1 */}
        <div className={`lobby-seat-card ${players[1] ? 'occupied' : 'empty'} ${mySeat === 1 ? 'is-me' : ''}`}>
          <div className="seat-badge-row">
            <span className="seat-role-tag">นักสืบคนที่ 2</span>
            {players[1] ? (
              players[1].ready ? (
                <span className="status-badge ready">พร้อมแล้ว ✓</span>
              ) : (
                <span className="status-badge waiting">กำลังเตรียมตัว...</span>
              )
            ) : (
              <span className="status-badge waiting">รอเข้าร่วม...</span>
            )}
          </div>
          <div className="seat-avatar-wrap">
            {players[1] ? (
              <svg className="seat-avatar-svg" width="64" height="64" viewBox="0 0 80 80">
                <use href={`#av-${players[1].avatarId}`} />
              </svg>
            ) : (
              <div className="seat-avatar-placeholder seat-waiting-pulse">
                <span>รอเพื่อน</span>
              </div>
            )}
          </div>
          <div className="seat-player-name">
            {players[1]?.displayName ?? 'กำลังรอเพื่อนเข้าร่วม...'}
            {mySeat === 1 && <span className="seat-you-tag">(คุณ)</span>}
          </div>
        </div>
      </div>

      {/* Rules Prompt */}
      <button className="lobby-rules-btn" onClick={onOpenRules}>
        <span>📖 ตรวจสอบบทบาททั้ง 6 และตารางคะแนนก่อนเริ่ม</span>
        <span>›</span>
      </button>

      {/* Bottom Action Footer */}
      <div className="lobby-footer">
        {!players[1] ? (
          <div className="lobby-wait-banner">
            <div className="spinner-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            <span>รอเพื่อนเข้าห้องตามรหัส {roomCode}...</span>
          </div>
        ) : (
          <div className="lobby-actions-group">
            {/* Ready Toggle */}
            <button
              className={`btn ${myReady ? 'btn-secondary' : 'btn-success'} btn-lg lobby-ready-btn`}
              onClick={handleReadyClick}
              disabled={isSubmitting || actionBlocked}
            >
              {myReady ? 'ยกเลิกสถานะพร้อม' : 'ฉันพร้อมแล้ว! ✓'}
            </button>

            {/* Host Start Button */}
            {isHost && (
              <button
                className="btn btn-primary btn-lg lobby-start-btn"
                onClick={handleStartClick}
                disabled={!bothReady || isSubmitting || actionBlocked}
              >
                {bothReady ? 'เริ่มการสืบสวน! 🔍' : 'รอทั้งสองคนกดพร้อม...'}
              </button>
            )}

            {!isHost && bothReady && (
              <div className="guest-wait-host-text">
                ทั้งคู่พร้อมแล้ว! กำลังรอหัวหน้าห้องกดเริ่มเกม...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
