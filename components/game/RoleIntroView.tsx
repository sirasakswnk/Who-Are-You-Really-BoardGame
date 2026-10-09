'use client';

import { useState } from 'react';
import { RoleId, ROLES } from '@/lib/game/types';

interface RoleIntroViewProps {
  actionBlocked?: boolean;
  myRole: RoleId | null;
  roundIndex: number;
  hasAcknowledged: boolean;
  onAcknowledgeRole: () => Promise<void>;
}

export default function RoleIntroView({
  actionBlocked = false,
  myRole,
  roundIndex,
  hasAcknowledged,
  onAcknowledgeRole,
}: RoleIntroViewProps) {
  const [isCovered, setIsCovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleInfo = myRole ? ROLES[myRole] : null;

  const handleAcknowledge = async () => {
    if (actionBlocked || isSubmitting || hasAcknowledged) return;
    setIsSubmitting(true);
    try {
      await onAcknowledgeRole();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="role-intro-container">
      {/* Round Header */}
      <div className="role-intro-header">
        <span className="case-stamp">รอบที่ {roundIndex + 1} — แฟ้มลับเฉพาะบุคคล</span>
        <h2 className="role-intro-title">บทบาทลับของคุณในรอบนี้</h2>
        <p className="role-intro-caption">
          จำลองพฤติกรรมตามบทบาทนี้ในการตอบสถานการณ์ทั้ง 4 ข้อ
        </p>
      </div>

      {/* Secret File Card */}
      <div className="secret-file-card">
        {/* Cover Toggle Button */}
        <div className="file-cover-toggle-row">
          <button
            className="btn btn-secondary btn-sm cover-toggle-btn"
            onClick={() => setIsCovered(!isCovered)}
            aria-label={isCovered ? 'เปิดดูบทบาท' : 'ซ่อนบทบาท'}
          >
            {isCovered ? '👁️ แตะเพื่อเปิดดูบทบาท' : '🙈 แตะเพื่อซ่อน (ป้องกันคนแอบดู)'}
          </button>
        </div>

        {isCovered ? (
          <div className="secret-card-covered" onClick={() => setIsCovered(false)}>
            <div className="covered-stamp">TOP SECRET</div>
            <p className="covered-hint">บทบาทถูกซ่อนไว้ แตะตรงนี้เพื่อเปิดดู</p>
          </div>
        ) : (
          <div className="secret-card-content">
            <div className="secret-card-top">
              <span className="secret-badge">CONFIDENTIAL</span>
              <span className="secret-round-tag">ROUND {roundIndex + 1}</span>
            </div>

            {roleInfo ? (
              <div className="secret-role-body">
                <div className={`secret-role-name role-${roleInfo.id}`}>
                  {roleInfo.name}
                </div>
                <div className="secret-role-id">Role ID: #{roleInfo.id}</div>
                <p className="secret-role-desc">{roleInfo.description}</p>
              </div>
            ) : (
              <div className="secret-role-loading">กำลังแจกบทบาท...</div>
            )}

            {/* Golden Rule Warning */}
            <div className="secret-golden-rule">
              <span className="golden-icon">⚠️</span>
              <span>
                <strong>คำเตือน:</strong> ตอบตามบทบาทอย่างเป็นธรรมชาติ
                ห้ามจงใจตอบสลับเพื่อกันเพื่อนเดา เพราะเพื่อนก็พยายามจับทางคุณอยู่!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="role-intro-footer">
        {hasAcknowledged ? (
          <div className="waiting-opponent-banner">
            <div className="spinner-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            <span>คุณพร้อมแล้ว! กำลังรออีกฝ่ายพร้อมไปต่อ...</span>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg acknowledge-role-btn"
            onClick={handleAcknowledge}
            disabled={!myRole || isSubmitting || actionBlocked}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'เข้าใจบทบาทแล้ว พร้อมตอบคำถาม! ➔'}
          </button>
        )}
      </div>
    </div>
  );
}
