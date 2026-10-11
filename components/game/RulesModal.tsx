'use client';

import { getRoleInfo, getRoleIds, LEGACY_CONTENT_VERSION, type ContentVersion, SCORE_TABLE } from '@/lib/game/types';
import RolePortrait from './RolePortrait';

interface RulesModalProps {
  isOpen: boolean;
  contentVersion?: ContentVersion;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose, contentVersion }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="rules-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="กติกาและบทบาท">
      <div className="rules-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rules-modal-header">
          <div className="rules-modal-heading">
            <div className="rules-modal-kicker">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 6 6M7 10a3 3 0 0 1 3-3" />
              </svg>
              <span>WHO ARE YOU REALLY?</span>
            </div>
            <h2 className="rules-modal-title">คู่มือนักสืบ & กติกาการเล่น</h2>
          </div>
          <button className="rules-modal-close" onClick={onClose} aria-label="ปิดคู่มือ">
            ✕
          </button>
        </div>

        <div className="rules-modal-body">
          {/* Golden Rule */}
          <div className="rules-callout">
            <div className="rules-callout-icon" aria-hidden="true">!</div>
            <div className="rules-callout-text">
              <strong>การสวมบท:</strong> ตอบตามบทบาทที่ได้รับอย่างเป็นธรรมชาติ พยายามกลมกลืนกับมนุษย์ ทุกบทเลือกได้ทุกตัวเลือก ไม่มีคำตอบถูกผิดและไม่มีคะแนนจากคำตอบ คะแนนมาจากการทายตัวตนของอีกฝ่าย!
            </div>
          </div>

          {contentVersion !== LEGACY_CONTENT_VERSION && <p className="rules-caption">การสัมผัสของผีเป็นบริบทสำหรับสวมบท ไม่ทำให้เกมเปิดบทอัตโนมัติ แวมไพร์เลี่ยงแสงแดดโดยตรง แต่ทำกิจกรรมในอาคารตอนกลางวันได้</p>}
          {/* Scoring Table */}
          <div className="rules-section">
            <h3 className="rules-section-title"><span className="rules-section-index" aria-hidden="true">01</span>ตารางคะแนนการทาย</h3>
            <div className="rules-scoring-grid">
              {SCORE_TABLE.map((pts, idx) => (
                <div key={idx} className="rules-score-item">
                  <div className="rules-score-clue">ทายถูกหลังข้อ {idx + 1}</div>
                  <div className="rules-score-pts"><b>+{pts}</b><span>คะแนน</span></div>
                </div>
              ))}
              <div className="rules-score-item rules-score-wrong">
                <div className="rules-score-clue">ทายผิด / ไม่ทาย</div>
                <div className="rules-score-pts"><b>0</b><span>คะแนน</span></div>
              </div>
            </div>
            <p className="rules-caption">
              * ทายได้เพียงคนละ 1 ครั้งต่อรอบ และจบรอบทันทีเมื่อทั้งสองคนส่งคำทายครบ หรือเมื่อจบข้อที่ 4
            </p>
          </div>

          {/* 6 Roles Catalog */}
          <div className="rules-section">
            <h3 className="rules-section-title"><span className="rules-section-index" aria-hidden="true">02</span>บทบาททั้ง 6 ในเกม</h3>
            <div className="rules-roles-list">
              {getRoleIds(contentVersion).map((roleId, idx) => {
                const info = getRoleInfo(roleId);
                return (
                  <div key={roleId} className={`rules-role-card rules-file-${roleId}`}>
                    <div className="rules-role-identity">
                      <RolePortrait role={roleId} className="rules-role-portrait" sizes="80px" />
                      <div className="rules-role-header">
                        <span className="rules-role-index" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
                        <span className={`rules-role-badge role-${roleId}`}>{info.name}</span>
                      </div>
                    </div>
                    <div className="rules-role-desc">{info.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rules-modal-footer">
          <button className="btn rules-return-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            <span>รับทราบและกลับไปที่เกม</span>
          </button>
        </div>
      </div>
    </div>
  );
}
