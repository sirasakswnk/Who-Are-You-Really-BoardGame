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
      <span className="lobby-folder-tab" aria-hidden="true">แฟ้มชวนเพื่อน</span>
      <span className="lobby-folder-spine" aria-hidden="true" />
      <span className="lobby-document-sheet" aria-hidden="true" />
      <span className="lobby-case-stamp" aria-hidden="true">แฟ้มสืบตัวตน</span>
      <div className="lobby-hero">
        <svg className="lobby-header-pattern" viewBox="0 0 520 220" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".16">
            <path d="M354-12c89 0 162 61 162 136M390-16c88 0 158 57 158 127" />
            <path d="M-32 181c48-44 111-44 161 0M-28 203c50-45 115-45 165 0" />
          </g>
          <g fill="currentColor" opacity=".18">
            <circle cx="338" cy="157" r="2" /><circle cx="350" cy="165" r="2" /><circle cx="361" cy="157" r="2" />
            <circle cx="76" cy="15" r="1.5" /><circle cx="88" cy="21" r="1.5" />
          </g>
        </svg>
        <div className="lobby-intro">
          <div className="lobby-intro-labels">
            <span className="lobby-brand">Who Are You Really?</span>
            <span className="lobby-duo-label">เล่นด้วยกัน 2 คน</span>
          </div>
          <h1 className="lobby-title">ชวนเพื่อนมาเล่น<span><span className="lobby-title-highlight">สืบตัวตน</span>ไปด้วยกัน</span></h1>
          <p className="lobby-subtitle">
            แชร์รหัสห้องหรือลิงก์ให้เพื่อน แล้วเตรียมสืบตัวตนไปด้วยกัน
          </p>
        </div>
        <section className="lobby-invite" aria-label="ชวนเพื่อนเข้าห้อง">
          <div className="lobby-invite-details">
            <div className="lobby-file-tag">รหัสห้องของเรา</div>
            <div className="lobby-code-display">
              <span className="lobby-code-chars" role="group" aria-label={`รหัสห้อง ${roomCode}`}>
                {roomCode.split('').map((character, index) => (
                  <span key={index} className="lobby-code-char" aria-hidden="true">{character}</span>
                ))}
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm lobby-copy-btn"
            onClick={handleCopyInvite}
            aria-label="คัดลอกลิงก์ชวนเพื่อน"
          >
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์ชวนเพื่อน'}
          </button>
        </section>
      </div>

      <section className="lobby-team" aria-label="ผู้เล่นในห้อง">
        <h2 className="lobby-section-title">บัตรทีมนักสืบ<span>2 ที่นั่ง</span></h2>
        <div className="lobby-seats-grid">
          <div className={`lobby-seat-card ${players[0] ? 'occupied' : 'empty'} ${mySeat === 0 ? 'is-me' : ''}`}>
            <div className="seat-badge-row">
              <span className="seat-index" aria-hidden="true">01</span>
              <span className="seat-role-tag">นักสืบคนที่ 1<span className="seat-host-tag">หัวหน้าห้อง</span></span>
            </div>
            <div className="seat-photo">
              <div className="seat-avatar-wrap">
                {players[0] ? (
                  <svg className="seat-avatar-svg" viewBox="0 0 48 48" aria-hidden="true">
                    <use href={`#av-${players[0].avatarId}`} />
                  </svg>
                ) : (
                  <div className="seat-avatar-placeholder">?</div>
                )}
              </div>
            </div>
            <div className="seat-player-name">
              {players[0]?.displayName ?? 'รอผู้เล่น...'}
              {mySeat === 0 && <span className="seat-you-tag">(คุณ)</span>}
            </div>
            {players[0]?.ready ? (
              <span className="status-badge ready">พร้อมแล้ว ✓</span>
            ) : (
              <span className="status-badge waiting">กำลังเตรียมตัว...</span>
            )}
          </div>

          <div className={`lobby-seat-card ${players[1] ? 'occupied' : 'empty'} ${mySeat === 1 ? 'is-me' : ''}`}>
            <div className="seat-badge-row">
              <span className="seat-index" aria-hidden="true">02</span>
              <span className="seat-role-tag">นักสืบคนที่ 2</span>
            </div>
            <div className="seat-photo">
              <div className="seat-avatar-wrap">
                {players[1] ? (
                  <svg className="seat-avatar-svg" viewBox="0 0 48 48" aria-hidden="true">
                    <use href={`#av-${players[1].avatarId}`} />
                  </svg>
                ) : (
                  <div className="seat-avatar-placeholder seat-waiting-pulse">
                    <svg viewBox="0 0 48 48" aria-hidden="true"><use href="#av-none" /></svg>
                  </div>
                )}
              </div>
            </div>
            <div className="seat-player-name">
              {players[1]?.displayName ?? 'กำลังรอเพื่อนเข้าร่วม...'}
              {mySeat === 1 && <span className="seat-you-tag">(คุณ)</span>}
            </div>
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
        </div>
      </section>

      <button className="lobby-rules-btn" onClick={onOpenRules}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z M12 5v15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span>ตรวจสอบบทบาททั้ง 6 และตารางคะแนนก่อนเริ่ม</span>
        <span className="lobby-rules-arrow" aria-hidden="true">↗</span>
      </button>

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
            <button
              className={`btn ${myReady ? 'btn-secondary' : 'btn-success'} btn-lg lobby-ready-btn`}
              onClick={handleReadyClick}
              disabled={isSubmitting || actionBlocked}
            >
              {myReady ? 'ยกเลิกสถานะพร้อม' : 'ฉันพร้อมแล้ว! ✓'}
            </button>

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
